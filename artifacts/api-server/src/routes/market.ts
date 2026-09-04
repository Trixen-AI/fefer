import { Router, type IRouter } from "express";
import { MarketPricesResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const CACHE_TTL_MS = 30_000;

type CachedPrices = {
  expiresAt: number;
  value: unknown;
};

let cache: CachedPrices | null = null;

router.get("/market/prices", async (_req, res) => {
  if (cache && cache.expiresAt > Date.now()) {
    res.json(cache.value);
    return;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Market provider returned HTTP ${response.status}.`);
    }

    const data = (await response.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;
    const assets = [
      ["bitcoin", "BTC"],
      ["ethereum", "ETH"],
      ["solana", "SOL"],
    ] as const;
    const value = MarketPricesResponse.parse({
      prices: assets.map(([id, symbol]) => {
        const asset = data[id];
        if (!asset || typeof asset.usd !== "number") {
          throw new Error(`Market provider omitted ${symbol}.`);
        }
        return {
          symbol,
          priceUsd: asset.usd,
          change24h:
            typeof asset.usd_24h_change === "number"
              ? asset.usd_24h_change
              : null,
        };
      }),
      updatedAt: new Date().toISOString(),
    });

    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    res.json(value);
  } catch (error) {
    res.status(502).json({
      message:
        error instanceof Error
          ? error.message
          : "Market data provider unavailable.",
    });
  }
});

export default router;