import { ExternalLink, ArrowLeft, Loader2, Zap } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { Token, StatusPill } from "@/components/ui/shared";
import { useLiquidityPositions } from "@/hooks/use-liquidity-positions";
import { usePositionActions } from "@/hooks/use-position-actions";
import { useUniswapPool } from "@/hooks/use-uniswap-pool";
import { useWallet } from "@/hooks/use-wallet";
import { robinhoodChain } from "@/config/network";
import { shortenAddress } from "@/lib/ethereum";

function supportsLiveRange(position: {
  token0: string;
  token1: string;
  fee: number;
}) {
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

export default function PositionDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { connected, onTargetNetwork } = useWallet();
  const { positions, isLoading, error, refresh } = useLiquidityPositions();
  const { currentTick } = useUniswapPool();
  const {
    collect,
    close,
    isSubmitting,
    status,
    error: actionError,
    txHashes,
  } = usePositionActions();
  const position = positions.find((item) => item.tokenId === id);
  const positionReady = Boolean(connected && onTargetNetwork && position);

  const handleCollect = async () => {
    if (!position) return;
    try {
      await collect(position);
      await refresh();
    } catch {
      // The action hook exposes the wallet or RPC error in the card.
    }
  };

  const handleClose = async () => {
    if (
      !position ||
      !window.confirm(
        "Close this position? Liquidity will be removed, tokens collected, and the NFT burned.",
      )
    ) {
      return;
    }
    try {
      await close(position);
      await refresh();
      window.setTimeout(() => navigate("/"), 900);
    } catch {
      // The action hook exposes the wallet or RPC error in the card.
    }
  };

  return (
    <div className="lico-rise">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-2 rounded text-xs text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <ArrowLeft size={15} /> Back to positions
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-muted-foreground">
            Position <span className="text-muted-foreground">/</span>{" "}
            {id || "Unknown"}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <Token
                symbol={
                  position
                    ? position.token0.toLowerCase() ===
                      robinhoodChain.token0Address.toLowerCase()
                      ? robinhoodChain.token0Label
                      : "TOKEN"
                    : "WETH"
                }
                tone="#9bc8a6"
              />
              <Token
                symbol={
                  position
                    ? position.token1.toLowerCase() ===
                      robinhoodChain.token1Address.toLowerCase()
                      ? robinhoodChain.token1Label
                      : "TOKEN"
                    : "USDG"
                }
                tone="#8db6d8"
              />
            </div>
            <h1 className="text-xl font-semibold tracking-[-.03em] sm:text-2xl">
              {positionReady
                ? `${shortenAddress(position?.token0 ?? "")} / ${shortenAddress(position?.token1 ?? "")}`
                : `Position #${id || "Unknown"}`}
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLoading
              ? "Reading position from Robinhood Chain…"
              : error
                ? error
                : positionReady && position
                  ? `Fee tier ${position.fee / 10_000}%`
                  : "Position data unavailable"}
          </p>
        </div>
        <StatusPill
          green={Boolean(
            positionReady && position && BigInt(position.liquidity) > 0n,
          )}
        >
          {positionReady && position
            ? BigInt(position.liquidity) > 0n
              ? "Active liquidity"
              : "No liquidity"
            : "Data pending"}
        </StatusPill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="card-gradient rounded-[24px] border p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Price range</h2>
            <StatusPill>
              {positionReady ? "On-chain ticks" : "Not available"}
            </StatusPill>
          </div>
          <div className="mt-6 h-52 rounded-2xl border border-border bg-card p-5">
            <div className="flex h-full flex-col justify-center gap-7">
              {positionReady &&
              position &&
              currentTick !== null &&
              supportsLiveRange(position) ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Min Tick
                      </span>
                      <span
                        data-testid="text-tick-lower"
                        className="font-mono text-foreground"
                      >
                        {position.tickLower}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Current
                      </span>
                      <span
                        data-testid="text-tick-current"
                        className="font-mono text-base font-medium text-primary"
                      >
                        {currentTick}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Max Tick
                      </span>
                      <span
                        data-testid="text-tick-upper"
                        className="font-mono text-foreground"
                      >
                        {position.tickUpper}
                      </span>
                    </div>
                  </div>

                  <div
                    data-testid="indicator-range-visual"
                    className="relative h-2 w-full overflow-visible rounded-full bg-card ring-1 ring-inset ring-border"
                  >
                    <div className="absolute inset-y-0 left-[20%] right-[20%] rounded-full bg-secondary" />
                    <div
                      className={`absolute top-1/2 -mt-2 h-4 w-4 rounded-full border-2 border-border ${currentTick >= position.tickLower && currentTick <= position.tickUpper ? "bg-primary shadow-[0_0_0_3px_hsl(var(--signal)/0.18)]" : "bg-muted-foreground"}`}
                      style={{
                        left:
                          currentTick < position.tickLower
                            ? "5%"
                            : currentTick > position.tickUpper
                              ? "95%"
                              : `${20 + ((currentTick - position.tickLower) / Math.max(1, position.tickUpper - position.tickLower)) * 60}%`,
                      }}
                    />
                  </div>

                  <div
                    className="text-center"
                    data-testid="status-range-detail"
                  >
                    {currentTick >= position.tickLower &&
                    currentTick <= position.tickUpper ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        In range • Earning fees
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive-foreground ring-1 ring-destructive/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground" />
                        Out of range • Not earning
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                  {positionReady && position
                    ? `Lower tick ${position.tickLower}  ·  Upper tick ${position.tickUpper}`
                    : "Price range unavailable"}
                </div>
              )}
            </div>
          </div>
          {positionReady && position && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ["Liquidity", position.liquidity],
                ["Token 0 owed", position.tokensOwed0],
                ["Token 1 owed", position.tokensOwed1],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-card p-3"
                >
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {positionReady && position && (
            <div className="card-gradient rounded-[24px] border p-5">
              <h2 className="text-sm font-semibold">Manage position</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Collect sends owed fees to your wallet. Close removes all
                liquidity, collects both token balances, then burns this empty
                NFT.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  data-testid="button-collect"
                  onClick={() => void handleCollect()}
                  disabled={isSubmitting}
                  className="rounded-2xl border border-border px-3 py-2.5 text-xs font-semibold text-signal transition hover:bg-signal/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Collect fees
                </button>
                <button
                  data-testid="button-close"
                  onClick={() => void handleClose()}
                  disabled={isSubmitting || BigInt(position.liquidity) === 0n}
                  className="rounded-2xl border border-destructive/40 px-3 py-2.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Close position
                </button>
              </div>
              {(isSubmitting || status) && (
                <p className="mt-3 flex items-center gap-2 text-xs text-signal">
                  {isSubmitting && (
                    <Loader2 size={13} className="animate-spin" />
                  )}
                  {status}
                </p>
              )}
              {actionError && (
                <p className="mt-3 text-xs text-destructive">{actionError}</p>
              )}
              {txHashes.map((hash) => (
                <a
                  key={hash}
                  href={`${robinhoodChain.explorerUrl}/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline underline-offset-2"
                >
                  {shortenAddress(hash)} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}

          <div className="card-gradient rounded-[24px] border p-5">
            <h2 className="text-sm font-semibold">Exit automation</h2>
            <div className="mt-4 flex items-center gap-2 text-xs text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Not
              configured
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Keeper automation remains disabled until a verified keeper
              contract and permission model are configured.
            </p>
          </div>

          <div className="rounded-[24px] border border-destructive/20 bg-destructive p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive-foreground">
              <Zap size={15} /> Dangerous actions
            </div>
            <p className="mt-3 text-xs leading-5 text-destructive">
              Closing is irreversible. It removes liquidity, collects tokens,
              and burns the NFT after every transaction is confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
