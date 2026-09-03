import { ArrowRight, Bot, Gauge, Plus, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useLiquidityPositions } from "@/hooks/use-liquidity-positions";
import { shortenAddress } from "@/lib/ethereum";
import { StatusPill, Token } from "@/components/ui/shared";

function formatFee(fee: number) {
  return `${fee / 10_000}%`;
}

function formatLiquidity(liquidity: string) {
  const value = BigInt(liquidity);
  if (value === 0n) return "0";
  const text = value.toString();
  return text.length > 12 ? `${text.slice(0, 6)}…${text.slice(-4)}` : text;
}

export default function Positions() {
  const { connected, nativeBalance, onTargetNetwork, wrongNetwork } = useWallet();
  const { positions, totalCount, isLoading, error, refresh } = useLiquidityPositions();
  const hasPositions = positions.length > 0;

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
          ["Wallet balance", connected && onTargetNetwork && nativeBalance ? `${nativeBalance} ETH` : "—", !connected ? "Wallet not connected" : wrongNetwork ? "Switch to Robinhood Chain" : "Native balance from chain"],
          ["Active positions", connected && onTargetNetwork && !isLoading ? String(totalCount) : "—", !connected ? "No positions detected" : wrongNetwork ? "Wrong network" : isLoading ? "Reading position NFTs..." : error ? "Read unavailable" : "From Uniswap V3 manager"],
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

      {connected && onTargetNetwork && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#dbe9dd]">On-chain positions</h2>
              <p className="mt-1 text-[11px] text-[#6f8975]">
                Read directly from the official Uniswap V3 Position Manager.
              </p>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg border border-[#6aa47727] px-3 py-2 text-xs text-[#9eb2a2] transition hover:border-[#5ee08a55] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-[#9a5b5038] bg-[#3a211c66] p-4 text-xs text-[#e1aa9d]">
              {error}
            </div>
          )}

          {!error && isLoading && (
            <div className="card-gradient rounded-xl border p-5 text-sm text-[#819989]">
              Reading position NFTs from Robinhood Chain…
            </div>
          )}

          {!error && !isLoading && hasPositions && (
            <div className="grid gap-3 md:grid-cols-2">
              {positions.map((position) => (
                <Link
                  key={position.tokenId}
                  href={`/positions/${position.tokenId}`}
                  className="card-gradient rounded-xl border p-5 transition hover:border-[#5ee08a55] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[.16em] text-[#66816e]">
                        Position NFT
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">#{position.tokenId}</h3>
                    </div>
                    <StatusPill green={BigInt(position.liquidity) > 0n}>
                      {BigInt(position.liquidity) > 0n ? "Active liquidity" : "No liquidity"}
                    </StatusPill>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Token symbol="0" tone="#9bc8a6" />
                      <Token symbol="1" tone="#8db6d8" />
                    </div>
                    <div className="min-w-0 font-mono text-xs text-[#b7cbb9]">
                      {shortenAddress(position.token0)} / {shortenAddress(position.token1)}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#6aa47718] pt-4">
                    <div>
                      <p className="text-[10px] text-[#607a67]">Fee tier</p>
                      <p className="mt-1 text-xs text-[#c3d4c5]">{formatFee(position.fee)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#607a67]">Tick range</p>
                      <p className="mt-1 text-xs text-[#c3d4c5]">
                        {position.tickLower} → {position.tickUpper}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#607a67]">Liquidity</p>
                      <p className="mt-1 font-mono text-xs text-[#c3d4c5]">
                        {formatLiquidity(position.liquidity)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!error && !isLoading && totalCount > positions.length && (
            <p className="mt-3 text-[11px] text-[#78917e]">
              Showing the first {positions.length} of {totalCount} position NFTs.
            </p>
          )}
        </section>
      )}

      {!hasPositions && !isLoading && !error && (
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
              {!connected ? "Connect a wallet to inspect your positions, or start by defining a concentrated-liquidity range." : !onTargetNetwork ? "Switch your wallet to Robinhood Chain to inspect your positions." : "You have no active liquidity positions. Start by defining a concentrated-liquidity range."}
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
      )}
    </>
  );
}
