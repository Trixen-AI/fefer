import { useCallback, useState } from "react";
import {
  decodeUint256,
  decodeWords,
  encodeAddress,
  encodeUint256,
  getEthereumProvider,
  getWalletErrorMessage,
  readRpcContract,
  sendTransaction,
  waitForTransactionReceipt,
} from "@/lib/ethereum";
import { isUniswapV3Configured, robinhoodChain } from "@/config/network";
import { useWallet } from "@/hooks/use-wallet";
import type { LiquidityPosition } from "@/hooks/use-liquidity-positions";
import { recordActivity } from "@/lib/activity-store";
import { apiUrl } from "@/lib/api";
import {
  buildBurnData,
  buildCollectData,
  buildDecreaseLiquidityData,
  buildMulticallData,
} from "@/lib/uniswap-position";

const BALANCE_OF_SELECTOR = "0x70a08231";
const TOKEN_OF_OWNER_BY_INDEX_SELECTOR = "0x2f745c59";
const POSITIONS_SELECTOR = "0x99fbab88";
const POSITION_READ_BATCH_SIZE = 20;

async function readAllFeeBearingTokenIds(owner: string) {
  const manager = robinhoodChain.uniswapV3PositionManager;
  const countResponse = await readRpcContract(
    robinhoodChain.rpcUrl,
    manager,
    `${BALANCE_OF_SELECTOR}${encodeAddress(owner)}`,
  );
  const [countWord] = decodeWords(countResponse);
  if (!countWord) {
    throw new Error("Position manager returned an empty balance.");
  }

  const count = Number(decodeUint256(countWord));
  const feeBearingTokenIds: bigint[] = [];

  for (let start = 0; start < count; start += POSITION_READ_BATCH_SIZE) {
    const indexes = Array.from(
      { length: Math.min(POSITION_READ_BATCH_SIZE, count - start) },
      (_, offset) => start + offset,
    );
    const tokenIds = await Promise.all(
      indexes.map(async (index) => {
        const response = await readRpcContract(
          robinhoodChain.rpcUrl,
          manager,
          `${TOKEN_OF_OWNER_BY_INDEX_SELECTOR}${encodeAddress(owner)}${encodeUint256(index)}`,
        );
        const [tokenIdWord] = decodeWords(response);
        if (!tokenIdWord) {
          throw new Error(
            `Position manager returned an empty token ID at index ${index}.`,
          );
        }
        return decodeUint256(tokenIdWord);
      }),
    );

    const positionResponses = await Promise.all(
      tokenIds.map((tokenId) =>
        readRpcContract(
          robinhoodChain.rpcUrl,
          manager,
          `${POSITIONS_SELECTOR}${encodeUint256(tokenId)}`,
        ),
      ),
    );

    positionResponses.forEach((response, index) => {
      const words = decodeWords(response);
      if (words.length < 12) {
        throw new Error("Position manager returned incomplete position data.");
      }
      const tokensOwed0 = decodeUint256(words[10] ?? "0");
      const tokensOwed1 = decodeUint256(words[11] ?? "0");
      const tokenId = tokenIds[index];
      if ((tokensOwed0 > 0n || tokensOwed1 > 0n) && tokenId !== undefined) {
        feeBearingTokenIds.push(tokenId);
      }
    });
  }

  return feeBearingTokenIds;
}

export function usePositionActions() {
  const { address, onTargetNetwork } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<string[]>([]);

  const assertReady = () => {
    const provider = getEthereumProvider();
    if (!provider || !address) throw new Error("Connect a wallet first.");
    if (!onTargetNetwork) throw new Error("Switch to Robinhood Chain first.");
    if (!isUniswapV3Configured)
      throw new Error("Uniswap contracts are not configured.");
    return { provider, address };
  };

  const sendAndConfirm = async (
    transaction: { from: string; to: string; data: string },
    label: string,
  ) => {
    const { provider } = assertReady();
    setStatus(`${label}: waiting for wallet…`);
    const hash = await sendTransaction(provider, transaction);
    setTxHashes((previous) => [...previous, hash]);
    setStatus(`${label}: confirming on-chain…`);
    await waitForTransactionReceipt(provider, hash);
    recordActivity({
      address: transaction.from,
      hash,
      label,
      contract: transaction.to,
    });
    return hash;
  };

  const collect = useCallback(
    async (position: LiquidityPosition) => {
      setIsSubmitting(true);
      setError(null);
      setStatus(null);
      setTxHashes([]);
      try {
        const { address } = assertReady();
        const hash = await sendAndConfirm(
          {
            from: address,
            to: robinhoodChain.uniswapV3PositionManager,
            data: buildCollectData(BigInt(position.tokenId), address),
          },
          "Collecting fees",
        );
        setStatus("Fees collected.");
        return hash;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Fee collection failed.",
        );
        throw cause;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, onTargetNetwork],
  );

  const collectAll = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    setStatus(null);
    setTxHashes([]);
    let collectedCount = 0;
    try {
      const { address } = assertReady();
      setStatus("Scanning all wallet positions for unclaimed fees…");
      const tokenIds = await readAllFeeBearingTokenIds(address);

      for (const tokenId of tokenIds) {
        await sendAndConfirm(
          {
            from: address,
            to: robinhoodChain.uniswapV3PositionManager,
            data: buildCollectData(tokenId, address),
          },
          `Collecting fees (${collectedCount + 1} of ${tokenIds.length})`,
        );
        collectedCount++;
      }

      setStatus(
        collectedCount > 0 ? "All fees collected." : "No fees to collect.",
      );
    } catch (cause) {
      if (collectedCount > 0) {
        setStatus(
          `${collectedCount} positions were collected before the process stopped.`,
        );
      }
      setError(
        cause instanceof Error ? cause.message : "Batch fee collection failed.",
      );
      throw cause;
    } finally {
      setIsSubmitting(false);
    }
  }, [address, onTargetNetwork]);

  const close = useCallback(
    async (position: LiquidityPosition) => {
      if (BigInt(position.liquidity) <= 0n) {
        throw new Error("This position has no active liquidity.");
      }
      setIsSubmitting(true);
      setError(null);
      setStatus(null);
      setTxHashes([]);
      try {
        const { address } = assertReady();
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1_200);
        const closeData = buildMulticallData([
          buildDecreaseLiquidityData({
            tokenId: BigInt(position.tokenId),
            liquidity: BigInt(position.liquidity),
            amount0Min: 0n,
            amount1Min: 0n,
            deadline,
          }),
          buildCollectData(BigInt(position.tokenId), address),
          buildBurnData(BigInt(position.tokenId)),
        ]);
        setStatus("Simulating liquidity removal…");
        const simulationResponse = await fetch(
          apiUrl("/api/chain/simulate-mint"),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              from: address,
              data: closeData,
            }),
          },
        );
        const simulationPayload = (await simulationResponse.json()) as {
          result?: unknown;
          error?: unknown;
        };
        if (
          !simulationResponse.ok ||
          typeof simulationPayload.result !== "string"
        ) {
          throw new Error(
            typeof simulationPayload.error === "string"
              ? simulationPayload.error
              : "Liquidity removal simulation failed.",
          );
        }
        const closeHash = await sendAndConfirm(
          {
            from: address,
            to: robinhoodChain.uniswapV3PositionManager,
            data: closeData,
          },
          "Closing position and collecting tokens",
        );
        setStatus("Position closed and tokens collected.");
        return closeHash;
      } catch (cause) {
        setError(getWalletErrorMessage(cause, "Position close failed."));
        throw cause;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, onTargetNetwork],
  );

  return { collect, collectAll, close, isSubmitting, status, error, txHashes };
}
