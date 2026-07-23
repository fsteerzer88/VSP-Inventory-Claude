import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    next();
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && user.isActive) {
    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireRole(...roles: Array<"admin" | "user">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
