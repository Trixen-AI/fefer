import { Activity, ExternalLink, RefreshCw } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { StatusPill } from "@/components/ui/shared";
import { useActivity } from "@/hooks/use-activity";
import { robinhoodChain } from "@/config/network";
import { shortenAddress } from "@/lib/ethereum";

export default function ActivityView() {
  const { connected, onTargetNetwork, wrongNetwork } = useWallet();
  const { transactions, isLoading, error, refresh } = useActivity();

  return (
    <div className="lico-rise">
      <div className="mb-8">
        <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-muted-foreground">
          Audit trail
        </p>
        <h1 className="text-3xl font-semibold tracking-[-.04em]">Activity</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A record of approvals, keeper proposals, and exits.
        </p>
      </div>

      {connected && onTargetNetwork && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => void refresh()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-signal/50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-[24px] border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          {error}
        </div>
      )}
      {transactions.length > 0 ? (
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <a
              key={transaction.hash}
              href={`${robinhoodChain.explorerUrl}/tx/${transaction.hash}`}
              target="_blank"
              rel="noreferrer"
              className="card-gradient flex items-center justify-between gap-4 rounded-[24px] border p-4 transition hover:border-signal/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                  {transaction.label}
                </div>
                <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                  {shortenAddress(transaction.hash)}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(transaction.timestamp).toLocaleString()}
                </p>
              </div>
              <ExternalLink
                size={14}
                className="shrink-0 text-muted-foreground"
              />
            </a>
          ))}
        </div>
      ) : (
        <div className="card-gradient flex min-h-[310px] flex-col items-center justify-center rounded-[24px] border p-8 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-signal/25 text-primary">
            <Activity size={20} />
          </div>
          <h2 className="text-base font-semibold">No activity to show</h2>
          <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
            {!connected
              ? "Connect a wallet to load your on-chain activity."
              : wrongNetwork
                ? "Switch to Robinhood Chain to load activity for this address."
                : "No historical transactions found for this address on the current network."}
          </p>
          <span className="mt-5">
            <StatusPill>
              {!connected
                ? "Wallet not connected"
                : !onTargetNetwork
                  ? "Wrong network"
                  : "Up to date"}
            </StatusPill>
          </span>
        </div>
      )}
    </div>
  );
}
