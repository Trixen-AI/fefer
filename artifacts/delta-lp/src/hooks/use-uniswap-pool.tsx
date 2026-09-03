import { useCallback, useEffect, useState } from "react";
import {
  decodeAddress,
  decodeSignedInt24,
  decodeUint256,
  decodeWords,
  encodeAddress,
  encodeUint256,
  encodeTransactionData,
  getEthereumProvider,
  parseUnits,
  readRpcContract,
  sendTransaction,
  simulateRpcTransaction,
  waitForTransactionReceipt,
} from "@/lib/ethereum";
import { isUniswapV3Configured, robinhoodChain } from "@/config/network";
import { useWallet } from "@/hooks/use-wallet";

const SYMBOL_SELECTOR = "0x95d89b41";
const DECIMALS_SELECTOR = "0x313ce567";
const TOKEN_BALANCE_SELECTOR = "0x70a08231";
const ALLOWANCE_SELECTOR = "0xdd62ed3e";
const GET_POOL_SELECTOR = "0x1698ee82";
const APPROVE_SELECTOR = "0x095ea7b3";
const MINT_SELECTOR = "0x88316456";
const SLOT0_SELECTOR = "0x3850c7bd";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type TokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  allowance: bigint;
};

function isZeroAddress(address: string) {
  return address.toLowerCase() === ZERO_ADDRESS;
}

function sortTokens(addresses: string[]) {
  return [...addresses].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
}

function readStringResponse(data: string) {
  const words = decodeWords(data);
  if (!words[0]) throw new Error("Token returned an empty symbol.");
  const hasStandardDynamicLayout = words.length >= 3;
  const hasLengthPrefixedLayout =
    words.length === 2 && decodeUint256(words[0]) <= 32n;
  const length = hasStandardDynamicLayout
    ? Number(decodeUint256(words[1] ?? "0"))
    : hasLengthPrefixedLayout
      ? Number(decodeUint256(words[0]))
      : 32;
  const body = hasStandardDynamicLayout
    ? words.slice(2).join("")
    : hasLengthPrefixedLayout
      ? words[1] ?? ""
      : words[0];
  const hex = body.slice(0, length * 2);
  let output = "";
  for (let index = 0; index < hex.length; index += 2) {
    const code = Number.parseInt(hex.slice(index, index + 2), 16);
    if (code) output += String.fromCharCode(code);
  }
  return output || "Token";
}

function readUintResponse(data: string) {
  const [word] = decodeWords(data);
  if (!word) throw new Error("Token returned an empty numeric response.");
  return decodeUint256(word);
}

export function useUniswapPool() {
  const { address, onTargetNetwork } = useWallet();
  const [poolAddress, setPoolAddress] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [currentTick, setCurrentTick] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address || !onTargetNetwork || !isUniswapV3Configured) {
      setPoolAddress(null);
      setTokens([]);
      setCurrentTick(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const addresses = sortTokens([
        robinhoodChain.token0Address,
        robinhoodChain.token1Address,
      ]);
      const tokenResponses = await Promise.all(
        addresses.map(async (tokenAddress) => {
          const [symbolResponse, decimalsResponse, balanceResponse] =
            await Promise.all([
              readRpcContract(
                robinhoodChain.rpcUrl,
                tokenAddress,
                SYMBOL_SELECTOR,
              ),
              readRpcContract(
                robinhoodChain.rpcUrl,
                tokenAddress,
                DECIMALS_SELECTOR,
              ),
              readRpcContract(
                robinhoodChain.rpcUrl,
                tokenAddress,
                `${TOKEN_BALANCE_SELECTOR}${encodeAddress(address)}`,
              ),
            ]);
          return {
            address: tokenAddress,
            symbol: readStringResponse(symbolResponse),
            decimals: Number(readUintResponse(decimalsResponse)),
            balance: readUintResponse(balanceResponse),
          };
        }),
      );

      const [token0, token1] = tokenResponses;
      if (!token0 || !token1) throw new Error("Pair tokens are unavailable.");
      const feeData = encodeUint256(500);
      const poolResponse = await readRpcContract(
        robinhoodChain.rpcUrl,
        robinhoodChain.uniswapV3Factory,
        `${GET_POOL_SELECTOR}${encodeAddress(token0.address)}${encodeAddress(token1.address)}${feeData}`,
      );
      const [poolWord] = decodeWords(poolResponse);
      if (!poolWord) throw new Error("Factory returned an empty pool address.");
      const nextPool = decodeAddress(poolWord);

      if (isZeroAddress(nextPool)) {
        setPoolAddress(null);
        setTokens(
          tokenResponses.map((token) => ({ ...token, allowance: 0n })),
        );
        setCurrentTick(null);
        return;
      }

      const allowanceResponses = await Promise.all(
        tokenResponses.map((token) =>
          readRpcContract(
            robinhoodChain.rpcUrl,
            token.address,
            `${ALLOWANCE_SELECTOR}${encodeAddress(address)}${encodeAddress(robinhoodChain.uniswapV3PositionManager)}`,
          ),
        ),
      );
      const slot0Response = await readRpcContract(
        robinhoodChain.rpcUrl,
        nextPool,
        SLOT0_SELECTOR,
      );
      const [, slot0Tick] = decodeWords(slot0Response);

      setPoolAddress(nextPool);
      setTokens(
        tokenResponses.map((token, index) => ({
          ...token,
          allowance: readUintResponse(allowanceResponses[index] ?? "0x"),
        })),
      );
      setCurrentTick(slot0Tick ? decodeSignedInt24(slot0Tick) : null);
    } catch (cause) {
      setPoolAddress(null);
      setTokens([]);
      setCurrentTick(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to read the selected Uniswap V3 pool.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [address, onTargetNetwork]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = useCallback(
    async (token: TokenInfo, amount: bigint) => {
      const provider = getEthereumProvider();
      if (!provider || !address) throw new Error("Connect a wallet first.");
      setIsSubmitting(true);
      setError(null);
      try {
        const hash = await sendTransaction(provider, {
          from: address,
          to: token.address,
          data: encodeTransactionData(
            APPROVE_SELECTOR,
            ["address", "uint256"],
            [robinhoodChain.uniswapV3PositionManager, amount],
          ),
        });
        setTxHash(hash);
        await waitForTransactionReceipt(provider, hash);
        await refresh();
        return hash;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Approval was rejected.",
        );
        throw cause;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, refresh],
  );

  const mint = useCallback(
    async (input: {
      amount0: string;
      amount1: string;
      tickLower: number;
      tickUpper: number;
      slippageBps: number;
    }) => {
      const provider = getEthereumProvider();
      if (!provider || !address) throw new Error("Connect a wallet first.");
      if (!poolAddress || tokens.length !== 2) {
        throw new Error("A verified Uniswap V3 pool is required.");
      }

      const [token0, token1] = tokens;
      if (!token0 || !token1) throw new Error("Pair tokens are unavailable.");
      const amount0 = parseUnits(input.amount0, token0.decimals);
      const amount1 = parseUnits(input.amount1, token1.decimals);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1_200);
      const buildMintData = (amount0Min: bigint, amount1Min: bigint) =>
        encodeTransactionData(
          MINT_SELECTOR,
          [
            "address",
            "address",
            "uint256",
            "int256",
            "int256",
            "uint256",
            "uint256",
            "uint256",
            "uint256",
            "address",
            "uint256",
          ],
          [
            token0.address,
            token1.address,
            500,
            input.tickLower,
            input.tickUpper,
            amount0,
            amount1,
            amount0Min,
            amount1Min,
            address,
            deadline,
          ],
        );

      setIsSubmitting(true);
      setError(null);
      try {
        const simulation = await simulateRpcTransaction(
          robinhoodChain.rpcUrl,
          {
            from: address,
            to: robinhoodChain.uniswapV3PositionManager,
            data: buildMintData(0n, 0n),
          },
        );
        const simulationWords = decodeWords(simulation);
        const quotedAmount0 = simulationWords[2]
          ? decodeUint256(simulationWords[2])
          : null;
        const quotedAmount1 = simulationWords[3]
          ? decodeUint256(simulationWords[3])
          : null;
        if (quotedAmount0 === null || quotedAmount1 === null) {
          throw new Error("Mint simulation did not return token amounts.");
        }
        const minimumFactor = BigInt(10_000 - input.slippageBps);
        const amount0Min = (quotedAmount0 * minimumFactor) / 10_000n;
        const amount1Min = (quotedAmount1 * minimumFactor) / 10_000n;

        const hash = await sendTransaction(provider, {
          from: address,
          to: robinhoodChain.uniswapV3PositionManager,
          data: buildMintData(amount0Min, amount1Min),
        });
        setTxHash(hash);
        await waitForTransactionReceipt(provider, hash);
        await refresh();
        return hash;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Mint was rejected.",
        );
        throw cause;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, poolAddress, tokens],
  );

  return {
    poolAddress,
    tokens,
    currentTick,
    isLoading,
    isSubmitting,
    error,
    txHash,
    refresh,
    approve,
    mint,
  };
}