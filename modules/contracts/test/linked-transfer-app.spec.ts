import { Address, SolidityABIEncoderV2Type } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import { BigNumber, defaultAbiCoder, solidityKeccak256 } from "ethers/utils";

import UnidirectionalLinkedTransferApp from "../build/UnidirectionalLinkedTransferApp.json";

chai.use(waffle.solidity);

const { expect } = chai;

type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

enum AppStage {
  POST_FUND,
  PAYMENT_CLAIMED,
  CHANNEL_CLOSED,
}

type UnidirectionalLinkedTransferAppState = {
  stage: AppStage;
  transfers: CoinTransfer[];
  linkedHash: string;
  turnNum: BigNumber;
  finalized: boolean;
};

type UnidirectionalLinkedTransferAppAction = {
  amount: BigNumber;
  assetId: Address;
  paymentId: string;
  preImage: string;
};

const singleAssetTwoPartyCoinTransferEncoding = `
  tuple(address to, uint256 amount)[2]
`;

const unidirectionalLinkedTransferAppStateEncoding = `
  tuple(
    uint8 stage,
    ${singleAssetTwoPartyCoinTransferEncoding} transfers,
    bytes32 linkedHash,
    uint256 turnNum,
    bool finalized
  )
`;

// TODO: does this need to be a tuple if ya know... its just
// one thing....
const unidirectionalLinkedTransferAppActionEncoding = `
  tuple(
    uint256 amount,
    address assetId,
    string paymentId,
    string preImage
  )
`;

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

function decodeAppState(encodedAppState: string): UnidirectionalLinkedTransferAppState {
  return defaultAbiCoder.decode([unidirectionalLinkedTransferAppStateEncoding], encodedAppState)[0];
}

function encodeAppState(state: SolidityABIEncoderV2Type): string {
  return defaultAbiCoder.encode([unidirectionalLinkedTransferAppStateEncoding], [state]);
}

function encodeAppAction(state: SolidityABIEncoderV2Type): string {
  return defaultAbiCoder.encode([unidirectionalLinkedTransferAppActionEncoding], [state]);
}

function createLinkedHash(action: UnidirectionalLinkedTransferAppAction): string {
  return solidityKeccak256(
    ["uint256", "address", "string", "string"],
    [action.amount, action.assetId, action.paymentId, action.preImage],
  );
}

async function assertRedeemed(
  state: UnidirectionalLinkedTransferAppState,
  params: {
    senderAddr: string;
    redeemerAddr: string;
    linkedHash: string;
    amount: BigNumber;
    turnNum: BigNumber;
  },
  valid: boolean = true,
): Promise<void> {
  const { senderAddr, redeemerAddr, linkedHash, amount, turnNum } = params;
  // assert transfer addresses
  expect(state.transfers[0].to.toLowerCase()).to.eq(senderAddr.toLowerCase());
  expect(state.transfers[1].to.toLowerCase()).to.eq(redeemerAddr.toLowerCase());
  // assert hash
  expect(state.linkedHash).to.eq(linkedHash);
  // assert finalized
  expect(state.finalized).to.be.true;
  // assert turnNum increase
  expect(state.turnNum.toString()).to.eq(turnNum.toString());

  // if payment was rejected, the transfers should be 0d out
  if (!valid) {
    // assert stage
    expect(state.stage).to.eq(AppStage.CHANNEL_CLOSED);
    // assert transfer amounts
    expect(state.transfers[0].amount.toString()).to.eq(amount.toString()); // sender
    expect(state.transfers[1].amount.toString()).to.eq("0"); // redeemer
    return;
  }

  // otherwise, they should go through
  expect(state.stage).to.eq(AppStage.PAYMENT_CLAIMED);
  // assert transfer amounts
  expect(state.transfers[0].amount.toString()).to.eq("0"); // sender
  expect(state.transfers[1].amount.toString()).to.eq(amount.toString()); // redeemer
}

describe("LinkedUnidirectionalTransferApp", () => {
  let unidirectionalLinkedTransferApp: Contract;

  const applyAction = (state: SolidityABIEncoderV2Type, action: SolidityABIEncoderV2Type): any =>
    unidirectionalLinkedTransferApp.functions.applyAction(
      encodeAppState(state),
      encodeAppAction(action),
    );

  const computeOutcome = (state: SolidityABIEncoderV2Type): any =>
    unidirectionalLinkedTransferApp.functions.computeOutcome(encodeAppState(state));

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = await waffle.getWallets(provider)[0];
    unidirectionalLinkedTransferApp = await waffle.deployContract(
      wallet,
      UnidirectionalLinkedTransferApp,
    );
  });

  it("can redeem a payment with correct hash", async () => {
    const senderAddr = mkAddress("0xa"); // e.g node
    const redeemerAddr = mkAddress("0xb");

    const amount = new BigNumber(10);

    const paymentId = "payment-id";
    const preImage = "super-secret-preimage";

    const action: UnidirectionalLinkedTransferAppAction = {
      amount,
      assetId: AddressZero,
      paymentId,
      preImage,
    };

    const linkedHash = createLinkedHash(action);

    /**
     * This is the initial state supplied to the `ProposeInstall`
     * function.
     */
    const prevState: UnidirectionalLinkedTransferAppState = {
      finalized: false,
      linkedHash,
      stage: AppStage.POST_FUND,
      transfers: [
        {
          amount: Zero,
          to: senderAddr,
        },
        {
          amount,
          to: redeemerAddr,
        },
      ],
      turnNum: Zero,
    };

    const ret = await applyAction(prevState, action);

    const state = decodeAppState(ret);

    assertRedeemed(state, { senderAddr, redeemerAddr, linkedHash, amount, turnNum: One });

    // verify outcome
    const res = await computeOutcome(state);
    expect(res).to.eq(
      defaultAbiCoder.encode(
        [singleAssetTwoPartyCoinTransferEncoding],
        [[[senderAddr, Zero], [redeemerAddr, amount]]],
      ),
    );
  });

  it("can revert the transfers if the provided secret is not correct", async () => {
    const senderAddr = mkAddress("0xa"); // e.g node
    const redeemerAddr = mkAddress("0xb");

    const amount = new BigNumber(10);

    const paymentId = "payment-id";
    const preImage = "super-secret-preimage";

    const action: UnidirectionalLinkedTransferAppAction = {
      amount,
      assetId: AddressZero,
      paymentId,
      preImage,
    };

    const linkedHash = createLinkedHash(action);
    const suppliedAction: UnidirectionalLinkedTransferAppAction = {
      ...action,
      preImage: "this-is-wrong",
    };

    /**
     * This is the initial state supplied to the `ProposeInstall`
     * function.
     */
    const prevState: UnidirectionalLinkedTransferAppState = {
      finalized: false,
      linkedHash,
      stage: AppStage.POST_FUND,
      transfers: [
        {
          amount: Zero,
          to: senderAddr,
        },
        {
          amount,
          to: redeemerAddr,
        },
      ],
      turnNum: Zero,
    };

    const ret = await applyAction(prevState, suppliedAction);

    const state = decodeAppState(ret);

    assertRedeemed(state, { senderAddr, redeemerAddr, linkedHash, amount, turnNum: One }, false);

    // verify outcome
    const res = await computeOutcome(state);
    expect(res).to.eq(
      defaultAbiCoder.encode(
        [singleAssetTwoPartyCoinTransferEncoding],
        [[[senderAddr, amount], [redeemerAddr, Zero]]],
      ),
    );
  });
});
