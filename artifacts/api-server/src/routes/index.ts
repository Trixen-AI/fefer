import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keeperRouter from "./keeper";
import marketRouter from "./market";
import chainRouter from "./chain";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keeperRouter);
router.use(marketRouter);
router.use(chainRouter);

export default router;
