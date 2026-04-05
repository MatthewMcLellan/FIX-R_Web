import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import authRouter from "./auth";
import adminRouter from "./admin";
import lmstudioRouter from "./lmstudio";
import storageRouter from "./storage";
import modelsRouter from "./models";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(adminRouter);
router.use(lmstudioRouter);
router.use(storageRouter);
router.use(modelsRouter);

export default router;
