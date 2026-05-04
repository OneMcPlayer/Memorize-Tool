import { Router, type IRouter } from "express";
import { requireAccessToken } from "../middleware/requireAccessToken";

const router: IRouter = Router();

// Simple endpoint that succeeds only when the access-token middleware lets
// the request through. Used by the frontend gate to verify a code before it
// is persisted to localStorage.
router.get("/access/verify", requireAccessToken, (_req, res) => {
  res.json({ ok: true });
});

export default router;
