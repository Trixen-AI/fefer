import { useCallback, useEffect, useState } from "react";
import { Bot, ExternalLink, ShieldCheck } from "lucide-react";
import { robinhoodChain } from "@/config/network";
import { useLiquidityPositions } from "@/hooks/use-liquidity-positions";
import { useWallet } from "@/hooks/use-wallet";
import {
  encodeAddress,
  encodeUint256,
  getEthereumProvider,
  parseUnits,
  sendTransaction,
  shortenAddress,
  waitForTransactionReceipt,
} from "@/lib/ethereum";
import { apiUrl } from "@/lib/api";

const keeperAddress = String(import.meta.env.VITE_EXIT_KEEPER_ADDRESS ?? "");
const APPROVE_SELECTOR = "0x095ea7b3";
const CONFIGURE_SELECTOR = "0x31b2cb55";
const CANCEL_SELECTOR = "0x40e58ee5";

type KeeperStatus = {
  configured: boolean;
  running: boolean;
  operatorAddress: string | null;
  contractAddress: string | null;
  activeMandates: number;
  lastPollAt: string | null;
  lastTransactionHash: string | null;
  lastError: string | null;
};

export default function Automation() {
  const { address, connected, onTargetNetwork } = useWallet();
  const { positions, isLoading, refresh } = useLiquidityPositions();
  const [status, setStatus] = useState<KeeperStatus | null>(null);
  const [minimumWeth, setMinimumWeth] = useState("0");
  const [minimumUsdg, setMinimumUsdg] = useState("0");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/keeper/status"));
      if (!response.ok) throw new Error("Keeper API is unavailable.");
      setStatus((await response.json()) as KeeperStatus);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Keeper status failed.",
      );
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const timer = window.setInterval(() => void loadStatus(), 15_000);
    return () => window.clearInterval(timer);
  }, [loadStatus]);

  async function transact(tokenId: string, kind: "approve" | "arm" | "cancel") {
    const provider = getEthereumProvider();
    if (!provider || !address || !onTargetNetwork) {
      setMessage("Connect MetaMask on Robinhood Chain first.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(keeperAddress)) {
      setMessage("Keeper contract is not configured.");
      return;
    }

    setPending(`${kind}-${tokenId}`);
    setMessage(null);
    try {
      let to = keeperAddress;
      let data: string;
      if (kind === "approve") {
        to = robinhoodChain.uniswapV3PositionManager;
        data = `${APPROVE_SELECTOR}${encodeAddress(keeperAddress)}${encodeUint256(BigInt(tokenId))}`;
      } else if (kind === "arm") {
        const minWeth = parseUnits(minimumWeth, 18);
        const minUsdg = parseUnits(minimumUsdg, 6);
        data = `${CONFIGURE_SELECTOR}${encodeUint256(BigInt(tokenId))}${encodeUint256(300)}${encodeUint256(minWeth)}${encodeUint256(minUsdg)}`;
      } else {
        data = `${CANCEL_SELECTOR}${encodeUint256(BigInt(tokenId))}`;
      }
      const hash = await sendTransaction(provider, { from: address, to, data });
      await waitForTransactionReceipt(provider, hash);
      setMessage(
        kind === "approve"
          ? `NFT #${tokenId} approved. You can activate its mandate now.`
          : kind === "arm"
            ? `Exit mandate for NFT #${tokenId} is active.`
            : `Exit mandate for NFT #${tokenId} was cancelled.`,
      );
      await Promise.all([loadStatus(), refresh()]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Transaction failed.",
      );
    } finally {
      setPending(null);
    }
  }

  const live = Boolean(status?.configured && status.running);

  return (
    <div className="liqo-rise">
      <div className="mb-8">
        <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-muted-foreground">
          Keeper operations
        </p>
        <h1 className="text-3xl font-semibold tracking-[-.04em]">Automation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Non-custodial exits after a position remains out of range for 5
          minutes.
        </p>
      </div>

      <div className="card-gradient max-w-3xl rounded-[24px] border p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-primary">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Exit keeper</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The NFT stays in your wallet. You can revoke approval or cancel
                at any time.
              </p>
            </div>
          </div>
          <span
            className={`mt-2 h-2 w-2 rounded-full ${live ? "animate-pulse bg-primary" : "bg-muted-foreground"}`}
          />
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Keeper status
            </div>
            <div className="mt-3 text-sm">
              {live ? "Running" : status?.lastError || "Checking…"}
            </div>
            {status?.operatorAddress && (
              <div className="mt-1 text-xs text-muted-foreground">
                Operator {shortenAddress(status.operatorAddress)}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Active mandates
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {status?.activeMandates ?? "N/A"}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Minimum WETH when below range
            <input
              value={minimumWeth}
              onChange={(event) => setMinimumWeth(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-white outline-none focus:border-primary"
              inputMode="decimal"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Minimum USDG when above range
            <input
              value={minimumUsdg}
              onChange={(event) => setMinimumUsdg(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-white outline-none focus:border-primary"
              inputMode="decimal"
            />
          </label>
        </div>

        <div className="mt-6 space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading positions…</p>
          )}
          {!isLoading && positions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No Uniswap V3 positions found in this wallet.
            </p>
          )}
          {positions.map((position) => (
            <div
              key={position.tokenId}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Position #{position.tokenId}
                </span>
                <span className="text-xs text-muted-foreground">
                  {position.tickLower} → {position.tickUpper}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  disabled={!connected || !onTargetNetwork || Boolean(pending)}
                  onClick={() => void transact(position.tokenId, "approve")}
                  className="rounded-2xl border border-border px-3 py-2 text-xs disabled:opacity-40"
                >
                  1. Approve NFT
                </button>
                <button
                  disabled={
                    !live || !connected || !onTargetNetwork || Boolean(pending)
                  }
                  onClick={() => void transact(position.tokenId, "arm")}
                  className="rounded-2xl bg-primary px-3 py-2 text-xs font-semibold text-signal-foreground disabled:opacity-40"
                >
                  2. Activate exit
                </button>
                <button
                  disabled={!connected || !onTargetNetwork || Boolean(pending)}
                  onClick={() => void transact(position.tokenId, "cancel")}
                  className="rounded-2xl px-3 py-2 text-xs text-destructive disabled:opacity-40"
                >
                  Cancel mandate
                </button>
              </div>
            </div>
          ))}
        </div>

        {message && (
          <p className="mt-5 text-xs leading-5 text-foreground">{message}</p>
        )}
        <p className="mt-5 flex gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          Exit executes only after the same out-of-range side persists for 5
          minutes. Owner receives all collected assets.
        </p>
        {status?.contractAddress && (
          <a
            className="mt-3 inline-flex items-center gap-1 text-xs text-primary"
            href={`${robinhoodChain.explorerUrl}/address/${status.contractAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            View keeper contract <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
