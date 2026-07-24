import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/error.middleware";

function toPublicUser(user: {
  id: string;
  username: string;
  displayName: string;
  role: string;
  mustChangePassword: boolean;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    throw new HttpError(400, "Username and password are required");
  }

  const user = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
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

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    throw new HttpError(400, "currentPassword and newPassword are required");
  }
  if (newPassword.length < 8) {
    throw new HttpError(400, "New password must be at least 8 characters");
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    throw new HttpError(401, "Not authenticated");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });
  res.json(toPublicUser(updated));
}
