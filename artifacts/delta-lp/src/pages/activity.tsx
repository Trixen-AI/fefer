import { Activity } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { StatusPill } from "@/components/ui/shared";

export default function ActivityView() {
  const { connected } = useWallet();

  return (
    <div className="delta-rise">
      <div className="mb-8">
        <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#688471]">Audit trail</p>
        <h1 className="text-3xl font-semibold tracking-[-.04em]">Activity</h1>
        <p className="mt-2 text-sm text-[#819989]">A record of approvals, keeper proposals, and exits.</p>
      </div>

      <div className="card-gradient flex min-h-[310px] flex-col items-center justify-center rounded-xl border p-8 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#5ee08a28] text-primary">
          <Activity size={20} />
        </div>
        <h2 className="text-base font-semibold">No activity to show</h2>
        <p className="mt-2 max-w-sm text-xs leading-5 text-[#78917e]">
          {connected ? "No historical transactions found for this address on the current network." : "Connect a wallet to load your on-chain activity."}
        </p>
        <span className="mt-5">
          <StatusPill>{connected ? "Up to date" : "Wallet not connected"}</StatusPill>
        </span>
      </div>
    </div>
  );
}
