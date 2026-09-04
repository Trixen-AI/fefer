import { Router, type IRouter } from "express";
import {
  ChainPositionsParams,
  ChainPositionsResponse,
  SimulateMintBody,
  SimulateMintResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const RPC_URL =
  process.env["ROBINHOOD_RPC_URL"] ??
  "https://rpc.mainnet.chain.robinhood.com";
const POSITION_MANAGER =
  process.env["UNISWAP_V3_POSITION_MANAGER"] ??
  "0x73991a25c818bf1f1128deaab1492d45638de0d3";
let requestId = 0;
const BALANCE_OF_SELECTOR = "0x70a08231";
const TOKEN_OF_OWNER_BY_INDEX_SELECTOR = "0x2f745c59";
const POSITIONS_SELECTOR = "0x99fbab88";
const MAX_VISIBLE_POSITIONS = 100;

function encodeWord(value: string | bigint) {
  const normalized =
    typeof value === "bigint" ? value.toString(16) : value.replace(/^0x/, "");
  return normalized.padStart(64, "0");
}

async function rpcCall(to: string, data: string) {
  requestId += 1;
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: requestId,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const payload = (await response.json()) as {
    result?: unknown;
    error?: { message?: string };
  };
  if (!response.ok || payload.error || typeof payload.result !== "string") {
    throw new Error(
      payload.error?.message ?? `Chain RPC returned HTTP ${response.status}.`,
    );
  }
  return payload.result;
}

router.get("/chain/positions/:owner", async (req, res): Promise<void> => {
  const input = ChainPositionsParams.safeParse(req.params);
  if (!input.success) {
    res.status(400).json({ error: "Invalid wallet address." });
    return;
  }

  try {
    const countData = await rpcCall(
      POSITION_MANAGER,
      `${BALANCE_OF_SELECTOR}${encodeWord(input.data.owner)}`,
    );
    const totalCount = Number(BigInt(countData));
    const visibleCount = Math.min(totalCount, MAX_VISIBLE_POSITIONS);
    const tokenIds = await Promise.all(
      Array.from({ length: visibleCount }, (_, index) =>
        rpcCall(
          POSITION_MANAGER,
          `${TOKEN_OF_OWNER_BY_INDEX_SELECTOR}${encodeWord(input.data.owner)}${encodeWord(BigInt(index))}`,
        ),
      ),
    );
    const positions = await Promise.all(
      tokenIds.map(async (tokenIdData) => {
        const tokenId = BigInt(tokenIdData);
        return {
          tokenId: tokenId.toString(),
          data: await rpcCall(
            POSITION_MANAGER,
            `${POSITIONS_SELECTOR}${encodeWord(tokenId)}`,
          ),
        };
      }),
    );
    res.json(ChainPositionsResponse.parse({ totalCount, positions }));
  } catch (cause) {
    req.log.error({ err: cause }, "Position NFT read failed");
    res.status(502).json({
      error:
        cause instanceof Error ? cause.message : "Position read unavailable.",
    });
  }
});

router.post("/chain/simulate-mint", async (req, res): Promise<void> => {
  const input = SimulateMintBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Invalid mint simulation request." });
    return;
  }

  requestId += 1;
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestId,
        method: "eth_call",
        params: [
          {
            from: input.data.from,
            to: POSITION_MANAGER,
            data: input.data.data,
          },
          "latest",
        ],
      }),
    });
    const payload = (await response.json()) as {
      result?: unknown;
      error?: { message?: string };
    };
    if (
      !response.ok ||
      payload.error ||
      typeof payload.result !== "string"
    ) {
      res.status(502).json({
        error:
          payload.error?.message ??
          `Chain RPC returned HTTP ${response.status}.`,
      });
      return;
    }

    res.json(SimulateMintResponse.parse({ result: payload.result }));
  } catch (cause) {
    req.log.error({ err: cause }, "Mint simulation RPC failed");
    res.status(502).json({
      error:
        cause instanceof Error
          ? cause.message
          : "Mint simulation provider unavailable.",
    });
  }
});

export default router;