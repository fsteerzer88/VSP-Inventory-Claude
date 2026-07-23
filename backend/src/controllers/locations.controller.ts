import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/error.middleware";
import { generateLocationQrSvg } from "../services/qrcode.service";

export async function listLocations(req: Request, res: Response) {
  const { q } = req.query as { q?: string };
  const locations = await prisma.location.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  });
  res.json(locations);
}

export async function getLocation(req: Request, res: Response) {
  const location = await prisma.location.findUnique({ where: { id: req.params.id as string } });
  if (!location) throw new HttpError(404, "Location not found");
  res.json(location);
}

export async function lookupLocation(req: Request, res: Response) {
  const { code } = req.query as { code?: string };
  if (!code) throw new HttpError(400, "code query param is required");
  const location = await prisma.location.findUnique({ where: { code } });
  if (!location) throw new HttpError(404, "Location not found");
  res.json(location);
}

export async function createLocation(req: Request, res: Response) {
  const { name, code, description, parentLocationId } = req.body as {
    name?: string;
    code?: string;
    description?: string;
    parentLocationId?: string;
  };
  if (!name || !code) {
    throw new HttpError(400, "name and code are required");
  }

  const existing = await prisma.location.findUnique({ where: { code } });
  if (existing) {
    throw new HttpError(409, "Location code already in use");
  }

  const location = await prisma.location.create({
    data: {
      name,
      code,
      description,
      parentLocationId: parentLocationId || null,
      createdBy: req.user!.id,
    },
  });
  res.status(201).json(location);
}

export async function updateLocation(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { name, description, parentLocationId } = req.body as {
    name?: string;
    description?: string;
    parentLocationId?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (parentLocationId !== undefined) data.parentLocationId = parentLocationId || null;

  const location = await prisma.location.update({ where: { id }, data });
  res.json(location);
}

export async function deleteLocation(req: Request, res: Response) {
  await prisma.location.delete({ where: { id: req.params.id as string } });
  res.status(204).end();
}

export async function getLocationQrCode(req: Request, res: Response) {
  const location = await prisma.location.findUnique({ where: { id: req.params.id as string } });
  if (!location) throw new HttpError(404, "Location not found");
  const svg = await generateLocationQrSvg(location.id);
  res.type("image/svg+xml").send(svg);
}
