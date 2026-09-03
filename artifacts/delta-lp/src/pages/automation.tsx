import { useState } from "react";
import { Bot, Settings2 } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";

export default function Automation() {
  const [enabled, setEnabled] = useState(false);
  const { connected } = useWallet();

  return (
    <div className="delta-rise">
      <div className="mb-8">
        <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#688471]">Keeper operations</p>
        <h1 className="text-3xl font-semibold tracking-[-.04em]">Automation</h1>
        <p className="mt-2 text-sm text-[#819989]">A narrow mandate for a high-consequence action.</p>
      </div>

      <div className="card-gradient max-w-3xl rounded-xl border p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Exit keeper</h2>
              <p className="mt-1 text-xs leading-5 text-[#78917e]">Monitors your configured threshold and proposes a close when conditions are met.</p>
            </div>
          </div>
          <button 
            onClick={() => connected && setEnabled(!enabled)} 
            aria-label="Toggle automation" 
            className={`relative h-6 w-11 rounded-full transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${!connected ? "opacity-50 cursor-not-allowed bg-[#294a32]" : enabled ? "bg-primary" : "bg-[#294a32]"}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-[#d9f2df] transition ${enabled && connected ? "left-6" : "left-1"}`} />
          </button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#6aa4771c] bg-[#08150e] p-4">
            <div className="text-[10px] uppercase tracking-wider text-[#627b68]">Keeper status</div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              {enabled && connected ? (
                <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c99a57]"/>Waiting for configuration</>
              ) : (
                <><span className="h-1.5 w-1.5 rounded-full bg-[#536c5a]"/>Not active</>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-[#6aa4771c] bg-[#08150e] p-4">
            <div className="text-[10px] uppercase tracking-wider text-[#627b68]">Monitored positions</div>
            <div className="mt-3 text-sm text-[#9caf9f]">—</div>
          </div>
        </div>

        <p className="mt-5 flex gap-2 text-xs leading-5 text-[#778f7d]">
          <Settings2 size={14} className="mt-0.5 shrink-0"/>
          Automation keeper is not configured. Contract deployment details must be provided before permissions can be granted.
        </p>
      </div>
    </div>
  );
}
