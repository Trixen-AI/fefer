import { ArrowLeft, ClipboardList, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useUniswapPool } from "@/hooks/use-uniswap-pool";
import { Token, Safety } from "@/components/ui/shared";
import { formatUnits } from "@/lib/ethereum";
import { useState } from "react";
import { robinhoodChain } from "@/config/network";

export default function CreateLP() {
  const [, setLocation] = useLocation();
  const { connected, onTargetNetwork, connect } = useWallet();
  const { tokens, currentTick, isLoading: poolLoading, error: poolError, approve, mint, isSubmitting } = useUniswapPool();
  const [step, setStep] = useState(1);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [lowerTickOffset, setLowerTickOffset] = useState(-500);
  const [upperTickOffset, setUpperTickOffset] = useState(500);

  const token0 = tokens[0];
  const token1 = tokens[1];
  const hasTokens = token0 && token1;

  const onNext = () => {
    if (step < 3) setStep(step + 1);
  };
  const onBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const border = "rgba(100,180,120,.16)";
  const card = "linear-gradient(145deg, #102719 0%, #0b1a11 100%)";

  const handleMint = async () => {
    if (!token0 || !token1 || currentTick === null) return;
    try {
      const amount0Big = BigInt(Math.floor(parseFloat(amount0 || "0") * 1e6));
      const amount1Big = BigInt(Math.floor(parseFloat(amount1 || "0") * 1e6));

      // Quick check for allowance, naive logic here for simplicity
      if (token0.allowance < amount0Big * 10n ** BigInt(token0.decimals - 6)) {
        await approve(token0, BigInt(2**256)-1n);
      }
      if (token1.allowance < amount1Big * 10n ** BigInt(token1.decimals - 6)) {
        await approve(token1, BigInt(2**256)-1n);
      }

      await mint({
        amount0,
        amount1,
        tickLower: currentTick + lowerTickOffset,
        tickUpper: currentTick + upperTickOffset,
        slippageBps: 50
      });
      setLocation("/");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="delta-rise max-w-4xl">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 text-xs text-[#7c967f] hover:text-[#c9ddcc]">
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
        {[["01","Pair"],["02","Range"],["03","Review"]].map(([n,l],i) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${step > i ? "bg-[#5ee08a] text-[#06100b]" : "border border-[#5ee08a33] text-[#8ea596]"}`}>{n}</div>
            <span className="hidden text-xs text-[#8ea596] sm:block">{l}</span>
            {i < 2 && <div className="h-px flex-1 bg-[#6aa47722]" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div style={{ background: card, borderColor: border }} className="rounded-xl border p-5">
            <h3 className="text-sm font-semibold">Choose token pair</h3>
            <p className="mt-1 text-xs text-[#718a77]">
              {!connected ? "Token balances appear once a wallet is connected." : "From Uniswap V3 Factory."}
            </p>
            
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#6aa47727] bg-[#08150e] p-4">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Token symbol={robinhoodChain.token0Label} tone="#9bc8a6"/>
                    <span className="text-sm">{robinhoodChain.token0Label}</span>
                  </div>
                </div>
                <div className="text-xs text-[#5e7765]">
                  {hasTokens ? formatUnits(token0.balance, token0.decimals, 4) : "Balance unavailable"}
                </div>
                {hasTokens && (
                  <input 
                    type="number" 
                    placeholder="0.0" 
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    className="mt-3 w-full rounded-md border border-[#6aa47727] bg-[#040a07] px-3 py-2 text-sm text-white placeholder:text-[#5e7765] focus:border-[#5ee08a] focus:outline-none"
                  />
                )}
              </div>
              <div className="rounded-lg border border-[#6aa47727] bg-[#08150e] p-4">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Token symbol={robinhoodChain.token1Label} tone="#8db6d8"/>
                    <span className="text-sm">{robinhoodChain.token1Label}</span>
                  </div>
                </div>
                <div className="text-xs text-[#5e7765]">
                  {hasTokens ? formatUnits(token1.balance, token1.decimals, 4) : "Balance unavailable"}
                </div>
                {hasTokens && (
                  <input 
                    type="number" 
                    placeholder="0.0" 
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    className="mt-3 w-full rounded-md border border-[#6aa47727] bg-[#040a07] px-3 py-2 text-sm text-white placeholder:text-[#5e7765] focus:border-[#5ee08a] focus:outline-none"
                  />
                )}
              </div>
            </div>
            
            <button 
              onClick={onNext} 
              disabled={!connected || !onTargetNetwork || !amount0 || !amount1}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#5ee08a] py-3 text-sm font-semibold text-[#06100b] hover:bg-[#7aeda0] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to range <ArrowRight size={15}/>
            </button>
          </div>
          <Safety />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div style={{ background: card, borderColor: border }} className="rounded-xl border p-5">
            <h3 className="text-sm font-semibold">Set your price range</h3>
            <p className="mt-1 text-xs text-[#718a77]">Based on current tick: {currentTick ?? "Unavailable"}</p>
            
            <div className="mt-6 h-44 rounded-lg border border-[#6aa47720] bg-[#08150e] p-4 flex items-end justify-center overflow-hidden">
               <div className="w-full flex h-full items-end gap-1 px-4">
                 {[25,38,32,48,44,60,51,67,57,76,63,72,55,62,48,40,52,45,31,37,22].map((h,i) => (
                   <div key={i} style={{ height: `${h}%`, opacity: i > 5 && i < 15 ? 0.8 : 0.2 }} className="flex-1 rounded-t bg-[#5ee08a]" />
                 ))}
               </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-[#78917e]">Min tick offset</label>
                <input 
                  type="number"
                  value={lowerTickOffset}
                  onChange={(e) => setLowerTickOffset(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-[#6aa47727] bg-[#08150e] px-3 py-3 text-sm text-[#f2f7f3] focus:border-[#5ee08a] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#78917e]">Max tick offset</label>
                <input 
                  type="number"
                  value={upperTickOffset}
                  onChange={(e) => setUpperTickOffset(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-[#6aa47727] bg-[#08150e] px-3 py-3 text-sm text-[#f2f7f3] focus:border-[#5ee08a] focus:outline-none"
                />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button onClick={onBack} className="w-1/3 py-3 text-sm font-semibold text-[#8ea596] hover:text-[#f2f7f3]">Back</button>
              <button 
                onClick={onNext} 
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5ee08a] py-3 text-sm font-semibold text-[#06100b] hover:bg-[#7aeda0]"
              >
                Continue to review <ArrowRight size={15}/>
              </button>
            </div>
          </div>
          <Safety/>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div style={{ background: card, borderColor: border }} className="rounded-xl border p-5">
            <div className="flex items-center gap-2">
              <ClipboardList size={17} className="text-[#5ee08a]"/>
              <h3 className="text-sm font-semibold">Review and approve</h3>
            </div>
            
            <div className="mt-5 divide-y divide-[#6aa47718] text-sm">
              <div className="flex justify-between py-3"><span className="text-[#718a77]">Pair</span><span className="text-[#c6d8c9]">{robinhoodChain.token0Label} / {robinhoodChain.token1Label}</span></div>
              <div className="flex justify-between py-3"><span className="text-[#718a77]">Fee tier</span><span className="text-[#c6d8c9]">0.05%</span></div>
              <div className="flex justify-between py-3"><span className="text-[#718a77]">Tick range</span><span className="font-mono text-[#c6d8c9]">{currentTick ? `${currentTick + lowerTickOffset} to ${currentTick + upperTickOffset}` : "Unavailable"}</span></div>
              <div className="flex justify-between py-3"><span className="text-[#718a77]">Deposit</span><span className="text-[#c6d8c9]">{amount0 || "0"} {robinhoodChain.token0Label} & {amount1 || "0"} {robinhoodChain.token1Label}</span></div>
            </div>
            
            {!connected ? (
               <button onClick={() => void connect()} className="mt-5 w-full rounded-lg bg-[#345740] py-3 text-sm font-semibold text-[#718f78]">Connect wallet to continue</button>
            ) : (
               <button 
                 onClick={handleMint}
                 disabled={isSubmitting || !onTargetNetwork}
                 className="mt-5 flex w-full justify-center items-center gap-2 rounded-lg bg-[#5ee08a] py-3 text-sm font-semibold text-[#06100b] hover:bg-[#7aeda0] disabled:opacity-50"
               >
                 {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                 {isSubmitting ? "Approving & Minting..." : "Submit Transaction"}
               </button>
            )}
            <button onClick={onBack} className="mt-3 w-full py-2 text-xs text-[#8ea596] hover:text-[#cfe1d2]">Adjust range</button>
          </div>
          <Safety/>
        </div>
      )}
    </div>
  );
}