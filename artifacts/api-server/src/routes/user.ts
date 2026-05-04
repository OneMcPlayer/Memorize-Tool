import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { revokeSessionByAuthHeader } from "./passkey";

const router: IRouter = Router();

router.post("/user/logout", async (req, res): Promise<void> => {
  const r = await revokeSessionByAuthHeader(req.headers.authorization);
  if (!r.ok) {
    res.status(r.status ?? 400).json({ error: r.error ?? "Logout failed" });
    return;
  }
  res.json({
    success: true,
    message: r.alreadyLoggedOut ? "Already logged out" : "Logged out successfully",
  });
});

router.get("/user/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.authUser!;
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.username,
    email: user.email ?? null,
    groups: [] as string[],
    isAuthenticated: true,
  });
});

export default router;
