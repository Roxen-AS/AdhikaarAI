import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import authRouter from "./auth";
import lawyerRouter from "./lawyer";
import lawyersRouter from "./lawyers";
import connectionsRouter from "./connections";
import walletRouter from "./wallet";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(authRouter);
router.use(lawyerRouter);
router.use(lawyersRouter);
router.use(connectionsRouter);
router.use(walletRouter);
router.use(storageRouter);

export default router;
