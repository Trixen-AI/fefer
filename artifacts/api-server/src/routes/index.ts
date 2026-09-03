import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keeperRouter from "./keeper";

const router: IRouter = Router();

router.use(healthRouter);
router.use(keeperRouter);

export default router;
