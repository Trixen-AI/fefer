import { useCallback, useEffect, useState } from "react";
import {
  decodeAddress,
  decodeSignedInt24,
  decodeUint256,
  decodeWords,
  encodeAddress,
  encodeUint256,
  readRpcContract,
} from "@/lib/ethereum";
import {
  isUniswapV3Configured,
  robinhoodChain,
} from "@/config/network";
import { useWallet } from "@/hooks/use-wallet";

const BALANCE_OF_SELECTOR = "0x70a08231";
const TOKEN_OF_OWNER_BY_INDEX_SELECTOR = "0x2f745c59";
const POSITIONS_SELECTOR = "0x99fbab88";
const MAX_POSITIONS_PER_REFRESH = 100;

export type LiquidityPosition = {
  tokenId: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tokensOwed0: string;
  tokensOwed1: string;
};

function formatPosition(data: string, tokenId: bigint): LiquidityPosition {
  const words = decodeWords(data);
  if (words.length < 12) {
    throw new Error("Position manager returned incomplete position data.");
  }

  return {
    tokenId: tokenId.toString(),
    token0: decodeAddress(words[2]),
    token1: decodeAddress(words[3]),
    fee: Number(decodeUint256(words[4])),
    tickLower: decodeSignedInt24(words[5]),
    tickUpper: decodeSignedInt24(words[6]),
    liquidity: decodeUint256(words[7]).toString(),
    tokensOwed0: decodeUint256(words[10]).toString(),
    tokensOwed1: decodeUint256(words[11]).toString(),
  };
}

export function useLiquidityPositions() {
  const { address, onTargetNetwork } = useWallet();
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address || !onTargetNetwork || !isUniswapV3Configured) {
      setPositions([]);
      setTotalCount(0);
      return;
    }

    setIsLoading(true);
    setError(null);
    let readStage = "position count";

    try {
      const manager = robinhoodChain.uniswapV3PositionManager;
      const countResponse = await readRpcContract(
        robinhoodChain.rpcUrl,
        manager,
        `${BALANCE_OF_SELECTOR}${encodeAddress(address)}`,
      );
      const [countWord] = decodeWords(countResponse);
      if (!countWord) {
        throw new Error("Position manager returned an empty balance.");
      }
      const count = Number(decodeUint256(countWord));
      setTotalCount(count);
      const visibleCount = Math.min(count, MAX_POSITIONS_PER_REFRESH);
      const tokenIds: bigint[] = [];

      for (let index = 0; index < visibleCount; index += 1) {
        readStage = `token ID at index ${index}`;
        const tokenIdResponse = await readRpcContract(
          robinhoodChain.rpcUrl,
          manager,
          `${TOKEN_OF_OWNER_BY_INDEX_SELECTOR}${encodeAddress(address)}${encodeUint256(index)}`,
        );
        const [tokenIdWord] = decodeWords(tokenIdResponse);
        if (!tokenIdWord) {
          throw new Error("Position manager returned an empty token ID.");
        }
        tokenIds.push(decodeUint256(tokenIdWord));
      }

      const nextPositions: LiquidityPosition[] = [];
      for (const tokenId of tokenIds) {
        readStage = `position NFT #${tokenId}`;
        const positionResponse = await readRpcContract(
          robinhoodChain.rpcUrl,
          manager,
          `${POSITIONS_SELECTOR}${encodeUint256(tokenId)}`,
        );
        nextPositions.push(formatPosition(positionResponse, tokenId));
      }

      setPositions(nextPositions);
    } catch (cause) {
      setPositions([]);
      setTotalCount(0);
      const detail =
        cause instanceof Error ? cause.message : "Unknown RPC response.";
      setError(`Read failed at ${readStage}: ${detail}`);
    } finally {
      setIsLoading(false);
    }
  }, [address, onTargetNetwork]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { positions, totalCount, isLoading, error, refresh };
}