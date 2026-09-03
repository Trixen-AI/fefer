import { useCallback, useState } from "react";
import {
  getEthereumProvider,
  sendTransaction,
  simulateRpcTransaction,
  waitForTransactionReceipt,
} from "@/lib/ethereum";
import { isUniswapV3Configured, robinhoodChain } from "@/config/network";
import { useWallet } from "@/hooks/use-wallet";
import type { LiquidityPosition } from "@/hooks/use-liquidity-positions";
import { recordActivity } from "@/lib/activity-store";
import {
  buildBurnData,
  buildCollectData,
  buildDecreaseLiquidityData,
  decodeRemovalSimulation,
  minimumAfterSlippage,
} from "@/lib/uniswap-position";

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
    if (!isUniswapV3Configured) throw new Error("Uniswap contracts are not configured.");
    return { provider, address };
  };

  const sendAndConfirm = async (
    transaction: { from: string; to: string; data: string },
    label: string,
  ) => {
    const { provider } = assertReady();
    setStatus(`${label} — waiting for wallet…`);
    const hash = await sendTransaction(provider, transaction);
    setTxHashes((previous) => [...previous, hash]);
    setStatus(`${label} — confirming on-chain…`);
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
        setError(cause instanceof Error ? cause.message : "Fee collection failed.");
        throw cause;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, onTargetNetwork],
  );

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
        const simulationData = buildDecreaseLiquidityData({
          tokenId: BigInt(position.tokenId),
          liquidity: BigInt(position.liquidity),
          amount0Min: 0n,
          amount1Min: 0n,
          deadline,
        });
        setStatus("Simulating liquidity removal…");
        const simulation = await simulateRpcTransaction(robinhoodChain.rpcUrl, {
          from: address,
          to: robinhoodChain.uniswapV3PositionManager,
          data: simulationData,
        });
        const quote = decodeRemovalSimulation(simulation);

        await sendAndConfirm(
          {
            from: address,
            to: robinhoodChain.uniswapV3PositionManager,
            data: buildDecreaseLiquidityData({
              tokenId: BigInt(position.tokenId),
              liquidity: BigInt(position.liquidity),
              amount0Min: minimumAfterSlippage(quote.amount0),
              amount1Min: minimumAfterSlippage(quote.amount1),
              deadline,
            }),
          },
          "Removing liquidity",
        );

        await sendAndConfirm(
          {
            from: address,
            to: robinhoodChain.uniswapV3PositionManager,
            data: buildCollectData(BigInt(position.tokenId), address),
          },
          "Collecting position tokens",
        );

        const burnHash = await sendAndConfirm(
          {
            from: address,
            to: robinhoodChain.uniswapV3PositionManager,
            data: buildBurnData(BigInt(position.tokenId)),
          },
          "Burning empty position NFT",
        );
        setStatus("Position closed and tokens collected.");
        return burnHash;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Position close failed.");
        throw cause;
      } finally {
        setIsSubmitting(false);
      }
    },
    [address, onTargetNetwork],
  );

  return { collect, close, isSubmitting, status, error, txHashes };
}