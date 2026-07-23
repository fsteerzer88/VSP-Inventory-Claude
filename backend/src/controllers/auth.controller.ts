import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/error.middleware";

function toPublicUser(user: { id: string; username: string; displayName: string; role: string }) {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    throw new HttpError(400, "Username and password are required");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Invalid credentials");
  }

  req.session.userId = user.id;
  res.json(toPublicUser(user));
}

export function logout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.status(204).end();
  });
}

export function me(req: Request, res: Response) {
  if (!req.user) {
    throw new HttpError(401, "Not authenticated");
  }
  res.json(req.user);
}
