import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardList, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useUniswapPool } from "@/hooks/use-uniswap-pool";
import { formatUnits, parseUnits, shortenAddress } from "@/lib/ethereum";
import { Safety, StatusPill, Token } from "@/components/ui/shared";
import { robinhoodChain } from "@/config/network";

const MIN_TICK = -887_270;
const MAX_TICK = 887_270;

function tryParseUnits(value: string, decimals: number) {
  try {
    return parseUnits(value, decimals);
  } catch {
    return 0n;
  }
}

function isValidTick(value: string) {
  const parsed = Number(value);
  return (
    Number.isInteger(parsed) &&
    parsed % 10 === 0 &&
    parsed >= MIN_TICK &&
    parsed <= MAX_TICK
  );
}

export default function CreateLP() {
  const [step, setStep] = useState(1);
  const [amount0Input, setAmount0Input] = useState("");
  const [amount1Input, setAmount1Input] = useState("");
  const [tickLowerInput, setTickLowerInput] = useState("-100");
  const [tickUpperInput, setTickUpperInput] = useState("100");
  const [activeApproval, setActiveApproval] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const { connected, onTargetNetwork, wrongNetwork } = useWallet();
  const {
    poolAddress,
    tokens,
    currentTick,
    isLoading,
    isSubmitting,
    error,
    txHash,
    approve,
    mint,
  } = useUniswapPool();

  const token0 = tokens[0];
  const token1 = tokens[1];
  const amount0 = token0 ? tryParseUnits(amount0Input, token0.decimals) : 0n;
  const amount1 = token1 ? tryParseUnits(amount1Input, token1.decimals) : 0n;
  const tickLower = Number(tickLowerInput);
  const tickUpper = Number(tickUpperInput);
  const rangeValid =
    isValidTick(tickLowerInput) &&
    isValidTick(tickUpperInput) &&
    tickLower < tickUpper;
  const amountsValid = amount0 > 0n && amount1 > 0n;
  const balancesValid =
    Boolean(token0 && token1) &&
    amount0 <= (token0?.balance ?? 0n) &&
    amount1 <= (token1?.balance ?? 0n);
  const inputsValid = rangeValid && amountsValid && balancesValid;
  const approvalsReady =
    Boolean(token0 && token1) &&
    amount0 > 0n &&
    amount1 > 0n &&
    (token0?.allowance ?? 0n) >= amount0 &&
    (token1?.allowance ?? 0n) >= amount1;

  const poolState = useMemo(() => {
    if (!connected) return "Connect wallet to read the pool.";
    if (!onTargetNetwork || wrongNetwork) return "Switch to Robinhood Chain.";
    if (isLoading) return "Reading WETH / USDG pool…";
    if (error) return "Pool read failed.";
    if (!poolAddress) return "No 0.05% pool found for this pair.";
    return `Pool ${shortenAddress(poolAddress)}`;
  }, [connected, error, isLoading, onTargetNetwork, poolAddress, wrongNetwork]);

  const handleApprove = async (token: NonNullable<typeof token0>) => {
    setActiveApproval(token.address);
    setActionMessage(null);
    try {
      const requiredAmount = token.address === token0?.address ? amount0 : amount1;
      const hash = await approve(token, requiredAmount);
      setActionMessage(`Approval confirmed: ${shortenAddress(hash)}`);
    } catch {
      setActionMessage(null);
    } finally {
      setActiveApproval(null);
    }
  };

  const handleMint = async () => {
    if (!inputsValid) return;
    setActionMessage(null);
    try {
      const hash = await mint({
        amount0: amount0Input,
        amount1: amount1Input,
        tickLower,
        tickUpper,
        slippageBps: 50,
      });
      setActionMessage(`Position mint confirmed: ${shortenAddress(hash)}`);
    } catch {
      setActionMessage(null);
    }
  };

  return (
    <div className="liqora-rise max-w-4xl">
      <Link href="/" className="mb-7 inline-flex items-center gap-2 rounded text-xs text-[#7c967f] hover:text-[#c9ddcc] focus:outline-none focus:ring-1 focus:ring-primary">
        <ArrowLeft size={15} /> Back to positions
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#688471]">Position builder</p>
          <h1 className="text-3xl font-semibold tracking-[-.04em]">Create LP</h1>
          <p className="mt-2 text-sm text-[#819989]">Set the range. Approve the tokens. Review before minting.</p>
        </div>
        <span className="text-xs text-[#6f8975]">Step {step} of 3</span>
      </div>

      <div className="mb-8 flex gap-2">
        {[["01", "Pair"], ["02", "Range"], ["03", "Review"]].map(([number, label], index) => (
          <div key={number} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${step > index ? "bg-primary text-primary-foreground" : "border border-[#5ee08a33] text-[#8ea596]"}`}>
              {step > index + 1 ? <Check size={13} /> : number}
            </div>
            <span className="hidden text-xs text-[#8ea596] sm:block">{label}</span>
            {index < 2 && <div className="h-px flex-1 bg-[#6aa47722]" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div className="card-gradient rounded-xl border p-5">
            <h3 className="text-sm font-semibold">Choose token pair</h3>
            <p className="mt-1 text-xs text-[#718a77]">
              The pair and pool are read from the verified Robinhood Chain deployment.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[token0, token1].map((token, index) => {
                const fallbackAddress =
                  index === 0
                    ? robinhoodChain.token0Address
                    : robinhoodChain.token1Address;
                const label = token?.symbol ?? (index === 0 ? "WETH" : "USDG");
                const address = token?.address ?? fallbackAddress;
                return (
                  <div key={address || index} className="rounded-lg border border-[#6aa47727] bg-[#08150e] p-4 text-left">
                    <div className="mb-4 flex items-center gap-2">
                      <Token symbol={label} tone={index === 0 ? "#9bc8a6" : "#8db6d8"} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <div className="text-xs text-[#8ba38f]">
                      {token
                        ? `${formatUnits(token.balance, token.decimals)} available`
                        : !connected
                          ? "Connect wallet to read balance"
                          : isLoading
                            ? "Reading token…"
                            : "Token data unavailable"}
                    </div>
                    <a
                      href={`${robinhoodChain.explorerUrl}/address/${address}`}
                      target="_blank"
                      rel="noreferrer"
                      title={address}
                      className="mt-3 block truncate font-mono text-[10px] text-[#78c98b] underline decoration-[#78c98b55] underline-offset-2"
                    >
                      Contract {shortenAddress(address)}
                    </a>
                  </div>
                );
              })}
            </div>

            <label className="mt-5 block text-xs text-[#8ea596]">Fee tier</label>
            <button disabled className="mt-2 flex w-full cursor-not-allowed items-center justify-between rounded-lg border border-[#6aa47727] bg-[#08150e] p-3 text-sm text-[#c7d9ca] opacity-90">
              <span>0.05% <span className="ml-2 text-xs text-[#647d6b]">Tick spacing 10</span></span>
              <ChevronDown size={15} />
            </button>

            <div className={`mt-4 rounded-lg border p-3 text-xs ${poolAddress ? "border-[#5ee08a2c] bg-[#5ee08a08] text-[#9dccaa]" : "border-[#c99a5738] bg-[#c99a570b] text-[#b69a6b]"}`}>
              <div className="flex items-center gap-2">
                {isLoading && <Loader2 size={13} className="animate-spin" />}
                {poolState}
              </div>
              {poolAddress && <a className="mt-2 inline-flex items-center gap-1 text-[11px] underline underline-offset-2" href={`https://robinhoodchain.blockscout.com/address/${poolAddress}`} target="_blank" rel="noreferrer">View pool <ExternalLink size={11} /></a>}
            </div>

            {error && <p className="mt-3 text-xs text-[#e1aa9d]">{error}</p>}

            <button
              onClick={() => setStep(2)}
              disabled={!connected || !onTargetNetwork || !poolAddress || isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#7aeda0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ArrowRight size={15} />
            </button>
          </div>
          <Safety />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div className="card-gradient rounded-xl border p-5">
            <h3 className="text-sm font-semibold">Set deposits and price range</h3>
            <p className="mt-1 text-xs text-[#718a77]">
              Tick values must be aligned to the 0.05% pool spacing of 10.
              {currentTick !== null && ` Current pool tick: ${currentTick}.`}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[{
                label: token0?.symbol ?? "WETH",
                value: amount0Input,
                setValue: setAmount0Input,
                balance: token0 ? formatUnits(token0.balance, token0.decimals) : "—",
              }, {
                label: token1?.symbol ?? "USDG",
                value: amount1Input,
                setValue: setAmount1Input,
                balance: token1 ? formatUnits(token1.balance, token1.decimals) : "—",
              }].map((asset) => (
                <label key={asset.label} className="text-[11px] text-[#78917e]">
                  Deposit {asset.label}
                  <input
                    inputMode="decimal"
                    value={asset.value}
                    onChange={(event) => asset.setValue(event.target.value)}
                    placeholder="0.00"
                    className="mt-2 w-full rounded-lg border border-[#6aa47727] bg-[#08150e] px-3 py-3 text-sm text-[#d7e8d9] outline-none placeholder:text-[#4f6956] focus:border-primary"
                  />
                  <span className="mt-1 block text-[10px] text-[#5e7765]">Available: {asset.balance}</span>
                </label>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-[11px] text-[#78917e]">
                Lower tick
                <input
                  inputMode="numeric"
                  value={tickLowerInput}
                  onChange={(event) => setTickLowerInput(event.target.value)}
                  className={`mt-2 w-full rounded-lg border bg-[#08150e] px-3 py-3 text-sm text-[#d7e8d9] outline-none ${isValidTick(tickLowerInput) ? "border-[#6aa47727] focus:border-primary" : "border-[#9a5b50]"} `}
                />
              </label>
              <label className="text-[11px] text-[#78917e]">
                Upper tick
                <input
                  inputMode="numeric"
                  value={tickUpperInput}
                  onChange={(event) => setTickUpperInput(event.target.value)}
                  className={`mt-2 w-full rounded-lg border bg-[#08150e] px-3 py-3 text-sm text-[#d7e8d9] outline-none ${isValidTick(tickUpperInput) ? "border-[#6aa47727] focus:border-primary" : "border-[#9a5b50]"}`}
                />
              </label>
            </div>

            {!rangeValid && <p className="mt-3 text-xs text-[#e1aa9d]">Use ticks between {MIN_TICK} and {MAX_TICK}, divisible by 10, with lower below upper.</p>}
            {rangeValid && !amountsValid && <p className="mt-3 text-xs text-[#e1aa9d]">Enter a positive deposit for both tokens.</p>}
            {amountsValid && !balancesValid && <p className="mt-3 text-xs text-[#e1aa9d]">Deposit cannot exceed the connected wallet balance.</p>}

            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="flex items-center justify-center rounded-lg border border-[#6aa47727] px-4 py-3 text-sm font-semibold text-[#8ea596] transition-colors hover:bg-[#08150e] hover:text-[#c9ddcc]">Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!inputsValid}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#7aeda0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to review <ArrowRight size={15} />
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
              <ClipboardList size={17} className="text-primary" />
              <h3 className="text-sm font-semibold">Approve and mint</h3>
            </div>

            <div className="mt-5 divide-y divide-[#6aa47718] text-sm">
              {[
                ["Pair", `${token0?.symbol ?? "WETH"} / ${token1?.symbol ?? "USDG"}`],
                ["Pool", poolAddress ? shortenAddress(poolAddress) : "Unavailable"],
                ["Fee tier", "0.05%"],
                ["Tick range", `${tickLower} → ${tickUpper}`],
                ["Deposit", `${amount0Input || "0"} ${token0?.symbol ?? "WETH"} + ${amount1Input || "0"} ${token1?.symbol ?? "USDG"}`],
                ["Slippage", "0.50%"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-3">
                  <span className="text-[#718a77]">{label}</span>
                  <span className="text-right text-[#c6d8c9]">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {[token0, token1].map((token) => token && (
                <div key={token.address} className="flex items-center justify-between rounded-lg border border-[#6aa4771c] bg-[#08150e] p-3">
                  <div>
                    <p className="text-xs text-[#c7d9ca]">{token.symbol} allowance</p>
                    <p className="mt-1 text-[10px] text-[#718a77]">{formatUnits(token.allowance, token.decimals)} approved</p>
                  </div>
                  {(token.allowance >= (token === token0 ? amount0 : amount1)) && (token === token0 ? amount0 : amount1) > 0n ? (
                    <StatusPill green><span className="inline-flex items-center gap-1"><Check size={11} /> Ready</span></StatusPill>
                  ) : (
                    <button
                      onClick={() => void handleApprove(token)}
                      disabled={isSubmitting || activeApproval !== null}
                      className="rounded-md bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground transition hover:bg-[#7aeda0] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {activeApproval === token.address ? "Approving…" : `Approve ${token.symbol}`}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="mt-4 text-xs text-[#e1aa9d]">{error}</p>}
            {actionMessage && <p className="mt-4 break-all text-xs text-[#9dccaa]">{actionMessage}</p>}

            <button
              onClick={() => void handleMint()}
              disabled={!inputsValid || !approvalsReady || isSubmitting}
              className="mt-5 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-[#7aeda0] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? "Waiting for wallet…" : approvalsReady ? "Create LP position" : "Approve both tokens to continue"}
            </button>
            {txHash && <a href={`https://robinhoodchain.blockscout.com/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 text-xs text-[#8ea596] underline underline-offset-2">View latest transaction <ExternalLink size={12} /></a>}

            <button onClick={() => setStep(2)} className="mt-3 w-full rounded py-2 text-xs text-[#8ea596] hover:text-[#cfe1d2]">Adjust range or deposit</button>
          </div>
          <Safety />
        </div>
      )}
    </div>
  );
}