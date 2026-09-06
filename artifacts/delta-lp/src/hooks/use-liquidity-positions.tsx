import { useCallback, useEffect, useState } from "react";
import {
  decodeAddress,
  decodeSignedInt24,
  decodeUint256,
  decodeWords,
} from "@/lib/ethereum";
import { isUniswapV3Configured, robinhoodChain } from "@/config/network";
import { useWallet } from "@/hooks/use-wallet";
import { apiUrl } from "@/lib/api";

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
      const response = await fetch(apiUrl(`/api/chain/positions/${address}`));

      // Read as text first. The endpoint can answer with the SPA's index.html
      // (a misrouted /api call) or with the host's own error envelope, and both
      // used to surface as one unhelpful "invalid response".
      const raw = await response.text();
      let payload: {
        totalCount?: unknown;
        positions?: Array<{ tokenId?: unknown; data?: unknown }>;
        error?: unknown;
      };
      try {
        payload = JSON.parse(raw);
      } catch {
        const snippet = raw.trim().slice(0, 80).replace(/\s+/g, " ");
        throw new Error(
          `Position API returned ${response.status} with a non-JSON body: ${snippet || "(empty)"}`,
        );
      }

      if (
        !response.ok ||
        typeof payload.totalCount !== "number" ||
        !Array.isArray(payload.positions)
      ) {
        if (typeof payload.error === "string") throw new Error(payload.error);
        // Unrecognised JSON shape: show what actually came back rather than a
        // generic message, so the failing layer is identifiable.
        const keys = Object.keys(payload ?? {})
          .slice(0, 5)
          .join(", ");
        throw new Error(
          `Position API returned ${response.status} with an unexpected shape {${keys || "empty"}}`,
        );
      }
      const nextPositions = payload.positions.map((item) => {
        if (typeof item.tokenId !== "string" || typeof item.data !== "string") {
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
