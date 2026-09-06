import {
  decodeUint256,
  decodeWords,
  encodeTransactionData,
  encodeUint256,
} from "./ethereum";

export const DECREASE_LIQUIDITY_SELECTOR = "0x0c49ccbe";
export const COLLECT_SELECTOR = "0xfc6f7865";
export const BURN_SELECTOR = "0x42966c68";
export const MULTICALL_SELECTOR = "0xac9650d8";
export const MAX_UINT128 = 2n ** 128n - 1n;

export function minimumAfterSlippage(value: bigint, slippageBps = 50) {
  return (value * BigInt(10_000 - slippageBps)) / 10_000n;
}

export function buildDecreaseLiquidityData(input: {
  tokenId: bigint;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: bigint;
}) {
  return encodeTransactionData(
    DECREASE_LIQUIDITY_SELECTOR,
    ["uint256", "uint256", "uint256", "uint256", "uint256"],
    [
      input.tokenId,
      input.liquidity,
      input.amount0Min,
      input.amount1Min,
      input.deadline,
    ],
  );
}

export function buildCollectData(tokenId: bigint, recipient: string) {
  return encodeTransactionData(
    COLLECT_SELECTOR,
    ["uint256", "address", "uint256", "uint256"],
    [tokenId, recipient, MAX_UINT128, MAX_UINT128],
  );
}

export function buildBurnData(tokenId: bigint) {
  return encodeTransactionData(BURN_SELECTOR, ["uint256"], [tokenId]);
}

export function buildMulticallData(calls: string[]) {
  const encodedCalls = calls.map((call) => {
    const value = call.replace(/^0x/, "");
    const byteLength = value.length / 2;
    const paddedValue = value.padEnd(Math.ceil(byteLength / 32) * 64, "0");
    return `${encodeUint256(byteLength)}${paddedValue}`;
  });
  let offset = 32 * calls.length;
  const offsets = encodedCalls.map((call) => {
    const encodedOffset = encodeUint256(offset);
    offset += call.length / 2;
    return encodedOffset;
  });

  return `${MULTICALL_SELECTOR}${encodeUint256(32)}${encodeUint256(calls.length)}${offsets.join("")}${encodedCalls.join("")}`;
}

export function decodeRemovalSimulation(data: string) {
  const words = decodeWords(data);
  if (!words[0] || !words[1]) {
    throw new Error("Removal simulation did not return token amounts.");
  }
  return {
    amount0: decodeUint256(words[0]),
    amount1: decodeUint256(words[1]),
  };
}
