import { Router, type IRouter } from "express";
import { KeeperStatusResponse } from "@workspace/api-zod";
import { getKeeperStatus } from "../lib/keeper";

const router: IRouter = Router();

router.get("/keeper/status", (_req, res) => {
  res.json(KeeperStatusResponse.parse(getKeeperStatus()));
});

export default router;