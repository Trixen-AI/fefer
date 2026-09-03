import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, ChevronDown, ClipboardList } from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { Safety, Token } from "@/components/ui/shared";

export default function CreateLP() {
  const [step, setStep] = useState(1);
  const { connected, onTargetNetwork, wrongNetwork } = useWallet();

  return (
    <div className="delta-rise max-w-4xl">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-xs text-[#7c967f] hover:text-[#c9ddcc] focus:outline-none focus:ring-1 focus:ring-primary rounded">
        <ArrowLeft size={15}/> Back to positions
      </Link>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#688471]">Position builder</p>
          <h1 className="text-3xl font-semibold tracking-[-.04em]">Create LP</h1>
          <p className="mt-2 text-sm text-[#819989]">Set the range. Define the exit. Review before signing.</p>
        </div>
        <span className="text-xs text-[#6f8975]">Step {step} of 3</span>
      </div>

      <div className="mb-8 flex gap-2">
        {[
          ["01", "Pair"],
          ["02", "Range"],
          ["03", "Review"]
        ].map(([n, l], i) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${step > i ? "bg-primary text-primary-foreground" : "border border-[#5ee08a33] text-[#8ea596]"}`}>
              {n}
            </div>
            <span className="hidden text-xs text-[#8ea596] sm:block">{l}</span>
            {i < 2 && <div className="h-px flex-1 bg-[#6aa47722]" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div className="card-gradient rounded-xl border p-5">
            <h3 className="text-sm font-semibold">Choose token pair</h3>
            <p className="mt-1 text-xs text-[#718a77]">
              {!connected ? "Token balances appear once a wallet is connected." : !onTargetNetwork ? "Switch to Robinhood Chain to load supported pairs." : "Loading supported pairs from Uniswap V3..."}
            </p>
            
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="rounded-lg border border-[#6aa47727] bg-[#08150e] p-4 text-left hover:border-primary/50 focus:outline-none focus:border-primary transition-colors">
                <div className="mb-5 flex items-center gap-2">
                  <Token symbol="ETH" tone="#9bc8a6" />
                  <span className="text-sm">ETH</span>
                </div>
                <div className="text-xs text-[#5e7765]">{connected && onTargetNetwork ? "—" : "Balance unavailable"}</div>
              </button>
              <button className="rounded-lg border border-[#6aa47727] bg-[#08150e] p-4 text-left hover:border-primary/50 focus:outline-none focus:border-primary transition-colors">
                <div className="mb-5 flex items-center gap-2">
                  <Token symbol="USDC" tone="#8db6d8" />
                  <span className="text-sm">USDC</span>
                </div>
                <div className="text-xs text-[#5e7765]">{connected && onTargetNetwork ? "—" : "Balance unavailable"}</div>
              </button>
            </div>
            
            <label className="mt-5 block text-xs text-[#8ea596]">Fee tier</label>
            <button className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#6aa47727] bg-[#08150e] p-3 text-sm hover:border-primary/30 focus:outline-none focus:border-primary">
              <span>0.05% <span className="ml-2 text-xs text-[#647d6b]">Recommended</span></span>
              <ChevronDown size={15}/>
            </button>
            
            <button onClick={() => setStep(2)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-[#7aeda0] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
              Continue <ArrowRight size={15}/>
            </button>
          </div>
          <Safety />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div className="card-gradient rounded-xl border p-5">
            <h3 className="text-sm font-semibold">Set your price range</h3>
            <p className="mt-1 text-xs text-[#718a77]">Values are unavailable until a pair and oracle are connected.</p>
            
            <div className="mt-6 h-44 rounded-lg border border-[#6aa47720] bg-[#08150e] p-4">
              <div className="flex h-full items-end gap-1">
                {[25,38,32,48,44,60,51,67,57,76,63,72,55,62,48,40,52,45,31,37,22].map((h, i) => (
                  <div key={i} style={{ height: `${h}%`, opacity: 0.25 + i / 100 }} className="flex-1 rounded-t bg-primary" />
                ))}
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#78917e]">Min price</label>
                <div className="mt-2 rounded-lg border border-[#6aa47727] bg-[#08150e] px-3 py-3 text-sm text-[#617b68]">
                  — USDC per ETH
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#78917e]">Max price</label>
                <div className="mt-2 rounded-lg border border-[#6aa47727] bg-[#08150e] px-3 py-3 text-sm text-[#617b68]">
                  — USDC per ETH
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="flex items-center justify-center rounded-lg border border-[#6aa47727] px-4 py-3 text-sm font-semibold text-[#8ea596] hover:bg-[#08150e] hover:text-[#c9ddcc] transition-colors focus:outline-none focus:border-primary">
                Back
              </button>
              <button onClick={() => setStep(3)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-[#7aeda0] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                Continue to review <ArrowRight size={15}/>
              </button>
            </div>
          </div>
          <Safety />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div className="card-gradient rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <ClipboardList size={17} className="text-primary"/>
              <h3 className="text-sm font-semibold">Review and approve</h3>
            </div>
            
            <div className="mt-5 divide-y divide-[#6aa47718] text-sm">
              {[
                ["Pair", "ETH / USDC"],
                ["Fee tier", "0.05%"],
                ["Price range", "Unavailable"],
                ["Deposit", !connected ? "Wallet not connected" : wrongNetwork ? "Wrong network" : "Awaiting input"]
              ].map(x => (
                <div key={x[0]} className="flex justify-between py-3">
                  <span className="text-[#718a77]">{x[0]}</span>
                  <span className="text-[#c6d8c9]">{x[1]}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-5 rounded-lg bg-[#c99a570b] p-3 text-xs leading-5 text-[#aa9168]">
              Uniswap V3 deployment is not configured for this network. Transaction submission is disabled.
            </div>
            
            {connected ? (
              <button disabled className="mt-5 w-full rounded-lg bg-[#345740] py-3 text-sm font-semibold text-[#718f78] cursor-not-allowed">
                Contract unconfigured
              </button>
            ) : (
              <button disabled className="mt-5 w-full rounded-lg bg-[#345740] py-3 text-sm font-semibold text-[#718f78] cursor-not-allowed">
                Connect wallet to continue
              </button>
            )}
            
            <button onClick={() => setStep(2)} className="mt-3 w-full py-2 text-xs text-[#8ea596] hover:text-[#cfe1d2] focus:outline-none rounded">
              Adjust range
            </button>
          </div>
          <Safety />
        </div>
      )}
    </div>
  );
}
