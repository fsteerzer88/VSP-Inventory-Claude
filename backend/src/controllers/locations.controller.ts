import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/error.middleware";
import { generateLocationQrSvg } from "../services/qrcode.service";
import { LOCATION_ANCESTOR_INCLUDE as ANCESTOR_INCLUDE, withFullCode } from "../services/location-code.service";

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
    include: ANCESTOR_INCLUDE,
    orderBy: { name: "asc" },
  });
  res.json(locations.map(withFullCode));
}

export async function getLocation(req: Request, res: Response) {
  const location = await prisma.location.findUnique({
    where: { id: req.params.id as string },
    include: ANCESTOR_INCLUDE,
  });
  if (!location) throw new HttpError(404, "Location not found");
  res.json(withFullCode(location));
}

export async function lookupLocation(req: Request, res: Response) {
  const { code } = req.query as { code?: string };
  if (!code) throw new HttpError(400, "code query param is required");

  // Codes are only unique per-parent now (see schema comment), so a bare code like "01"
  // can't unambiguously identify one location on its own - match against the full
  // concatenated path code instead (what's printed on labels), falling back to a bare
  // code match only when that uniquely identifies a single location.
  const locations = await prisma.location.findMany({ include: ANCESTOR_INCLUDE });
  const withCodes = locations.map(withFullCode);

  const normalized = code.trim().toLowerCase();
  let location = withCodes.find((l) => l.fullCode.toLowerCase() === normalized);
  if (!location) {
    const bareMatches = withCodes.filter((l) => l.code.toLowerCase() === normalized);
    if (bareMatches.length === 1) location = bareMatches[0];
  }

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

  const existing = await prisma.location.findFirst({ where: { code, parentLocationId: parentLocationId || null } });
  if (existing) {
    throw new HttpError(409, "Location code already in use under this parent");
  }

  const location = await prisma.location.create({
    data: {
      name,
      code,
      description,
      parentLocationId: parentLocationId || null,
      createdBy: req.user!.id,
    },
    include: ANCESTOR_INCLUDE,
  });
  res.status(201).json(withFullCode(location));
}

interface BulkRow {
  name?: string;
  code?: string;
  parentFullCode?: string;
  description?: string;
}

const MAX_BULK_ROWS = 500;

export async function bulkCreateLocations(req: Request, res: Response) {
  const { rows } = req.body as { rows?: BulkRow[] };
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    throw new HttpError(400, "rows must be a non-empty array");
  }
  if (rows.length > MAX_BULK_ROWS) {
    throw new HttpError(400, `Cannot import more than ${MAX_BULK_ROWS} locations at once`);
  }

  const created = await prisma.$transaction(async (tx) => {
    // Seed a fullCode -> id lookup from everything that already exists, then extend it as
    // each row is created so later rows in the same batch can reference parents created
    // earlier in the batch (e.g. a rack on line 1, its shelves on lines 2-3, their bins
    // after that) without requiring a separate request per hierarchy level.
    const existingLocations = await tx.location.findMany({ include: ANCESTOR_INCLUDE });
    const fullCodeToId = new Map<string, string>();
    for (const loc of existingLocations) {
      fullCodeToId.set(withFullCode(loc).fullCode.toLowerCase(), loc.id);
    }

    const results: ReturnType<typeof withFullCode>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const lineNum = i + 1;
      const name = rows[i].name?.trim();
      const code = rows[i].code?.trim();
      const parentFullCode = rows[i].parentFullCode?.trim();
      const description = rows[i].description?.trim();

      if (!name || !code) {
        throw new HttpError(400, `Row ${lineNum}: name and code are required`);
      }

      let parentLocationId: string | null = null;
      if (parentFullCode) {
        const foundId = fullCodeToId.get(parentFullCode.toLowerCase());
        if (!foundId) {
          throw new HttpError(
            400,
            `Row ${lineNum}: parent location "${parentFullCode}" not found - create it first, or list it on an earlier line in this import`,
          );
        }
        parentLocationId = foundId;
      }

      const duplicate = await tx.location.findFirst({ where: { code, parentLocationId } });
      if (duplicate) {
        throw new HttpError(409, `Row ${lineNum}: code "${code}" already exists under that parent`);
      }

      const location = await tx.location.create({
        data: { name, code, description: description || undefined, parentLocationId, createdBy: req.user!.id },
        include: ANCESTOR_INCLUDE,
      });
      const withCode = withFullCode(location);
      fullCodeToId.set(withCode.fullCode.toLowerCase(), location.id);
      results.push(withCode);
    }

    return results;
  });

  res.status(201).json({ created });
}

export async function updateLocation(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { name, code, description, parentLocationId, isActive } = req.body as {
    name?: string;
    code?: string;
    description?: string;
    parentLocationId?: string | null;
    isActive?: boolean;
  };

  if (isActive !== undefined && req.user!.role !== "admin") {
    throw new HttpError(403, "Only admins can archive or reactivate locations");
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (parentLocationId !== undefined) data.parentLocationId = parentLocationId || null;
  if (isActive !== undefined) data.isActive = isActive;

  if (code !== undefined || parentLocationId !== undefined) {
    const current = await prisma.location.findUnique({ where: { id } });
    if (!current) throw new HttpError(404, "Location not found");

    const effectiveCode = code !== undefined ? code : current.code;
    const effectiveParentId = parentLocationId !== undefined ? parentLocationId || null : current.parentLocationId;

    const existing = await prisma.location.findFirst({
      where: { code: effectiveCode, parentLocationId: effectiveParentId, NOT: { id } },
    });
    if (existing) {
      throw new HttpError(409, "Location code already in use under this parent");
    }
    if (code !== undefined) data.code = code;
  }

  const location = await prisma.location.update({ where: { id }, data, include: ANCESTOR_INCLUDE });
  res.json(withFullCode(location));
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
