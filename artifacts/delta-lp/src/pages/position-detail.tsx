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
    <div className="liqora-rise">
      <Link
        href="/"
        className="mb-7 inline-flex items-center gap-2 rounded text-xs text-[#7c967f] hover:text-[#c9ddcc] focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <ArrowLeft size={15} /> Back to positions
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#688471]">
            Position <span className="text-[#3e5a46]">/</span> {id || "Unknown"}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <Token symbol={position ? (position.token0.toLowerCase() === robinhoodChain.token0Address.toLowerCase() ? robinhoodChain.token0Label : "TOKEN") : "WETH"} tone="#9bc8a6" />
              <Token symbol={position ? (position.token1.toLowerCase() === robinhoodChain.token1Address.toLowerCase() ? robinhoodChain.token1Label : "TOKEN") : "USDG"} tone="#8db6d8" />
            </div>
            <h1 className="text-xl font-semibold tracking-[-.03em] sm:text-2xl">
              {positionReady
                ? `${shortenAddress(position?.token0 ?? "")} / ${shortenAddress(position?.token1 ?? "")}`
                : `Position #${id || "Unknown"}`}
            </h1>
          </div>
          <p className="mt-2 text-sm text-[#819989]">
            {isLoading
              ? "Reading position from Robinhood Chain…"
              : error
                ? error
                : positionReady && position
                  ? `Fee tier ${position.fee / 10_000}%`
                  : "Position data unavailable"}
          </p>
        </div>
        <StatusPill green={Boolean(positionReady && position && BigInt(position.liquidity) > 0n)}>
          {positionReady && position
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
            <div className="flex h-full flex-col justify-center gap-7">
              {positionReady &&
              position &&
              currentTick !== null &&
              supportsLiveRange(position) ? (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-[#607a67]">Min Tick</span>
                      <span data-testid="text-tick-lower" className="font-mono text-[#c3d4c5]">{position.tickLower}</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-[#607a67]">Current</span>
                      <span data-testid="text-tick-current" className="font-mono text-base font-medium text-primary">{currentTick}</span>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-[#607a67]">Max Tick</span>
                      <span data-testid="text-tick-upper" className="font-mono text-[#c3d4c5]">{position.tickUpper}</span>
                    </div>
                  </div>
                  
                  <div data-testid="indicator-range-visual" className="relative h-2 w-full overflow-visible rounded-full bg-[#0b1a11] ring-1 ring-inset ring-[#6aa47718]">
                    <div className="absolute inset-y-0 left-[20%] right-[20%] rounded-full bg-[#1b3b27]" />
                    <div 
                      className={`absolute top-1/2 -mt-2 h-4 w-4 rounded-full border-2 border-[#08150e] ${currentTick >= position.tickLower && currentTick <= position.tickUpper ? "bg-primary shadow-[0_0_12px_rgba(94,224,138,0.8)]" : "bg-[#8ea596]"}`}
                      style={{ 
                        left: currentTick < position.tickLower 
                          ? "5%" 
                          : currentTick > position.tickUpper 
                            ? "95%" 
                            : `${20 + ((currentTick - position.tickLower) / Math.max(1, position.tickUpper - position.tickLower)) * 60}%`
                      }}
                    />
                  </div>
                  
                  <div className="text-center" data-testid="status-range-detail">
                    {currentTick >= position.tickLower && currentTick <= position.tickUpper ? (
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
                <div className="flex h-full items-center justify-center text-center text-xs text-[#78917e]">
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
                <div key={label} className="rounded-lg border border-[#6aa4771c] bg-[#08150e] p-3">
                  <p className="text-[10px] text-[#607a67]">{label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-[#c3d4c5]">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {positionReady && position && (
            <div className="card-gradient rounded-xl border p-5">
              <h2 className="text-sm font-semibold">Manage position</h2>
              <p className="mt-2 text-xs leading-5 text-[#718a77]">
                Collect sends owed fees to your wallet. Close removes all liquidity, collects both token balances, then burns this empty NFT.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  data-testid="button-collect"
                  onClick={() => void handleCollect()}
                  disabled={isSubmitting}
                  className="rounded-lg border border-[#6aa47738] px-3 py-2.5 text-xs font-semibold text-[#b8e8c1] transition hover:bg-[#5ee08a0d] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Collect fees
                </button>
                <button
                  data-testid="button-close"
                  onClick={() => void handleClose()}
                  disabled={isSubmitting || BigInt(position.liquidity) === 0n}
                  className="rounded-lg border border-[#9a5b50] px-3 py-2.5 text-xs font-semibold text-[#d39a8d] transition hover:bg-[#9a5b5018] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Close position
                </button>
              </div>
              {(isSubmitting || status) && (
                <p className="mt-3 flex items-center gap-2 text-xs text-[#9dccaa]">
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  {status}
                </p>
              )}
              {actionError && <p className="mt-3 text-xs text-[#e1aa9d]">{actionError}</p>}
              {txHashes.map((hash) => (
                <a
                  key={hash}
                  href={`${robinhoodChain.explorerUrl}/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#8ea596] underline underline-offset-2"
                >
                  {shortenAddress(hash)} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}

          <div className="card-gradient rounded-xl border p-5">
            <h2 className="text-sm font-semibold">Exit automation</h2>
            <div className="mt-4 flex items-center gap-2 text-xs text-[#c7d9ca]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c99a57]" /> Not configured
            </div>
            <p className="mt-3 text-xs leading-5 text-[#718a77]">
              Keeper automation remains disabled until a verified keeper contract and permission model are configured.
            </p>
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive-foreground">
              <Zap size={15} /> Dangerous actions
            </div>
            <p className="mt-3 text-xs leading-5 text-[#aa837b]">
              Closing is irreversible. It removes liquidity, collects tokens, and burns the NFT after every transaction is confirmed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}