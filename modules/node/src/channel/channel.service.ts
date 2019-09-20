import { ChannelAppSequences } from "@connext/types";
import { Node as CFCoreTypes } from "@counterfactual/types";
import { Injectable } from "@nestjs/common";
import { AddressZero } from "ethers/constants";
import { TransactionResponse } from "ethers/providers";
import { BigNumber, getAddress } from "ethers/utils";

import { CFCoreService } from "../cfCore/cfCore.service";
import { ConfigService } from "../config/config.service";
import { PaymentProfile } from "../paymentProfile/paymentProfile.entity";
import { CLogger, freeBalanceAddressFromXpub } from "../util";
import { CreateChannelMessage } from "../util/cfCore";

import { Channel } from "./channel.entity";
import { ChannelRepository } from "./channel.repository";

const logger = new CLogger("ChannelService");

@Injectable()
export class ChannelService {
  constructor(
    private readonly cfCoreService: CFCoreService,
    private readonly configService: ConfigService,
    private readonly channelRepository: ChannelRepository,
  ) {}

  /**
   * Starts create channel process within CF core
   * @param counterpartyPublicIdentifier
   */
  async create(counterpartyPublicIdentifier: string): Promise<CFCoreTypes.CreateChannelResult> {
    const existing = await this.channelRepository.findByUserPublicIdentifier(
      counterpartyPublicIdentifier,
    );
    if (existing) {
      throw new Error(`Channel already exists for ${counterpartyPublicIdentifier}`);
    }

    return await this.cfCoreService.createChannel(counterpartyPublicIdentifier);
  }

  async deposit(
    multisigAddress: string,
    amount: BigNumber,
    assetId: string = AddressZero,
  ): Promise<CFCoreTypes.DepositResult> {
    const channel = await this.channelRepository.findByMultisigAddress(multisigAddress);
    if (!channel) {
      throw new Error(`No channel exists for multisigAddress ${multisigAddress}`);
    }

    return await this.cfCoreService.deposit(multisigAddress, amount, getAddress(assetId));
  }

  async requestCollateral(
    userPubId: string,
    assetId: string = AddressZero,
    amountToCollateralize?: BigNumber,
  ): Promise<CFCoreTypes.DepositResult | undefined> {
    const normalizedAssetId = getAddress(assetId);
    const channel = await this.channelRepository.findByUserPublicIdentifier(userPubId);

    if (!channel) {
      throw new Error(`Channel does not exist for user ${userPubId}`);
    }

    // TODO: this wont work until we can set this to false when deposit confirms :(
    if (channel.collateralizationInFlight) {
      logger.log(`Collateral request is in flight, try request again for user ${userPubId} later`);
      return undefined;
    }

    const profile = await this.channelRepository.getPaymentProfileForChannelAndToken(
      userPubId,
      normalizedAssetId,
    );

    if (!profile) {
      throw new Error(`Profile does not exist for user ${userPubId} and assetId ${assetId}`);
    }

    let collateralNeeded = profile.minimumMaintainedCollateral;
    if (amountToCollateralize && profile.minimumMaintainedCollateral.lt(amountToCollateralize)) {
      collateralNeeded = amountToCollateralize;
    }

    const freeBalance = await this.cfCoreService.getFreeBalance(
      userPubId,
      channel.multisigAddress,
      normalizedAssetId,
    );
    const freeBalanceAddress = freeBalanceAddressFromXpub(
      this.cfCoreService.cfCore.publicIdentifier,
    );
    const nodeFreeBalance = freeBalance[freeBalanceAddress];

    if (nodeFreeBalance.lt(collateralNeeded)) {
      const amountDeposit = collateralNeeded.gt(profile.amountToCollateralize)
        ? collateralNeeded.sub(nodeFreeBalance)
        : profile.amountToCollateralize.sub(nodeFreeBalance);
      logger.log(
        `Collateralizing ${channel.multisigAddress} with ${amountDeposit.toString()}, ` +
          `token: ${normalizedAssetId}`,
      );

      // set in flight so that it cant be double sent
      await this.channelRepository.setInflightCollateralization(channel, true);
      try {
        return this.deposit(channel.multisigAddress, amountDeposit, normalizedAssetId);
      } catch (e) {
        await this.clearCollateralizationInFlight(channel.multisigAddress);
        throw e;
      }
    }
    logger.log(
      `${userPubId} already has collateral of ${nodeFreeBalance} for asset ${normalizedAssetId}`,
    );
    return undefined;
  }

  async clearCollateralizationInFlight(multisigAddress: string): Promise<Channel> {
    const channel = await this.channelRepository.findByMultisigAddress(multisigAddress);
    if (!channel) {
      throw new Error(`No channel exists for multisig ${multisigAddress}`);
    }

    return await this.channelRepository.setInflightCollateralization(channel, false);
  }

  async addPaymentProfileToChannel(
    userPubId: string,
    assetId: string,
    minimumMaintainedCollateral: BigNumber,
    amountToCollateralize: BigNumber,
  ): Promise<PaymentProfile> {
    const profile = new PaymentProfile();
    profile.assetId = getAddress(assetId);
    profile.minimumMaintainedCollateral = minimumMaintainedCollateral;
    profile.amountToCollateralize = amountToCollateralize;
    return await this.channelRepository.addPaymentProfileToChannel(userPubId, profile);
  }

  /**
   * Creates a channel in the database with data from CF core event CREATE_CHANNEL
   * and marks it as available
   * @param creationData event data
   */
  async makeAvailable(creationData: CreateChannelMessage): Promise<void> {
    const existing = await this.channelRepository.findByMultisigAddress(
      creationData.data.multisigAddress,
    );
    if (existing) {
      if (
        !creationData.data.owners.includes(existing.nodePublicIdentifier) ||
        !creationData.data.owners.includes(existing.userPublicIdentifier)
      ) {
        throw new Error(
          `Channel has already been created with different owners! ${JSON.stringify(
            existing,
          )}. Event data: ${creationData}`,
        );
      }
      logger.log(`Channel already exists in database`);
    }
    logger.log(`Creating new channel from data ${JSON.stringify(creationData)}`);
    const channel = new Channel();
    channel.userPublicIdentifier = creationData.data.counterpartyXpub;
    channel.nodePublicIdentifier = this.cfCoreService.cfCore.publicIdentifier;
    channel.multisigAddress = creationData.data.multisigAddress;
    channel.available = true;
    await this.channelRepository.save(channel);
  }

  /**
   * Returns the app sequence number of the node and the user
   *
   * @param userPublicIdentifier users xpub
   * @param userAppSequenceNumber sequence number provided by user
   */
  async verifyAppSequenceNumber(
    userPublicIdentifier: string,
    userAppSequenceNumber: number,
  ): Promise<ChannelAppSequences> {
    const channel = await this.channelRepository.findByUserPublicIdentifier(userPublicIdentifier);
    const sc = (await this.cfCoreService.getStateChannel(channel.multisigAddress)).data;
    let nodeAppSequenceNumber;
    try {
      nodeAppSequenceNumber = (await sc.mostRecentlyInstalledAppInstance()).appSeqNo;
    } catch (e) {
      if (e.message.indexOf("There are no installed AppInstances in this StateChannel") !== -1) {
        nodeAppSequenceNumber = 0;
      } else {
        throw e;
      }
    }
    if (nodeAppSequenceNumber !== userAppSequenceNumber) {
      logger.warn(
        `Node app sequence number (${nodeAppSequenceNumber}) ` +
          `!== user app sequence number (${userAppSequenceNumber})`,
      );
    }
    return {
      nodeAppSequenceNumber,
      userAppSequenceNumber,
    };
  }

  async withdrawForClient(
    userPublicIdentifier: string,
    tx: CFCoreTypes.MinimalTransaction,
  ): Promise<TransactionResponse> {
    const channel = await this.channelRepository.findByUserPublicIdentifier(userPublicIdentifier);
    if (!channel) {
      throw new Error(`No channel exists for userPublicIdentifier ${userPublicIdentifier}`);
    }

    const wallet = this.configService.getEthWallet();
    return await wallet.sendTransaction(tx);
  }
}
