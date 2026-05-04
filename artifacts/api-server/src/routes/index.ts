import { Router, type IRouter } from "express";
import healthRouter from "./health";
import accessRouter from "./access";
import passkeyRouter from "./passkey";
import userRouter from "./user";
import studioRouter from "./studio";
import lineTagsRouter from "./lineTags";
import ttsRouter from "./tts";
import audioRouter from "./audio";
import scriptsRouter from "./scripts";
import diagRouter from "./diag";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accessRouter);
router.use(passkeyRouter);
router.use(userRouter);
router.use(studioRouter);
router.use(lineTagsRouter);
router.use(ttsRouter);
router.use(audioRouter);
router.use(scriptsRouter);
router.use(diagRouter);

export default router;
