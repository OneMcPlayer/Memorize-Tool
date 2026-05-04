import type { Request, Response, NextFunction } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, tokensTable, usersTable, type User } from "@workspace/db";
import { verifySessionJwt } from "../lib/sessionJwt";

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      authToken?: string;
      authJti?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Step 1: verify JWT signature + expiry against SESSION_SECRET
  const payload = verifySessionJwt(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Step 2: confirm the session has not been revoked (logout deletes the row)
  const now = new Date();
  const [tokenRow] = await db
    .select()
    .from(tokensTable)
    .where(and(eq(tokensTable.id, payload.jti), gt(tokensTable.expiresAt, now)));

  if (!tokenRow) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.userId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.authUser = user;
  req.authToken = token;
  req.authJti = payload.jti;
  next();
}
