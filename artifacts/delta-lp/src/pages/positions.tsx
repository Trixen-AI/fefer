import { ArrowRight, Bot, Gauge, Plus, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/use-wallet";

export default function Positions() {
  const { connected } = useWallet();

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#688471]">
            Workspace <span className="text-[#3e5a46]">/</span> Positions
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Positions</h1>
          <p className="mt-2 text-sm text-[#819989]">Monitor ranges and define your exit logic.</p>
        </div>
        <Link href="/create" className="hidden items-center gap-2 rounded-lg border border-[#5ee08a38] px-3 py-2 text-xs font-semibold text-[#b8e8c1] hover:bg-[#5ee08a0d] sm:flex focus:outline-none focus:ring-2 focus:ring-primary">
          <Plus size={15} /> New position
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Total value", "—", connected ? "Loading balances..." : "Wallet not connected"],
          ["Active positions", "—", connected ? "Fetching on-chain data..." : "No positions detected"],
          ["Keeper coverage", "—", "Not configured"]
        ].map(([title, value, subtitle], i) => (
          <div key={title} className="card-gradient rounded-xl border p-4">
            <div className="flex items-center justify-between text-[11px] text-[#74907d]">
              {title}
              <span className="text-[#55705d]">
                {i === 2 ? <Bot size={15} /> : <SlidersHorizontal size={14} />}
              </span>
            </div>
            <div className="mt-3 text-2xl font-medium tracking-tight text-[#e3eee5]">{value}</div>
            <div className="mt-1 text-[10px] text-[#647d6b]">{subtitle}</div>
          </div>
        ))}
      </div>

      <div className="animate-in fade-in duration-500">
        <div style={{ background: "radial-gradient(circle at 75% 0%, rgba(57,135,78,.15), transparent 42%), #0b1a11" }} className="relative overflow-hidden rounded-2xl border p-6 sm:p-10">
          <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border border-[#5ee08a18]" />
          <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-[#5ee08a12]" />
          
          <div className="relative max-w-xl">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
              <Gauge size={21} />
            </div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.19em] text-[#6f9b79]">Positions overview</p>
            <h2 className="text-2xl font-semibold tracking-[-.03em] text-[#f2f7f3] sm:text-3xl">
              Your liquidity, under a watchful keeper.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#8ea596]">
              {connected ? "You have no active liquidity positions. Start by defining a concentrated-liquidity range." : "Connect a wallet to inspect your positions, or start by defining a concentrated-liquidity range."}
            </p>
            <Link href="/create" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-[#7aeda0] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
              <Plus size={16} /> Create an LP position <ArrowRight size={15} />
            </Link>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-[#637c6b]">
              <ShieldCheck size={14} /> Transactions must be approved in your wallet.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
