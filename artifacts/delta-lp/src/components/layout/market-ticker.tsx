import { TrendingDown, TrendingUp } from "lucide-react";
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
      <div className={`flex items-center gap-2 ${className}`} aria-label="Loading market prices">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="h-7 w-24 animate-pulse rounded-md bg-[#ffffff08]"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        data-testid="status-market-prices-error"
        className={`flex items-center gap-2 text-[10px] text-[#8ea596] ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#9a5b50]" />
        Market data unavailable
      </div>
    );
  }

  return (
    <div
      data-testid="ticker-market-prices"
      className={`flex items-center gap-1.5 overflow-x-auto ${className}`}
      aria-label="Live cryptocurrency prices"
    >
      <span className="mr-1 flex shrink-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.16em] text-[#65806d]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_6px_rgba(94,224,138,.65)]" />
        Live
      </span>
      {data.prices.map((asset) => {
        const isPositive = asset.change24h !== null && asset.change24h >= 0;
        const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <div
            key={asset.symbol}
            data-testid={`ticker-price-${asset.symbol.toLowerCase()}`}
            className="flex shrink-0 items-center gap-2 rounded-md border border-[#6aa4771c] bg-[#0d2115] px-2.5 py-1.5"
          >
            <span className="text-[10px] font-semibold text-[#dbe9dd]">
              {asset.symbol}
            </span>
            <span className="font-mono text-[10px] text-[#a9bdad]">
              {formatUsd(asset.priceUsd)}
            </span>
            {asset.change24h !== null && (
              <span
                className={`flex items-center gap-0.5 text-[9px] font-medium ${
                  isPositive ? "text-primary" : "text-[#d39a8d]"
                }`}
              >
                <ChangeIcon size={10} />
                {isPositive ? "+" : ""}
                {asset.change24h.toFixed(2)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}