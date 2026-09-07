// Overridable so a blocked or rate-limited endpoint can be swapped without a
// code change. Netlify reads RPC_URL from the site environment.
const RPC_URL =
  process.env.RPC_URL ||
  process.env.VITE_RPC_URL ||
  "https://rpc.mainnet.chain.robinhood.com";
const POSITION_MANAGER = "0x73991a25c818bf1f1128deaab1492d45638de0d3";
const MAX_VISIBLE_POSITIONS = 100;

const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

let rpcRequestId = 0;
let pricesCache = null;

function response(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function word(value) {
  const hex = typeof value === "bigint" ? value.toString(16) : value.replace(/^0x/, "");
  return hex.padStart(64, "0");
}

async function rpcCall(to, data) {
  const result = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcRequestId,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const payload = await result.json();
  if (!result.ok || payload.error || typeof payload.result !== "string") {
    // Name the host and the selector. A bare upstream message like
    // "Internal error" says nothing about which call or which endpoint failed.
    // Host only: RPC_URL can carry an API key.
    let host = "rpc";
    try {
      host = new URL(RPC_URL).host;
    } catch {
      /* keep fallback */
    }
    const selector = String(data).slice(0, 10);
    const code = payload.error?.code;
    const detail =
      payload.error?.message || `HTTP ${result.status}`;
    throw new Error(
      `${detail}${code === undefined ? "" : ` (code ${code})`} [${host} ${selector}]`,
    );
  }
  return payload.result;
}

async function positions(owner) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(owner)) {
    return response(400, { error: "Invalid wallet address." });
  }
  const balance = await rpcCall(POSITION_MANAGER, `0x70a08231${word(owner)}`);
  const totalCount = Number(BigInt(balance));
  const visibleCount = Math.min(totalCount, MAX_VISIBLE_POSITIONS);
  const tokenIds = await Promise.all(
    Array.from({ length: visibleCount }, (_, index) =>
      rpcCall(
        POSITION_MANAGER,
        `0x2f745c59${word(owner)}${word(BigInt(index))}`,
      ),
    ),
  );
  const result = await Promise.all(
    tokenIds.map(async (tokenIdData) => {
      const tokenId = BigInt(tokenIdData);
      return {
        tokenId: tokenId.toString(),
        data: await rpcCall(POSITION_MANAGER, `0x99fbab88${word(tokenId)}`),
      };
    }),
  );
  return response(200, { totalCount, positions: result });
}

/**
 * Prefer slightly stale prices over an empty ticker. The cached value is kept
 * long after it stops being "fresh" precisely so a throttled upstream degrades
 * into old numbers rather than a disconnected banner.
 */
function staleOr(message) {
  if (pricesCache) {
    return response(200, { ...pricesCache.value, stale: true });
  }
  throw new Error(message);
}

async function marketPrices() {
  if (pricesCache && pricesCache.expiresAt > Date.now()) {
    return response(200, pricesCache.value);
  }

  let result;
  try {
    result = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
      {
        headers: {
          accept: "application/json",
          // CoinGecko's free tier is stricter with datacenter IPs, and rejects
          // some requests that arrive without a user agent.
          "user-agent": "liqo-protocol/1.0 (+https://liqoprotocol.com)",
        },
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch (error) {
    // Network-level failure (timeout, DNS, refused).
    return staleOr(
      `Market provider unreachable: ${error instanceof Error ? error.message : "fetch failed"}.`,
    );
  }

  if (!result.ok) {
    // 429 is the common one: the free tier rate-limits shared cloud IPs, so a
    // deployed function can be throttled while a laptop on the same code is not.
    return staleOr(`Market provider returned HTTP ${result.status}.`);
  }
  const data = await result.json();
  const assets = [
    ["bitcoin", "BTC"],
    ["ethereum", "ETH"],
    ["solana", "SOL"],
  ];
  const value = {
    prices: assets.map(([id, symbol]) => ({
      symbol,
      priceUsd: data[id]?.usd,
      change24h: typeof data[id]?.usd_24h_change === "number" ? data[id].usd_24h_change : null,
    })),
    updatedAt: new Date().toISOString(),
  };
  if (value.prices.some((asset) => typeof asset.priceUsd !== "number")) {
    throw new Error("Market provider returned incomplete data.");
  }
  // 60s rather than 30s: every visitor refetches on a 30s interval, so a short
  // window multiplied the upstream calls and helped trip the rate limit.
  pricesCache = { value, expiresAt: Date.now() + 60_000 };
  return response(200, value);
}

/**
 * Netlify v1 (event/callback) function.
 *
 * Exported by name on purpose: an ESM file whose DEFAULT export is a function
 * is treated as a v2 function, which is handed a `Request` and must return a
 * `Response`. This handler reads `event.httpMethod`/`event.path` and returns
 * `{statusCode, headers, body}`, so under v2 every field is undefined and the
 * return value is rejected by the runtime. Keep this a named export.
 */
export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  const functionPrefix = "/.netlify/functions/api";
  const path = (event.path || "").replace(functionPrefix, "").replace(/^\/api/, "") || "/";

  try {
    if (event.httpMethod === "GET" && path === "/market/prices") {
      return await marketPrices();
    }
    if (event.httpMethod === "GET" && path.startsWith("/chain/positions/")) {
      return await positions(decodeURIComponent(path.slice("/chain/positions/".length)));
    }
    if (event.httpMethod === "GET" && path === "/keeper/status") {
      return response(200, {
        configured: false,
        running: false,
        operatorAddress: null,
        contractAddress: null,
      });
    }
    if (event.httpMethod === "POST" && path === "/chain/simulate-mint") {
      const body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : event.body || "{}");
      if (!/^0x[a-fA-F0-9]{40}$/.test(body.from || "") || !/^0x[a-fA-F0-9]+$/.test(body.data || "")) {
        return response(400, { error: "Invalid simulation request." });
      }
      return response(200, { result: await rpcCall(POSITION_MANAGER, body.data) });
    }
    return response(404, { error: "API route not found." });
  } catch (error) {
    return response(502, { error: error instanceof Error ? error.message : "API unavailable." });
  }
}