import { Link, useParams } from "wouter";
import { ArrowLeft, Zap } from "lucide-react";
import { Token, StatusPill } from "@/components/ui/shared";
import { useLiquidityPositions } from "@/hooks/use-liquidity-positions";
import { useWallet } from "@/hooks/use-wallet";
import { shortenAddress } from "@/lib/ethereum";

export default function PositionDetail() {
  const { id } = useParams();
  const { connected, onTargetNetwork } = useWallet();
  const { positions, isLoading, error } = useLiquidityPositions();
  const position = positions.find((item) => item.tokenId === id);
  const positionReady = connected && onTargetNetwork && position;
  
  return (
    <div className="delta-rise">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-xs text-[#7c967f] hover:text-[#c9ddcc] focus:outline-none focus:ring-1 focus:ring-primary rounded">
        <ArrowLeft size={15}/> Back to positions
      </Link>
      
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#688471]">
            Position <span className="text-[#3e5a46]">/</span> {id || "Unknown"}
          </div>
          <div className="flex items-center gap-3">
             <div className="flex -space-x-2">
               <Token symbol="0" tone="#9bc8a6"/>
               <Token symbol="1" tone="#8db6d8"/>
            </div>
             <h1 className="text-xl font-semibold tracking-[-.03em] sm:text-2xl">
               {positionReady
                 ? `${shortenAddress(position.token0)} / ${shortenAddress(position.token1)}`
                 : `Position #${id || "Unknown"}`}
             </h1>
          </div>
           <p className="mt-2 text-sm text-[#819989]">
             {isLoading
               ? "Reading position from Robinhood Chain…"
               : error
                 ? error
                 : positionReady
                   ? `Fee tier ${position.fee / 10_000}%`
                   : "Position data unavailable"}
           </p>
        </div>
         <StatusPill green={Boolean(positionReady && BigInt(position.liquidity) > 0n)}>
           {positionReady
             ? BigInt(position.liquidity) > 0n
               ? "Active liquidity"
               : "No liquidity"
             : "Data pending"}
         </StatusPill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="card-gradient rounded-xl border p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Price range</h2>
             <StatusPill>{positionReady ? "On-chain ticks" : "Not available"}</StatusPill>
          </div>
          <div className="mt-6 h-52 rounded-lg border border-[#6aa47720] bg-[#08150e] p-5">
             <div className="flex h-full items-center justify-center text-center text-xs text-[#78917e]">
               {positionReady
                 ? `Lower tick ${position.tickLower}  ·  Upper tick ${position.tickUpper}`
                 : "Price range unavailable"}
            </div>
          </div>
           {positionReady && (
             <div className="mt-4 grid gap-3 sm:grid-cols-3">
               {[
                 ["Liquidity", position.liquidity],
                 ["Token 0 owed", position.tokensOwed0],
                 ["Token 1 owed", position.tokensOwed1],
               ].map(([label, value]) => (
                 <div key={label} className="rounded-lg border border-[#6aa4771c] bg-[#08150e] p-3">
                   <p className="text-[10px] text-[#607a67]">{label}</p>
                   <p className="mt-1 break-all font-mono text-xs text-[#c3d4c5]">{value}</p>
                 </div>
               ))}
             </div>
           )}
        </div>

        <div className="space-y-4">
          <div className="card-gradient rounded-xl border p-5">
            <h2 className="text-sm font-semibold">Exit automation</h2>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#c7d9ca]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c99a57]"/> Not configured
            </div>
            <p className="mt-3 text-xs leading-5 text-[#718a77]">
              Set a threshold after wallet and keeper configuration are available.
            </p>
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive-foreground">
              <Zap size={15}/> Dangerous actions
            </div>
            <p className="mt-3 text-xs leading-5 text-[#aa837b]">
              Closing a position or revoking automation can be irreversible. Actions are disabled until a real position exists.
            </p>
            <button disabled className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#9a5b50] py-2.5 text-xs text-[#9c756e] cursor-not-allowed">
              Close position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
