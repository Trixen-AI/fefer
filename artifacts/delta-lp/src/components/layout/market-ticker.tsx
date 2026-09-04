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
      <div className={`flex items-center gap-4 bg-[#08150e] px-4 py-1.5 border-b border-[rgba(100,180,120,.16)] text-[10px] uppercase tracking-widest ${className}`}>
        <div className="flex items-center gap-2 text-[#647d6b]">
          <Activity size={12} className="animate-pulse" />
          <span>Syncing</span>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <div className={`flex items-center gap-6 overflow-x-auto bg-[#08150e] px-4 py-1.5 border-b border-[rgba(100,180,120,.16)] no-scrollbar ${className}`}>
      <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5ee08a]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#5ee08a] animate-pulse" />
        Live
      </span>
      
      <div className="flex items-center gap-6">
        {data.prices.filter(p => ["BTC", "ETH", "SOL"].includes(p.symbol)).map((asset) => {
          const isPositive = asset.change24h !== null && asset.change24h >= 0;
          const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <div
              key={asset.symbol}
              className="flex shrink-0 items-center gap-2"
            >
              <span className="text-[10px] font-bold tracking-wider text-[#dff6e4]">
                {asset.symbol}
              </span>
              <span className="font-mono text-[10px] text-[#829b88]">
                {formatUsd(asset.priceUsd)}
              </span>
              {asset.change24h !== null && (
                <span
                  className={`flex items-center gap-0.5 text-[10px] font-mono font-medium ${
                    isPositive ? "text-[#5ee08a]" : "text-[#d9a4a4]"
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
