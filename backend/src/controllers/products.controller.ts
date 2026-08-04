import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/error.middleware";
import { deleteImageFile } from "../services/image-storage.service";
import { LOCATION_ANCESTOR_INCLUDE, withFullCode } from "../services/location-code.service";
import { env } from "../config/env";

const SOURCE_INCLUDE = {
  sources: {
    include: { createdByUser: { select: { id: true, username: true, displayName: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function listProducts(req: Request, res: Response) {
  const { q, category } = req.query as { q?: string; category?: string };
  const products = await prisma.product.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { partNumber: { contains: q, mode: "insensitive" } },
                { barcode: { contains: q, mode: "insensitive" } },
                { manufacturer: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        category ? { category } : {},
      ],
    },
    include: { images: true },
    orderBy: { name: "asc" },
  });
  res.json(products);
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id as string },
    include: {
      images: true,
      inventoryItems: { include: { location: { include: LOCATION_ANCESTOR_INCLUDE } } },
      ...SOURCE_INCLUDE,
    },
  });
  if (!product) throw new HttpError(404, "Product not found");
  res.json({
    ...product,
    inventoryItems: product.inventoryItems.map((item) => ({ ...item, location: withFullCode(item.location) })),
  });
}

export async function lookupProductByBarcode(req: Request, res: Response) {
  const { barcode } = req.query as { barcode?: string };
  if (!barcode) throw new HttpError(400, "barcode query param is required");
  const product = await prisma.product.findUnique({ where: { barcode }, include: { images: true } });
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const { barcode, barcodeType, name, description, manufacturer, category, sku, partNumber, reorderThreshold } =
    req.body as {
      barcode?: string;
      barcodeType?: string;
      name?: string;
      description?: string;
      manufacturer?: string;
      category?: string;
      sku?: string;
      partNumber?: string;
      reorderThreshold?: number;
    };
  if (!name) throw new HttpError(400, "name is required");

  const product = await prisma.product.create({
    data: {
      barcode: barcode || null,
      barcodeType: barcodeType || null,
      name,
      description,
      manufacturer,
      category,
      sku,
      partNumber,
      reorderThreshold,
      createdBy: req.user!.id,
    },
  });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const allowedFields = [
    "barcode",
    "barcodeType",
    "name",
    "description",
    "manufacturer",
    "category",
    "sku",
    "partNumber",
    "reorderThreshold",
  ] as const;
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params as { id: string };

  // Checking stock out only zeroes an inventory_items row's quantity - it doesn't remove
  // the row, and transaction history is never removed by ordinary use either. Both have
  // an ON DELETE RESTRICT foreign key to products, so a plain prisma.product.delete would
  // always fail once a product has ever been intaken, regardless of current stock level.
  // The only thing that should actually block deletion is stock still sitting somewhere;
  // once that's zero, clean up the now-inert inventory rows and history ourselves so the
  // delete can proceed.
  const images = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id },
      include: { images: true, inventoryItems: true },
    });
    if (!product) throw new HttpError(404, "Product not found");

    const totalInStock = product.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalInStock > 0) {
      const locationCount = product.inventoryItems.filter((item) => item.quantity > 0).length;
      throw new HttpError(
        409,
        `This product still has ${totalInStock} unit(s) in stock across ${locationCount} location(s). Check out all remaining stock before deleting.`,
      );
    }

    await tx.transaction.deleteMany({ where: { productId: id } });
    await tx.inventory.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });

    return product.images;
  });

  for (const image of images) {
    deleteImageFile(image.filePath);
  }
  res.status(204).end();
}

export async function addProductSource(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { label, url, notes } = req.body as { label?: string; url?: string; notes?: string };
  if (!label || !url) {
    throw new HttpError(400, "label and url are required");
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new HttpError(404, "Product not found");

  const source = await prisma.productSource.create({
    data: { productId: id, label, url, notes, createdBy: req.user!.id },
    include: { createdByUser: { select: { id: true, username: true, displayName: true, role: true } } },
  });
  res.status(201).json(source);
}

export async function deleteProductSource(req: Request, res: Response) {
  const { id, sourceId } = req.params as { id: string; sourceId: string };
  const source = await prisma.productSource.findFirst({ where: { id: sourceId, productId: id } });
  if (!source) throw new HttpError(404, "Source not found");

  await prisma.productSource.delete({ where: { id: sourceId } });
  res.status(204).end();
}

export async function uploadProductImage(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const file = req.file;
  if (!file) throw new HttpError(400, "image file is required");

  const relativePath = path.join("products", id, file.filename);
  const existingPrimary = await prisma.productImage.findFirst({ where: { productId: id, isPrimary: true } });

  const image = await prisma.productImage.create({
    data: {
      productId: id,
      filePath: relativePath,
      isPrimary: !existingPrimary,
      uploadedBy: req.user!.id,
    },
  });
  res.status(201).json(image);
}

export async function streamProductImage(req: Request, res: Response) {
  const { id, imageId } = req.params as { id: string; imageId: string };
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
  if (!image) throw new HttpError(404, "Image not found");

  const absolutePath = path.resolve(env.imagesDir, image.filePath);
  if (!fs.existsSync(absolutePath)) throw new HttpError(404, "Image file missing");
  res.sendFile(absolutePath);
}

export async function deleteProductImage(req: Request, res: Response) {
  const { id, imageId } = req.params as { id: string; imageId: string };
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId: id } });
  if (!image) throw new HttpError(404, "Image not found");

  await prisma.productImage.delete({ where: { id: imageId } });
  deleteImageFile(image.filePath);
  res.status(204).end();
}
