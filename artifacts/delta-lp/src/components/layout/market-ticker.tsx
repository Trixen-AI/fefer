import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  getMarketPricesQueryKey,
  useMarketPrices,
} from "@workspace/api-client-react";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

const SHELL = "border-b border-border bg-card px-4 sm:px-10";

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
    </span>
  );
}

export function MarketTicker({ className = "" }: { className?: string }) {
  const { data, isLoading, isError } = useMarketPrices({
    query: {
      queryKey: getMarketPricesQueryKey(),
      refetchInterval: 30_000,
      staleTime: 25_000,
      retry: 2,
    },
  });

  if (isLoading) {
    return (
      <div
        className={`flex items-center gap-7 py-3 ${SHELL} ${className}`}
        aria-label="Loading market prices"
      >
        <span className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <LiveDot />
          Live
        </span>
        <div className="flex gap-7">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="h-4 w-28 animate-pulse rounded-full bg-secondary"
            />
          ))}
        </div>
      </div>
    );
  }

  // The payload is only trustworthy once it really carries a prices array:
  // a misrouted /api call can resolve with an HTML body instead of JSON.
  const prices = Array.isArray(data?.prices) ? data.prices : null;

  if (isError || !prices) {
    return (
      <div
        data-testid="status-market-prices-error"
        className={`flex items-center gap-2.5 py-3 text-[13px] font-medium text-muted-foreground ${SHELL} ${className}`}
      >
        <span className="h-2 w-2 rounded-full bg-destructive" />
        Market stream disconnected
      </div>
    );
  }

  return (
    <div
      data-testid="ticker-market-prices"
      className={`no-scrollbar flex items-center gap-7 overflow-x-auto py-3 ${SHELL} ${className}`}
      aria-label="Live cryptocurrency prices"
    >
      <span className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <LiveDot />
        Live
      </span>

      <div className="flex items-center gap-2 sm:gap-3">
        {prices.map((asset) => {
          const change = asset.change24h;
          const isPositive = change !== null && change >= 0;
          const Arrow = isPositive ? ArrowUpRight : ArrowDownRight;

          return (
            <div
              key={asset.symbol}
              data-testid={`ticker-price-${asset.symbol.toLowerCase()}`}
              className="flex shrink-0 items-center gap-2.5 rounded-full bg-secondary py-1.5 pl-3.5 pr-2"
            >
              <span className="text-[12px] font-bold tracking-wide text-foreground">
                {asset.symbol}
              </span>
              {/* tabular-nums keeps the row from twitching on each refetch */}
              <span className="font-mono text-[13px] tabular-nums text-foreground">
                {formatUsd(asset.priceUsd)}
              </span>
              {change !== null && (
                <span
                  className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums ${
                    isPositive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <Arrow size={11} strokeWidth={2.5} />
                  {Math.abs(change).toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
