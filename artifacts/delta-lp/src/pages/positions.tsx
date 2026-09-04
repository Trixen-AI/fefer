import { ArrowRight, Bot, Gauge, Layers, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Wallet, Activity, Zap } from "lucide-react";
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            Workspace <span className="text-border">/</span> <span className="text-primary">Positions</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-glow">Liquidity Control</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg">
            Monitor Uniswap V3 ranges, observe uncollected fees, and configure keeper automation logic.
          </p>
        </div>
        <Link href="/create" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_15px_rgba(94,224,138,0.2)] transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(94,224,138,0.4)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
          <Plus size={16} /> New position
        </Link>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Wallet Balance",
            value: connected && onTargetNetwork && nativeBalance ? `${nativeBalance} ETH` : "—",
            subtitle: !connected ? "Wallet not connected" : wrongNetwork ? "Switch to Robinhood Chain" : "Native balance from chain",
            icon: Wallet,
            active: connected && onTargetNetwork
          },
          {
            title: "Active Positions",
            value: connected && onTargetNetwork && !isLoading ? String(totalCount) : "—",
            subtitle: !connected ? "No positions detected" : wrongNetwork ? "Wrong network" : isLoading ? "Reading NFTs..." : error ? "Read unavailable" : "From Uniswap V3 manager",
            icon: Layers,
            active: hasPositions
          },
          {
            title: "Keeper Coverage",
            value: "Standby",
            subtitle: "Not configured",
            icon: Bot,
            active: false
          }
        ].map(({ title, value, subtitle, icon: Icon, active }) => (
          <div key={title} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm transition-colors hover:bg-card/60">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative z-10 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {title}
              <Icon size={14} className={active ? "text-primary" : "text-muted-foreground/50"} />
            </div>
            <div className={`relative z-10 mt-4 text-3xl font-medium tracking-tight ${active ? "text-foreground" : "text-muted-foreground/50"}`}>
              {value}
            </div>
            <div className="relative z-10 mt-2 text-[10px] text-muted-foreground/70">{subtitle}</div>
          </div>
        ))}
      </div>

      {/* Disconnected / Preview State */}
      {!connected && (
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-2xl sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-30" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          
          <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                <Activity size={12} className="animate-pulse" /> Platform Preview
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-glow">
                Your liquidity, under a watchful keeper.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Connect your wallet to inspect your on-chain Uniswap V3 positions, track your live uncollected fees across pools, and define automated keeper boundaries.
              </p>
              
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button 
                  onClick={() => void connect()}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:bg-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
                >
                  <Wallet size={16} /> Connect to access
                </button>
                <Link href="/create" className="inline-flex items-center justify-center gap-2 rounded-md border border-border/50 bg-card/50 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground">
                  Explore creation <ArrowRight size={14} />
                </Link>
              </div>
              <p className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                <ShieldCheck size={12} /> Non-custodial &bull; Execute via your wallet
              </p>
            </div>
            
            {/* Mock Position Card showing what it looks like */}
            <div className="w-full max-w-sm shrink-0 rotate-1 transform opacity-60 transition-all duration-700 hover:rotate-0 hover:opacity-100 lg:ml-auto">
              <div className="relative rounded-xl border border-primary/20 bg-[#06100b] p-5 shadow-[0_0_40px_rgba(94,224,138,0.1)]">
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
                <div className="flex items-start justify-between">
                  <div>
                     <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Example Position</p>
                     <h3 className="mt-1 font-mono text-base font-bold text-foreground">#—</h3>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                    <span className="h-1 w-1 rounded-full bg-primary animate-pulse" /> Active
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3 border-b border-border/50 pb-6">
                  <div className="flex -space-x-2">
                    <Token symbol={robinhoodChain.token0Label} tone="#9bc8a6" />
                    <Token symbol={robinhoodChain.token1Label} tone="#8db6d8" />
                  </div>
                  <div className="font-mono text-xs font-medium text-foreground">
                    {robinhoodChain.token0Label} / {robinhoodChain.token1Label}
                  </div>
                </div>
                <div className="mt-4">
                   <div className="mb-2 flex justify-between text-[10px]">
                     <span className="font-medium text-muted-foreground">Current range</span>
                     <span className="flex items-center gap-1.5 font-semibold text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,224,138,0.8)]" /> In range</span>
                   </div>
                   <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-inset ring-border/50">
                      <div className="absolute bottom-0 left-1/4 right-1/4 top-0 rounded-full bg-primary/20" />
                      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_rgba(94,224,138,1)]" />
                   </div>
                   <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground/70">
                     <span>Min tick</span>
                     <span>Max tick</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connected but no positions on network */}
      {connected && onTargetNetwork && !hasPositions && !isLoading && !error && (
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-border/50 bg-card p-6 sm:p-10">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Gauge size={24} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">No active liquidity</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't find any Uniswap V3 position NFTs in your wallet on {robinhoodChain.chainName}.
            </p>
            <Link href="/create" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
              <Plus size={16} /> Deploy concentrated liquidity
            </Link>
          </div>
        </div>
      )}

      {/* Earnings Section (Only when connected, even if 0) */}
      {connected && onTargetNetwork && hasPositions && (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-card p-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] sm:p-6">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Zap size={16} className="text-primary" /> Live Earnings
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Unclaimed on-chain fees across all tracked positions.</p>
              </div>
              <button
                data-testid="button-collect-all"
                onClick={() => void handleCollectAll()}
                disabled={isCollecting || (!hasEarnings && totalCount === positions.length)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary/10 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20 transition-all hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div key={tokenAddr} data-testid={`card-earnings-${tokenAddr}`} className="flex items-center gap-4 rounded-lg border border-border/50 bg-black/30 p-4">
                      <Token symbol={symbol} tone="#9bc8a6" />
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" data-testid={`text-earnings-symbol-${tokenAddr}`}>{symbol}</div>
                        <div className="mt-1 font-mono text-xl font-medium tracking-tight text-foreground" data-testid={`text-earnings-amount-${tokenAddr}`}>{formatted}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                data-testid="status-no-unclaimed-fees"
                className="mt-6 rounded-lg border border-dashed border-border/50 bg-black/20 p-5 text-center text-xs text-muted-foreground"
              >
                {totalCount > positions.length
                  ? "No fees are visible in the first 100 positions. Collect All will scan the remaining wallet positions."
                  : "No unclaimed fees are currently reported by the position manager."}
              </div>
            )}
            {actionStatus && <p className="mt-4 flex items-center gap-2 text-xs text-primary/80">{isCollecting && <RefreshCw size={12} className="animate-spin" />} {actionStatus}</p>}
            {actionError && <p className="mt-4 text-xs text-destructive-foreground">{actionError}</p>}
          </div>
        </section>
      )}

      {/* Positions List */}
      {connected && onTargetNetwork && (
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">On-chain positions</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Read directly from the official Uniswap V3 Position Manager.
              </p>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-md border border-border/50 bg-card/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin text-primary" : ""} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {!error && isLoading && !hasPositions && (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => (
                <div key={i} className="h-48 animate-pulse rounded-xl border border-border/30 bg-card/20" />
              ))}
            </div>
          )}

          {!error && !isLoading && hasPositions && (
            <div className="grid gap-4 md:grid-cols-2">
              {positions.map((position) => (
                <Link
                  key={position.tokenId}
                  href={`/positions/${position.tokenId}`}
                  data-testid={`link-position-${position.tokenId}`}
                  className="group relative flex flex-col rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-md transition-all hover:border-primary/40 hover:bg-card/60 hover:shadow-[0_0_25px_rgba(94,224,138,0.06)] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-primary/70">
                        Position NFT
                      </p>
                      <h3 className="mt-1 font-mono text-lg font-bold text-foreground">#{position.tokenId}</h3>
                    </div>
                    <StatusPill green={BigInt(position.liquidity) > 0n}>
                      {BigInt(position.liquidity) > 0n ? "Active liquidity" : "No liquidity"}
                    </StatusPill>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Token symbol={tokenLabel(position.token0)} tone="#9bc8a6" />
                      <Token symbol={tokenLabel(position.token1)} tone="#8db6d8" />
                    </div>
                    <div className="min-w-0 font-mono text-xs font-medium text-foreground/90">
                      {shortenAddress(position.token0)} / {shortenAddress(position.token1)}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border/40 pt-4">
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between text-[10px]">
                        <span className="font-medium text-muted-foreground">Current range</span>
                        {currentTick !== null && supportsLiveRange(position) ? (
                          currentTick >= position.tickLower && currentTick <= position.tickUpper ? (
                            <span data-testid={`status-range-${position.tokenId}`} className="flex items-center gap-1.5 font-semibold text-primary">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,224,138,0.8)] animate-pulse" />
                              In range
                            </span>
                          ) : (
                            <span data-testid={`status-range-${position.tokenId}`} className="flex items-center gap-1.5 font-semibold text-destructive-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground" />
                              Out of range
                            </span>
                          )
                        ) : (
                          <span data-testid={`status-range-${position.tokenId}`} className="font-medium text-muted-foreground">Unavailable</span>
                        )}
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-inset ring-border/50">
                        <div className="absolute inset-y-0 left-1/4 right-1/4 rounded-full bg-primary/20" />
                        {currentTick !== null && supportsLiveRange(position) && (
                          <div 
                            data-testid={`indicator-tick-${position.tokenId}`}
                            className={`absolute top-1/2 -mt-[3px] h-2 w-2 rounded-full transition-all duration-500 ${currentTick >= position.tickLower && currentTick <= position.tickUpper ? "bg-primary shadow-[0_0_10px_rgba(94,224,138,1)]" : "bg-muted-foreground"}`}
                            style={{ 
                              left: currentTick < position.tickLower 
                                ? "10%" 
                                : currentTick > position.tickUpper 
                                  ? "90%" 
                                  : `${25 + ((currentTick - position.tickLower) / Math.max(1, position.tickUpper - position.tickLower)) * 50}%` 
                            }}
                          />
                        )}
                      </div>
                      <div className="mt-2 flex justify-between text-[9px] font-mono font-medium text-muted-foreground/60">
                        <span>{position.tickLower}</span>
                        <span>{position.tickUpper}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-black/20 p-3">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Fee tier</p>
                        <p className="mt-1 font-mono text-xs font-medium text-foreground/90">{formatFee(position.fee)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Liquidity</p>
                        <p className="mt-1 font-mono text-xs font-medium text-foreground/90">
                          {formatLiquidity(position.liquidity)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!error && !isLoading && totalCount > positions.length && (
            <div className="mt-6 rounded-lg border border-dashed border-border/50 p-4 text-center text-[11px] font-medium text-muted-foreground">
              Showing the first {positions.length} of {totalCount} position NFTs.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
