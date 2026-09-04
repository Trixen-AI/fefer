import { TrendingDown, TrendingUp, Activity } from "lucide-react";
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
      <div className={`flex items-center gap-4 bg-muted/30 px-4 py-1.5 border-b border-border/50 text-[10px] uppercase tracking-widest ${className}`} aria-label="Loading market prices">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity size={12} className="animate-pulse" />
          <span>Syncing Market Data</span>
        </div>
        <div className="flex gap-4 opacity-50">
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="h-4 w-24 animate-pulse rounded bg-border/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        data-testid="status-market-prices-error"
        className={`flex items-center gap-2 bg-muted/30 px-4 py-1.5 border-b border-border/50 text-[10px] uppercase tracking-widest text-muted-foreground ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Market stream disconnected
      </div>
    );
  }

  return (
    <div
      data-testid="ticker-market-prices"
      className={`flex items-center gap-6 overflow-x-auto bg-muted/30 px-4 py-1.5 border-b border-border/50 no-scrollbar ${className}`}
      aria-label="Live cryptocurrency prices"
    >
      <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        Live
      </span>
      
      <div className="flex items-center gap-6">
        {data.prices.map((asset) => {
          const isPositive = asset.change24h !== null && asset.change24h >= 0;
          const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <div
              key={asset.symbol}
              data-testid={`ticker-price-${asset.symbol.toLowerCase()}`}
              className="flex shrink-0 items-center gap-2"
            >
              <span className="text-[10px] font-bold tracking-wider text-foreground">
                {asset.symbol}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {formatUsd(asset.priceUsd)}
              </span>
              {asset.change24h !== null && (
                <span
                  className={`flex items-center gap-0.5 text-[10px] font-mono font-medium ${
                    isPositive ? "text-primary" : "text-destructive-foreground"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {asset.change24h.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
