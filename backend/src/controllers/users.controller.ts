import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/error.middleware";

function toPublicUser(user: {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({ orderBy: { username: "asc" } });
  res.json(users.map(toPublicUser));
}

export async function createUser(req: Request, res: Response) {
  const { username, password, displayName, role } = req.body as {
    username?: string;
    password?: string;
    displayName?: string;
    role?: "admin" | "user";
  };
  if (!username || !password || !displayName) {
    throw new HttpError(400, "username, password, and displayName are required");
  }

  const existing = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (existing) {
    throw new HttpError(409, "Username already taken");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    // The password set here is a temporary/initial one issued by the admin, so the new
    // user is required to change it the first time they log in.
    data: { username, passwordHash, displayName, role: role ?? "user", mustChangePassword: true },
  });
  res.status(201).json(toPublicUser(user));
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { displayName, role, isActive, password } = req.body as {
    displayName?: string;
    role?: "admin" | "user";
    isActive?: boolean;
    password?: string;
  };

  const data: Record<string, unknown> = {};
  if (displayName !== undefined) data.displayName = displayName;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) {
    // Same reasoning as createUser: an admin issuing a new password counts as issuing a
    // new temporary password, so the user must change it on their next login too.
    data.passwordHash = await bcrypt.hash(password, 12);
    data.mustChangePassword = true;
  }

  const user = await prisma.user.update({ where: { id }, data });
  res.json(toPublicUser(user));
}
