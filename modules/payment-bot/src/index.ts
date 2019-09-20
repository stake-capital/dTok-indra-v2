import * as connext from "@connext/client";
import {
  DepositParameters,
  LinkedTransferParameters,
  makeChecksum,
  ResolveLinkedTransferParameters,
  WithdrawParameters,
} from "@connext/types";
import { Node as CFCoreTypes } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { formatEther, hexlify, parseEther, randomBytes } from "ethers/utils";

import { registerClientListeners } from "./bot";
import { config } from "./config";
import { store } from "./store";
import { logEthFreeBalance } from "./utils";

const replaceBN = (key: string, value: any): any =>
  value && value._hex ? value.toString() : value;

process.on("warning", (e: any): any => {
  console.warn(e);
  process.exit(1);
});

process.on("unhandledRejection", (e: any): any => {
  console.error(e);
  process.exit(1);
});

let client: connext.ConnextInternal;
let assetId: string;

export function getAssetId(): string {
  return assetId;
}

export function setAssetId(aid: string): void {
  assetId = aid;
}

export function getMultisigAddress(): string {
  return client.opts.multisigAddress;
}

export function getFreeBalanceAddress(): string {
  return client.freeBalanceAddress;
}

export function getConnextClient(): connext.ConnextInternal {
  return client;
}

export function exitOrLeaveOpen(config: any): void {
  if (!config.open) {
    process.exit(0);
  }
  console.log("leaving process open");
}

export function checkForLinkedFields(config: any): void {
  if (!config.preImage) {
    throw new Error(
      `Cannot ${
        config.linked ? "create" : "redeem"
      } a linked payment without an associated preImage.`,
    );
  }
  if (!config.paymentId) {
    throw new Error(
      `Cannot ${
        config.linked ? "create" : "redeem"
      } a linked payment without an associated paymmentId.`,
    );
  }
}

async function run(): Promise<void> {
  const assetId = config.assetId ? config.assetId : AddressZero;
  setAssetId(assetId);
  await getOrCreateChannel(assetId);

  if (config.getFreeBalance) {
    logEthFreeBalance(AddressZero, await client.getFreeBalance(assetId));
    if (assetId !== AddressZero) {
      logEthFreeBalance(assetId, await client.getFreeBalance(assetId));
    }
  }

  if (config.deposit) {
    const depositParams: DepositParameters = {
      amount: parseEther(config.deposit).toString(),
    };
    if (assetId !== AddressZero) {
      depositParams.assetId = assetId;
    }
    console.log(`Depositing ${config.deposit} of asset ${assetId}`);
    await client.deposit(depositParams);
    console.log(`Successfully deposited!`);
  }

  if (config.requestCollateral) {
    console.log(`Requesting collateral...`);
    await client.requestCollateral(assetId);
    console.log(`Successfully received collateral!`);
  }

  if (config.transfer) {
    console.log(`Transferring ${config.transfer} of asset ${assetId} to ${config.counterparty}`);
    await client.transfer({
      amount: parseEther(config.transfer).toString(),
      assetId,
      recipient: config.counterparty,
    });
    console.log(`Successfully transferred!`);
  }

  if (config.swap) {
    const tokenAddress = (await client.config()).contractAddresses.Token;
    const swapRate = await client.getLatestSwapRate(AddressZero, tokenAddress);
    console.log(`Swapping ${config.swap} eth for ${assetId} at rate ${swapRate.toString()}`);
    await client.swap({
      amount: parseEther(config.swap).toString(),
      fromAssetId: AddressZero,
      swapRate: swapRate.toString(),
      toAssetId: assetId,
    });
    console.log(`Successfully swapped!`);
  }

  if (config.linked) {
    let { preImage, paymentId } = config;
    if (!preImage) {
      preImage = hexlify(randomBytes(32));
    }
    if (!paymentId) {
      paymentId = hexlify(randomBytes(32));
    }
    const linkedParams: LinkedTransferParameters = {
      amount: parseEther(config.linked).toString(),
      assetId,
      conditionType: "LINKED_TRANSFER",
      paymentId,
      preImage,
    };
    console.log(`Creating link payment for ${config.linked} of asset ${assetId}`);
    const res = await client.conditionalTransfer(linkedParams);
    console.log(`Successfully created! Linked response: ${JSON.stringify(res, replaceBN, 2)}`);
  }

  if (config.redeem) {
    checkForLinkedFields(config);
    const resolveParams: ResolveLinkedTransferParameters = {
      amount: parseEther(config.redeem).toString(),
      assetId,
      conditionType: "LINKED_TRANSFER",
      paymentId: config.paymentId,
      preImage: config.preImage,
    };
    console.log(`Redeeming link with parameters: ${JSON.stringify(resolveParams, replaceBN, 2)}`);
    const res = await client.resolveCondition(resolveParams);
    console.log(`Successfully redeemed! Resolve response: ${JSON.stringify(res, replaceBN, 2)}`);
  }

  if (config.withdraw) {
    const withdrawParams: WithdrawParameters = {
      amount: parseEther(config.withdraw).toString(),
    };
    if (assetId !== AddressZero) {
      withdrawParams.assetId = assetId;
    }
    if (config.recipient) {
      withdrawParams.recipient = config.recipient;
    }
    const provider = new JsonRpcProvider(config.ethProviderUrl);
    const preWithdrawBal = await provider.getBalance(config.recipient || client.freeBalanceAddress);
    console.log(`Found prewithdrawal balance of ${formatEther(preWithdrawBal)}`);
    client.on(CFCoreTypes.EventName.WITHDRAWAL_CONFIRMED, async (data: any) => {
      console.log(`Caught withdraw confirmed event, data: ${JSON.stringify(data, replaceBN, 2)}`);
      const postWithdrawBal = await provider.getBalance(
        config.recipient || client.freeBalanceAddress,
      );
      console.log(`Found postwithdrawal balance of ${formatEther(postWithdrawBal)}`);
    });
    client.on(CFCoreTypes.EventName.WITHDRAWAL_FAILED, async (data: any) => {
      console.log(`Withdrawal failed with data: ${JSON.stringify(data, replaceBN, 2)}`);
    });
    console.log(
      `Attempting to withdraw ${withdrawParams.amount} with assetId ` +
        `${withdrawParams.assetId} to address ${withdrawParams.recipient}...`,
    );
    await client.withdraw(withdrawParams);
    console.log(`Successfully withdrawn!`);
  }

  if (config.uninstall) {
    console.log(`Attempting to uninstall app ${config.uninstall}`);
    await client.uninstallApp(config.uninstall);
    console.log(`Successfully uninstalled ${config.uninstall}`);
    console.log(`Installed apps: ${await client.getAppInstances()}`);
  }

  if (config.uninstallVirtual) {
    console.log(`Attempting to uninstall virtual app ${config.uninstallVirtual}`);
    await client.uninstallVirtualApp(config.uninstallVirtual);
    console.log(`Successfully uninstalled ${config.uninstallVirtual}`);
    console.log(`Installed apps: ${await client.getAppInstances()}`);
  }

  exitOrLeaveOpen(config);
  console.log(`Waiting to receive transfers at ${client.opts.cfCore.publicIdentifier}`);
}

async function getOrCreateChannel(assetId?: string): Promise<void> {
  const connextOpts: connext.ClientOptions = {
    ethProviderUrl: config.ethProviderUrl,
    logLevel: config.logLevel,
    mnemonic: config.mnemonic,
    nodeUrl: config.nodeUrl,
    store,
  };
  client = await connext.connect(connextOpts);
  const nodeFBAddress = connext.utils.freeBalanceAddressFromXpub(client.nodePublicIdentifier);
  console.log("Payment bot launched:");
  console.log(` - mnemonic: ${connextOpts.mnemonic}`);
  console.log(` - ethProviderUrl: ${connextOpts.ethProviderUrl}`);
  console.log(` - nodeUrl: ${connextOpts.nodeUrl}`);
  console.log(` - publicIdentifier: ${client.publicIdentifier}`);
  console.log(` - multisigAddress: ${client.opts.multisigAddress}`);
  console.log(` - User freeBalanceAddress: ${client.freeBalanceAddress}`);
  console.log(` - Node freeBalance address: ${nodeFBAddress}`);

  const channelAvailable = async (): Promise<boolean> => {
    const channel = await client.getChannel();
    return channel && channel.available;
  };
  const interval = 1;
  while (!(await channelAvailable())) {
    console.info(`Waiting ${interval} more seconds for channel to be available`);
    await new Promise((res: any): any => setTimeout(() => res(), interval * 1000));
  }

  await client.addPaymentProfile({
    amountToCollateralize: parseEther("0.1").toString(),
    assetId: AddressZero,
    minimumMaintainedCollateral: parseEther("0.01").toString(),
  });

  if (assetId) {
    await client.addPaymentProfile({
      amountToCollateralize: parseEther("10").toString(),
      assetId: makeChecksum(assetId),
      minimumMaintainedCollateral: parseEther("5").toString(),
    });
  }
  registerClientListeners();
}

run();
