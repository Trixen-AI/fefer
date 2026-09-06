import {
  ArrowRight,
  Bot,
  Gauge,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Activity,
  Zap,
} from "lucide-react";
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
  if (normalized === robinhoodChain.token0Address.toLowerCase())
    return robinhoodChain.token0Label;
  if (normalized === robinhoodChain.token1Address.toLowerCase())
    return robinhoodChain.token1Label;
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
  const { connected, nativeBalance, onTargetNetwork, wrongNetwork, connect } =
    useWallet();
  const { positions, totalCount, isLoading, error, refresh } =
    useLiquidityPositions();
  const { tokens, currentTick } = useUniswapPool();
  const {
    collectAll,
    isSubmitting: isCollecting,
    status: actionStatus,
    error: actionError,
  } = usePositionActions();
  const hasPositions = positions.length > 0;

  const earnings = positions.reduce(
    (acc, pos) => {
      const t0 = pos.token0.toLowerCase();
      const t1 = pos.token1.toLowerCase();
      acc[t0] = (acc[t0] || 0n) + BigInt(pos.tokensOwed0);
      acc[t1] = (acc[t1] || 0n) + BigInt(pos.tokensOwed1);
      return acc;
    },
    {} as Record<string, bigint>,
  );

  const hasEarnings = Object.values(earnings).some((v) => v > 0n);
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
      <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Workspace <span className="text-border">/</span>{" "}
            <span className="text-foreground">Positions</span>
          </div>
          <h1 className="text-[2.75rem] font-extrabold leading-[1.03] tracking-[-0.045em] text-foreground sm:text-6xl">
            Liquidity that knows when to leave.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            Follow every Uniswap V3 range you hold, watch fees collect in real
            time, and hand the exit to a keeper that moves only on the terms you
            set.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus size={17} /> New position
        </Link>
      </div>

      <div className="mb-16 grid gap-5 sm:grid-cols-3">
        {[
          {
            title: "Wallet Balance",
            value:
              connected && onTargetNetwork && nativeBalance
                ? `${nativeBalance} ETH`
                : "N/A",
            subtitle: !connected
              ? "Connect to read"
              : wrongNetwork
                ? "Switch to Robinhood Chain"
                : "Live from chain",
            icon: Wallet,
            active: connected && onTargetNetwork,
          },
          {
            title: "Active Positions",
            value:
              connected && onTargetNetwork && !isLoading
                ? String(totalCount)
                : "N/A",
            subtitle: !connected
              ? "Nothing to show yet"
              : wrongNetwork
                ? "Wrong network"
                : isLoading
                  ? "Reading NFTs…"
                  : error
                    ? "Read unavailable"
                    : "Held in Uniswap V3",
            icon: Layers,
            active: hasPositions,
          },
          {
            title: "Keeper Coverage",
            value: "Standby",
            subtitle: "No exit set",
            icon: Bot,
            active: false,
          },
        ].map(({ title, value, subtitle, icon: Icon, active }) => (
          <div
            key={title}
            className="rounded-[26px] border border-card-border bg-card p-7 transition-colors hover:border-foreground/15"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {title}
              <Icon
                size={15}
                className={active ? "text-signal" : "text-muted-foreground"}
              />
            </div>
            <div
              className={`mt-7 text-[2.5rem] font-extrabold leading-none tracking-[-0.04em] ${active ? "text-foreground" : "text-muted-foreground/40"}`}
            >
              {value}
            </div>
            <div className="mt-3 text-[13px] text-muted-foreground">
              {subtitle}
            </div>
          </div>
        ))}
      </div>

      {/* Disconnected / Preview State */}
      {!connected && (
        <div className="relative overflow-hidden rounded-[32px] border border-card-border bg-card p-8 sm:p-14">
          <div className="flex flex-col gap-14 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Activity size={13} /> Preview
              </div>
              <h2 className="text-[2rem] font-extrabold leading-[1.06] tracking-[-0.04em] text-foreground sm:text-[2.75rem]">
                Decide the exit before the market does.
              </h2>
              <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
                Connect a wallet to read your live Uniswap V3 positions, follow
                uncollected fees pool by pool, and draw the boundary where the
                keeper steps in for you.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => void connect()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <Wallet size={17} /> Connect wallet
                </button>
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-6 py-3.5 text-[15px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Build a position <ArrowRight size={15} />
                </Link>
              </div>
              <p className="mt-8 flex items-center gap-2 text-[13px] text-muted-foreground">
                <ShieldCheck size={15} /> Non-custodial. Every action is signed
                by you.
              </p>
            </div>

            {/* Mock Position Card showing what it looks like */}
            <div className="w-full max-w-sm shrink-0 rotate-1 transform opacity-60 transition-all duration-700 hover:rotate-0 hover:opacity-100 lg:ml-auto">
              <div className="relative rounded-[24px] border border-primary/20 bg-card p-5 shadow-[0_1px_2px_rgba(26,26,26,0.05)]">
                <div className="absolute inset-0 rounded-[24px] ring-1 ring-inset" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Example Position
                    </p>
                    <h3 className="mt-1 font-mono text-base font-bold text-foreground">
                      #0000
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                    <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />{" "}
                    Active
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3 border-b border-border pb-6">
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
                    <span className="font-medium text-muted-foreground">
                      Current range
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--signal)/0.18)]" />{" "}
                      In range
                    </span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-inset ring-border/50">
                    <div className="absolute bottom-0 left-1/4 right-1/4 top-0 rounded-full bg-primary/20" />
                    <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--signal)/0.18)]" />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[9px] text-muted-foreground">
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
      {connected &&
        onTargetNetwork &&
        !hasPositions &&
        !isLoading &&
        !error && (
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-10">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[24px] bg-primary/10 text-primary ring-1 ring-primary/20">
                <Gauge size={24} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                No active liquidity
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn't find any Uniswap V3 position NFTs in your wallet on{" "}
                {robinhoodChain.chainName}.
              </p>
              <Link
                href="/create"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                <Plus size={16} /> Deploy concentrated liquidity
              </Link>
            </div>
          </div>
        )}

      {/* Earnings Section (Only when connected, even if 0) */}
      {connected && onTargetNetwork && hasPositions && (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative overflow-hidden rounded-[24px] border border-primary/20 bg-card p-5 shadow-[0_8px_30px_rgba(26,26,26,0.08)] sm:p-6">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Zap size={16} className="text-primary" /> Live Earnings
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unclaimed on-chain fees across all tracked positions.
                </p>
              </div>
              <button
                data-testid="button-collect-all"
                onClick={() => void handleCollectAll()}
                disabled={
                  isCollecting ||
                  (!hasEarnings && totalCount === positions.length)
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20 transition-all hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCollecting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Bot size={14} />
                )}
                {isCollecting ? "Collecting..." : "Collect all fees"}
              </button>
            </div>

            {hasEarnings ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {Object.entries(earnings)
                  .filter(([, val]) => val > 0n)
                  .map(([tokenAddr, amount]) => {
                    const tInfo = tokens.find(
                      (t) => t.address.toLowerCase() === tokenAddr,
                    );
                    const decimals = tInfo?.decimals ?? 18;
                    const symbol = tInfo?.symbol ?? tokenLabel(tokenAddr);
                    const formatted = tInfo
                      ? formatUnits(amount, decimals, 6)
                      : amount.toString() + " (Raw)";
                    return (
                      <div
                        key={tokenAddr}
                        data-testid={`card-earnings-${tokenAddr}`}
                        className="flex items-center gap-4 rounded-2xl border border-border bg-secondary p-4"
                      >
                        <Token symbol={symbol} tone="#9bc8a6" />
                        <div>
                          <div
                            className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                            data-testid={`text-earnings-symbol-${tokenAddr}`}
                          >
                            {symbol}
                          </div>
                          <div
                            className="mt-1 font-mono text-xl font-medium tracking-tight text-foreground"
                            data-testid={`text-earnings-amount-${tokenAddr}`}
                          >
                            {formatted}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div
                data-testid="status-no-unclaimed-fees"
                className="mt-6 rounded-2xl border border-dashed border-border bg-secondary p-5 text-center text-xs text-muted-foreground"
              >
                {totalCount > positions.length
                  ? "No fees are visible in the first 100 positions. Collect All will scan the remaining wallet positions."
                  : "No unclaimed fees are currently reported by the position manager."}
              </div>
            )}
            {actionStatus && (
              <p className="mt-4 flex items-center gap-2 text-xs text-primary/80">
                {isCollecting && (
                  <RefreshCw size={12} className="animate-spin" />
                )}{" "}
                {actionStatus}
              </p>
            )}
            {actionError && (
              <p className="mt-4 text-xs text-destructive-foreground">
                {actionError}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Positions List */}
      {connected && onTargetNetwork && (
        <section className="mb-6">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">
                On-chain positions
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Read directly from the official Uniswap V3 Position Manager.
              </p>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={12}
                className={isLoading ? "animate-spin text-primary" : ""}
              />
              Refresh
            </button>
          </div>

          {error && (
            <div className="rounded-[24px] border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive-foreground">
              {error}
            </div>
          )}

          {!error && isLoading && !hasPositions && (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-[24px] border border-border/30 bg-card/20"
                />
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
                  className="group relative flex flex-col rounded-[24px] border border-border bg-card p-5  transition-all hover:border-primary/40 hover:bg-card hover:shadow-[0_1px_2px_rgba(26,26,26,0.05)] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors group-hover:text-primary/70">
                        Position NFT
                      </p>
                      <h3 className="mt-1 font-mono text-lg font-bold text-foreground">
                        #{position.tokenId}
                      </h3>
                    </div>
                    <StatusPill green={BigInt(position.liquidity) > 0n}>
                      {BigInt(position.liquidity) > 0n
                        ? "Active liquidity"
                        : "No liquidity"}
                    </StatusPill>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Token
                        symbol={tokenLabel(position.token0)}
                        tone="#9bc8a6"
                      />
                      <Token
                        symbol={tokenLabel(position.token1)}
                        tone="#8db6d8"
                      />
                    </div>
                    <div className="min-w-0 font-mono text-xs font-medium text-foreground/90">
                      {shortenAddress(position.token0)} /{" "}
                      {shortenAddress(position.token1)}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="mb-4">
                      <div className="mb-2 flex items-center justify-between text-[10px]">
                        <span className="font-medium text-muted-foreground">
                          Current range
                        </span>
                        {currentTick !== null && supportsLiveRange(position) ? (
                          currentTick >= position.tickLower &&
                          currentTick <= position.tickUpper ? (
                            <span
                              data-testid={`status-range-${position.tokenId}`}
                              className="flex items-center gap-1.5 font-semibold text-primary"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--signal)/0.18)] animate-pulse" />
                              In range
                            </span>
                          ) : (
                            <span
                              data-testid={`status-range-${position.tokenId}`}
                              className="flex items-center gap-1.5 font-semibold text-destructive-foreground"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground" />
                              Out of range
                            </span>
                          )
                        ) : (
                          <span
                            data-testid={`status-range-${position.tokenId}`}
                            className="font-medium text-muted-foreground"
                          >
                            Unavailable
                          </span>
                        )}
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary ring-1 ring-inset ring-border/50">
                        <div className="absolute inset-y-0 left-1/4 right-1/4 rounded-full bg-primary/20" />
                        {currentTick !== null &&
                          supportsLiveRange(position) && (
                            <div
                              data-testid={`indicator-tick-${position.tokenId}`}
                              className={`absolute top-1/2 -mt-[3px] h-2 w-2 rounded-full transition-all duration-500 ${currentTick >= position.tickLower && currentTick <= position.tickUpper ? "bg-primary shadow-[0_0_0_3px_hsl(var(--signal)/0.18)]" : "bg-muted-foreground"}`}
                              style={{
                                left:
                                  currentTick < position.tickLower
                                    ? "10%"
                                    : currentTick > position.tickUpper
                                      ? "90%"
                                      : `${25 + ((currentTick - position.tickLower) / Math.max(1, position.tickUpper - position.tickLower)) * 50}%`,
                              }}
                            />
                          )}
                      </div>
                      <div className="mt-2 flex justify-between text-[9px] font-mono font-medium text-muted-foreground">
                        <span>{position.tickLower}</span>
                        <span>{position.tickUpper}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 rounded-2xl bg-secondary p-3">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Fee tier
                        </p>
                        <p className="mt-1 font-mono text-xs font-medium text-foreground/90">
                          {formatFee(position.fee)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Liquidity
                        </p>
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
            <div className="mt-6 rounded-2xl border border-dashed border-border p-4 text-center text-[11px] font-medium text-muted-foreground">
              Showing the first {positions.length} of {totalCount} position
              NFTs.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
