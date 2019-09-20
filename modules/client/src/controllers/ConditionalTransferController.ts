import {
  BigNumber,
  ConditionalTransferParameters,
  ConditionalTransferResponse,
  convert,
  LinkedTransferParameters,
  LinkedTransferResponse,
  RegisteredAppDetails,
  SimpleLinkedTransferAppStateBigNumber,
  SupportedApplication,
  SupportedApplications,
  TransferCondition,
} from "@connext/types";
import { Node as CFCoreTypes } from "@counterfactual/types";
import { HashZero, Zero } from "ethers/constants";

import { RejectInstallVirtualMessage } from "../lib/cfCore";
import { createLinkedHash, freeBalanceAddressFromXpub, replaceBN } from "../lib/utils";
import { falsy, invalid32ByteHexString, invalidAddress, notLessThanOrEqualTo } from "../validation";

import { AbstractController } from "./AbstractController";

type ConditionalExecutors = {
  [index in TransferCondition]: (
    params: ConditionalTransferParameters,
  ) => Promise<ConditionalTransferResponse>;
};

export class ConditionalTransferController extends AbstractController {
  private appId: string;

  private timeout: NodeJS.Timeout;

  public conditionalTransfer = async (
    params: ConditionalTransferParameters,
  ): Promise<ConditionalTransferResponse> => {
    this.log.info(
      `Conditional transfer called with parameters: ${JSON.stringify(params, replaceBN, 2)}`,
    );

    const res = await this.conditionalExecutors[params.conditionType](params);
    return res;
  };

  /////////////////////////////////
  ////// PRIVATE METHODS
  private handleLinkedTransfers = async (
    params: LinkedTransferParameters,
  ): Promise<LinkedTransferResponse> => {
    // convert params + validate
    const { amount, assetId, paymentId, preImage } = convert.LinkedTransfer("bignumber", params);
    const invalid = await this.validateLinked(amount, assetId, paymentId, preImage);
    if (invalid) {
      throw new Error(invalid);
    }

    const appInfo = this.connext.getRegisteredAppDetails(
      SupportedApplications.SimpleLinkedTransferApp as SupportedApplication,
    );

    // install the transfer application
    const linkedHash = createLinkedHash(amount, assetId, paymentId, preImage);

    const initialState: SimpleLinkedTransferAppStateBigNumber = {
      amount,
      assetId,
      coinTransfers: [
        {
          amount,
          to: freeBalanceAddressFromXpub(this.connext.publicIdentifier),
        },
        {
          amount: Zero,
          to: freeBalanceAddressFromXpub(this.connext.nodePublicIdentifier),
        },
      ],
      linkedHash,
      paymentId,
      preImage: HashZero,
    };

    const appId = await this.conditionalTransferAppInstalled(
      amount,
      assetId,
      initialState,
      appInfo,
    );

    if (!appId) {
      throw new Error(`App was not installed`);
    }

    return {
      freeBalance: await this.connext.getFreeBalance(assetId),
      paymentId,
      preImage,
    };
  };

  private validateLinked = async (
    amount: BigNumber,
    assetId: string,
    paymentId: string,
    preImage: string,
  ): Promise<undefined | string> => {
    // check that there is sufficient free balance for amount
    const freeBalance = await this.connext.getFreeBalance(assetId);
    const preTransferBal = freeBalance[this.connext.freeBalanceAddress];
    const errs = [
      invalidAddress(assetId),
      notLessThanOrEqualTo(amount, preTransferBal),
      invalid32ByteHexString(paymentId),
      invalid32ByteHexString(preImage),
    ];
    return errs ? errs.filter(falsy)[0] : undefined;
  };

  // creates a promise that is resolved once the app is installed
  // and rejected if the virtual application is rejected
  private conditionalTransferAppInstalled = async (
    initiatorDeposit: BigNumber,
    assetId: string,
    initialState: SimpleLinkedTransferAppStateBigNumber,
    appInfo: RegisteredAppDetails,
  ): Promise<string | undefined> => {
    let boundResolve: (value?: any) => void;
    let boundReject: (reason?: any) => void;

    // note: intermediary is added in connext.ts as well
    const {
      appDefinitionAddress: appDefinition,
      outcomeType,
      stateEncoding,
      actionEncoding,
    } = appInfo;
    const params: CFCoreTypes.ProposeInstallParams = {
      abiEncodings: {
        actionEncoding,
        stateEncoding,
      },
      appDefinition,
      initialState,
      initiatorDeposit,
      initiatorDepositTokenAddress: assetId,
      outcomeType,
      proposedToIdentifier: this.connext.nodePublicIdentifier,
      responderDeposit: Zero,
      responderDepositTokenAddress: assetId,
      timeout: Zero,
    };

    const res = await this.connext.proposeInstallApp(params);
    // set app instance id
    this.appId = res.appInstanceId;

    try {
      await new Promise((res: () => any, rej: () => any): void => {
        boundResolve = this.resolveInstallTransfer.bind(null, res);
        boundReject = this.rejectInstallTransfer.bind(null, rej);
        this.connext.messaging.subscribe(
          `indra.node.install.${this.connext.nodePublicIdentifier}`,
          boundResolve,
        );
        this.listener.on(CFCoreTypes.EventName.REJECT_INSTALL, boundReject);
      });
      this.log.info(`App was installed successfully!: ${JSON.stringify(res)}`);
      return res.appInstanceId;
    } catch (e) {
      this.log.error(`Error installing app: ${e.toString()}`);
      return undefined;
    } finally {
      this.cleanupInstallListeners(boundResolve, boundReject);
    }
  };

  // TODO: fix type of data
  private resolveInstallTransfer = (res: (value?: unknown) => void, message: any): any => {
    // TODO: why is it sometimes data vs data.data?
    const appInstance = message.data.data
      ? message.data.data.appInstance
      : message.data.appInstance;

    if (appInstance.identityHash !== this.appId) {
      // not our app
      this.log.info(
        `Caught INSTALL event for different app ${JSON.stringify(message)}, expected ${this.appId}`,
      );
      return;
    }
    res(message);
    return message;
  };

  // TODO: fix types of data
  private rejectInstallTransfer = (
    rej: (reason?: any) => void,
    msg: RejectInstallVirtualMessage,
  ): any => {
    // check app id
    if (this.appId !== msg.data.appInstanceId) {
      return;
    }

    return rej(`Install failed. Event data: ${JSON.stringify(msg, replaceBN, 2)}`);
  };

  private cleanupInstallListeners = (boundResolve: any, boundReject: any): void => {
    this.connext.messaging.unsubscribe(`indra.node.install.${this.connext.nodePublicIdentifier}`);
    this.listener.removeListener(CFCoreTypes.EventName.REJECT_INSTALL, boundReject);
  };

  // add all executors/handlers here
  private conditionalExecutors: ConditionalExecutors = {
    LINKED_TRANSFER: this.handleLinkedTransfers,
  };
}
