import { ArrowRight, Bot, Gauge, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Activity, Zap } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import {
  useLiquidityPositions,
  type LiquidityPosition,
} from "@/hooks/use-liquidity-positions";
import { useUniswapPool } from "@/hooks/use-uniswap-pool";
import { usePositionActions } from "@/hooks/use-position-actions";
import { shortenAddress, formatUnits } from "@/lib/ethereum";
import { StatusPill, Token } from "@/components/ui/shared";
import { robinhoodChain } from "@/config/network";

function formatFee(fee: number) {
  return `${fee / 10_000}%`;
}

function formatLiquidity(liquidity: string) {
  const value = BigInt(liquidity);
  if (value === 0n) return "0";
  const text = value.toString();
  return text.length > 12 ? `${text.slice(0, 6)}…${text.slice(-4)}` : text;
}

function tokenLabel(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === robinhoodChain.token0Address.toLowerCase()) return robinhoodChain.token0Label;
  if (normalized === robinhoodChain.token1Address.toLowerCase()) return robinhoodChain.token1Label;
  return "TOKEN";
}

function supportsLiveRange(position: LiquidityPosition) {
  const positionTokens = [position.token0, position.token1]
    .map((address) => address.toLowerCase())
    .sort();
  const configuredTokens = [
    robinhoodChain.token0Address,
    robinhoodChain.token1Address,
  ]
    .map((address) => address.toLowerCase())
    .sort();

  return (
    position.fee === 500 &&
    positionTokens[0] === configuredTokens[0] &&
    positionTokens[1] === configuredTokens[1]
  );
}

export default function Positions() {
  const { connected, nativeBalance, onTargetNetwork, wrongNetwork, connect } = useWallet();
  const { positions, totalCount, isLoading, error, refresh } = useLiquidityPositions();
  const { tokens, currentTick } = useUniswapPool();
  const { collectAll, isSubmitting: isCollecting, status: actionStatus, error: actionError } = usePositionActions();
  const hasPositions = positions.length > 0;

  const earnings = positions.reduce((acc, pos) => {
    const t0 = pos.token0.toLowerCase();
    const t1 = pos.token1.toLowerCase();
    acc[t0] = (acc[t0] || 0n) + BigInt(pos.tokensOwed0);
    acc[t1] = (acc[t1] || 0n) + BigInt(pos.tokensOwed1);
    return acc;
  }, {} as Record<string, bigint>);

  const hasEarnings = Object.values(earnings).some(v => v > 0n);
  const handleCollectAll = async () => {
    try {
      await collectAll();
    } catch {
      // Error is handled by actionError
    } finally {
      await refresh();
    }
  };

  const border = "rgba(100,180,120,.16)";
  const card = "linear-gradient(145deg, #102719 0%, #0b1a11 100%)";

  return (
    <div className="delta-rise">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#688471]">
            Workspace <span className="text-[#3e5a46]">/</span> Positions
          </div>
          <h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Positions</h1>
          <p className="mt-2 text-sm text-[#819989]">
            Monitor ranges and define your exit logic.
          </p>
        </div>
        <Link href="/create" className="hidden items-center gap-2 rounded-lg border border-[#5ee08a38] px-3 py-2 text-xs font-semibold text-[#b8e8c1] hover:bg-[#5ee08a0d] sm:flex">
          <Plus size={15} /> New position
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "Wallet Balance",
            value: connected && onTargetNetwork && nativeBalance ? `${nativeBalance} ETH` : "—",
            subtitle: !connected ? "Wallet not connected" : wrongNetwork ? "Switch to target network" : "Native balance",
            icon: SlidersHorizontal
          },
          {
            title: "Active positions",
            value: connected && onTargetNetwork && !isLoading ? String(totalCount) : "—",
            subtitle: !connected ? "No positions detected" : wrongNetwork ? "Wrong network" : isLoading ? "Reading NFTs..." : error ? "Read unavailable" : "From Uniswap V3 manager",
            icon: SlidersHorizontal
          },
          {
            title: "Keeper coverage",
            value: "—",
            subtitle: "Not configured",
            icon: Bot
          }
        ].map(({ title, value, subtitle, icon: Icon }) => (
          <div key={title} style={{ background: card, borderColor: border }} className="rounded-xl border p-4">
            <div className="flex items-center justify-between text-[11px] text-[#74907d]">
              {title}<span className="text-[#55705d]"><Icon size={14}/></span>
            </div>
            <div className="mt-3 text-2xl font-medium tracking-tight text-[#e3eee5]">{value}</div>
            <div className="mt-1 text-[10px] text-[#647d6b]">{subtitle}</div>
          </div>
        ))}
      </div>

      {/* Empty / Disconnected State */}
      {(!connected || (onTargetNetwork && !hasPositions && !isLoading && !error)) && (
        <div className="animate-in fade-in duration-500 mt-8">
          <div style={{ background: "radial-gradient(circle at 75% 0%, rgba(57,135,78,.15), transparent 42%), #0b1a11", borderColor: border }} className="relative overflow-hidden rounded-2xl border p-6 sm:p-10">
            <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border border-[#5ee08a18]" />
            <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-[#5ee08a12]" />
            <div className="relative max-w-xl">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#5ee08a14] text-[#5ee08a]"><Gauge size={21} /></div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.19em] text-[#6f9b79]">Positions overview</p>
              <h2 className="text-2xl font-semibold tracking-[-.03em] text-[#f2f7f3] sm:text-3xl">
                {!connected ? "Your liquidity, under a watchful keeper." : "No active liquidity found."}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-[#8ea596]">
                {!connected 
                  ? "Connect a wallet to inspect your positions, or start by defining a concentrated-liquidity range."
                  : `We couldn't find any Uniswap V3 position NFTs in your wallet on ${robinhoodChain.chainName}.`}
              </p>
              
              {!connected ? (
                <button 
                  onClick={() => void connect()} 
                  className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#5ee08a] px-4 py-2.5 text-sm font-semibold text-[#06100b] transition hover:bg-[#7aeda0]"
                >
                  Connect wallet to view <ArrowRight size={15} />
                </button>
              ) : (
                <Link 
                  href="/create" 
                  className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#5ee08a] px-4 py-2.5 text-sm font-semibold text-[#06100b] transition hover:bg-[#7aeda0]"
                >
                  <Plus size={16} /> Deploy concentrated liquidity <ArrowRight size={15} />
                </Link>
              )}
              <p className="mt-4 flex items-center gap-2 text-[11px] text-[#637c6b]"><ShieldCheck size={14} /> Non-custodial operations.</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Earnings */}
      {connected && onTargetNetwork && hasPositions && (
        <section className="mb-8 animate-in fade-in duration-500 mt-8">
          <div style={{ background: card, borderColor: border }} className="relative overflow-hidden rounded-xl border p-5 sm:p-6">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#5ee08a08] to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[#e3eee5]">
                  <Zap size={16} className="text-[#5ee08a]" /> Live Earnings
                </h2>
                <p className="mt-1 text-xs text-[#819989]">Unclaimed on-chain fees across all tracked positions.</p>
              </div>
              <button
                onClick={() => void handleCollectAll()}
                disabled={isCollecting || (!hasEarnings && totalCount === positions.length)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#5ee08a38] bg-[#5ee08a10] px-4 py-2 text-xs font-semibold text-[#b8e8c1] transition-all hover:bg-[#5ee08a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCollecting ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                {isCollecting ? "Collecting..." : "Collect all fees"}
              </button>
            </div>
            
            {hasEarnings ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {Object.entries(earnings).filter(([, val]) => val > 0n).map(([tokenAddr, amount]) => {
                  const tInfo = tokens.find(t => t.address.toLowerCase() === tokenAddr);
                  const decimals = tInfo?.decimals ?? 18;
                  const symbol = tInfo?.symbol ?? tokenLabel(tokenAddr);
                  const formatted = tInfo ? formatUnits(amount, decimals, 6) : amount.toString() + " (Raw)";
                  return (
                    <div key={tokenAddr} className="flex items-center gap-4 rounded-lg border border-[#6aa47718] bg-[#08150e] p-4">
                      <Token symbol={symbol} tone="#9bc8a6" />
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#74907d]">{symbol}</div>
                        <div className="mt-1 font-mono text-xl font-medium tracking-tight text-[#e3eee5]">{formatted}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-[#6aa47730] bg-[#08150e] p-5 text-center text-xs text-[#74907d]">
                {totalCount > positions.length
                  ? "No fees visible in first 100 positions. Collect All will scan remaining."
                  : "No unclaimed fees are currently reported by the position manager."}
              </div>
            )}
            {actionStatus && <p className="mt-4 flex items-center gap-2 text-xs text-[#5ee08a]">{isCollecting && <RefreshCw size={12} className="animate-spin" />} {actionStatus}</p>}
            {actionError && <p className="mt-4 text-xs text-[#d9a4a4]">{actionError}</p>}
          </div>
        </section>
      )}

      {/* Positions List */}
      {connected && onTargetNetwork && (
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between border-b border-[#6aa47718] pb-4">
            <div>
              <h2 className="text-sm font-bold text-[#e3eee5]">On-chain positions</h2>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md border border-[#6aa47727] bg-[#0d2115] px-3 py-1.5 text-[11px] font-medium text-[#a9bdad] transition hover:border-[#5ee08a55] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin text-[#5ee08a]" : ""} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-[#9a5b5038] bg-[#3a211c66] p-4 text-xs text-[#e1aa9d]">
              {error}
            </div>
          )}

          {!error && isLoading && !hasPositions && (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => (
                <div key={i} className="h-48 animate-pulse rounded-xl border border-[#6aa47718] bg-[#08150e]" />
              ))}
            </div>
          )}

          {!error && !isLoading && hasPositions && (
            <div className="grid gap-4 md:grid-cols-2">
              {positions.map((position) => (
                <Link
                  key={position.tokenId}
                  href={`/positions/${position.tokenId}`}
                  style={{ background: card, borderColor: border }}
                  className="group relative flex flex-col rounded-xl border p-5 transition-all hover:border-[#5ee08a55] focus:outline-none focus:ring-2 focus:ring-[#5ee08a]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <Token symbol={tokenLabel(position.token0)} tone="#9bc8a6" />
                        <Token symbol={tokenLabel(position.token1)} tone="#8db6d8" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#f2f7f3]">
                          {shortenAddress(position.token0)} / {shortenAddress(position.token1)}
                        </div>
                        <div className="mt-1 text-[11px] text-[#718b77]">
                          #{position.tokenId} · fee tier {formatFee(position.fee)}
                        </div>
                      </div>
                    </div>
                    <StatusPill green={BigInt(position.liquidity) > 0n}>
                      {BigInt(position.liquidity) > 0n ? "Active" : "Empty"}
                    </StatusPill>
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#647d6b]">Range</p>
                      {currentTick !== null && supportsLiveRange(position) ? (
                        currentTick >= position.tickLower && currentTick <= position.tickUpper ? (
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-[#5ee08a]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5ee08a] shadow-[0_0_8px_rgba(94,224,138,0.8)] animate-pulse" />
                            In range
                          </p>
                        ) : (
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-[#d9a4a4]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#d9a4a4]" />
                            Out of range
                          </p>
                        )
                      ) : (
                        <p className="mt-2 text-sm text-[#d3e2d5]">Unavailable</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#647d6b]">Liquidity</p>
                      <p className="mt-2 text-sm text-[#d3e2d5] font-mono">
                        {formatLiquidity(position.liquidity)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#647d6b]">Automation</p>
                      <p className="mt-2 text-sm text-[#d3e2d5]">Not configured</p>
                    </div>
                    <div className="flex items-end justify-end">
                      <span className="text-xs text-[#8dd99f] group-hover:text-[#5ee08a]">
                        Details <ArrowRight size={14} className="ml-1 inline"/>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!error && !isLoading && totalCount > positions.length && (
            <div className="mt-6 rounded-lg border border-dashed border-[#6aa47720] p-4 text-center text-[11px] font-medium text-[#74907d]">
              Showing the first {positions.length} of {totalCount} position NFTs.
            </div>
          )}
        </section>
      )}
    </div>
  );
}