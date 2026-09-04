import { useCallback, useEffect, useState } from "react";
import {
  decodeAddress,
  decodeSignedInt24,
  decodeUint256,
  decodeWords,
} from "@/lib/ethereum";
import {
  isUniswapV3Configured,
  robinhoodChain,
} from "@/config/network";
import { useWallet } from "@/hooks/use-wallet";

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
    try {
      const response = await fetch(`/api/chain/positions/${address}`);
      const payload = (await response.json()) as {
        totalCount?: unknown;
        positions?: Array<{ tokenId?: unknown; data?: unknown }>;
        error?: unknown;
      };
      if (
        !response.ok ||
        typeof payload.totalCount !== "number" ||
        !Array.isArray(payload.positions)
      ) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Position API returned an invalid response.",
        );
      }
      const nextPositions = payload.positions.map((item) => {
        if (
          typeof item.tokenId !== "string" ||
          typeof item.data !== "string"
        ) {
          throw new Error("Position API returned malformed NFT data.");
        }
        return formatPosition(item.data, BigInt(item.tokenId));
      });
      setTotalCount(payload.totalCount);
      setPositions(nextPositions);
    } catch (cause) {
      setPositions([]);
      setTotalCount(0);
      const detail =
        cause instanceof Error ? cause.message : "Unknown RPC response.";
      setError(`Position read failed: ${detail}`);
    } finally {
      setIsLoading(false);
    }
  }, [address, onTargetNetwork]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { positions, totalCount, isLoading, error, refresh };
}