import { Router, type IRouter } from "express";
import {
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