import type { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { HttpError } from "../middleware/error.middleware";

export async function listInventory(req: Request, res: Response) {
  const { locationId, productId, q } = req.query as {
    locationId?: string;
    productId?: string;
    q?: string;
  };

  const items = await prisma.inventory.findMany({
    where: {
      locationId: locationId || undefined,
      productId: productId || undefined,
      product: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    include: { product: { include: { images: true } }, location: true },
    orderBy: { updatedAt: "desc" },
  });
  res.json(items);
}

export async function getInventoryItem(req: Request, res: Response) {
  const item = await prisma.inventory.findUnique({
    where: { id: req.params.id as string },
    include: {
      product: { include: { images: true } },
      location: true,
      transactions: {
        orderBy: { performedAt: "desc" },
        include: { performedByUser: { select: { id: true, username: true, displayName: true, role: true } } },
      },
    },
  });
  if (!item) throw new HttpError(404, "Inventory item not found");
  res.json(item);
}

interface IntakeBody {
  productId?: string;
  newProduct?: {
    barcode?: string;
    barcodeType?: string;
    name: string;
    description?: string;
    manufacturer?: string;
    category?: string;
    sku?: string;
  };
  locationId: string;
  quantity: number;
  notes?: string;
}

export async function intake(req: Request, res: Response) {
  const body = req.body as IntakeBody;
  const { locationId, quantity, notes } = body;
  if (!locationId || !quantity || quantity <= 0) {
    throw new HttpError(400, "locationId and a positive quantity are required");
  }
  if (!body.productId && !body.newProduct) {
    throw new HttpError(400, "productId or newProduct is required");
  }

  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) throw new HttpError(404, "Location not found");

  const result = await prisma.$transaction(async (tx) => {
    let productId = body.productId;

    if (!productId && body.newProduct) {
      const created = await tx.product.create({
        data: {
          barcode: body.newProduct.barcode || null,
          barcodeType: body.newProduct.barcodeType || null,
          name: body.newProduct.name,
          description: body.newProduct.description,
          manufacturer: body.newProduct.manufacturer,
          category: body.newProduct.category,
          sku: body.newProduct.sku,
          createdBy: req.user!.id,
        },
      });
      productId = created.id;
    }

    if (!productId) throw new HttpError(400, "Could not resolve product");

    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new HttpError(404, "Product not found");

    const inventoryItem = await tx.inventory.upsert({
      where: { productId_locationId: { productId, locationId } },
      create: { productId, locationId, quantity },
      update: { quantity: { increment: quantity } },
    });

    const transaction = await tx.transaction.create({
      data: {
        type: "intake",
        inventoryItemId: inventoryItem.id,
        productId,
        locationId,
        quantityDelta: quantity,
        quantityAfter: inventoryItem.quantity,
        performedBy: req.user!.id,
        notes,
      },
    });

    return { inventoryItem, transaction, productId };
  });

  res.status(201).json(result);
}

interface CheckoutBody {
  inventoryItemId?: string;
  productId?: string;
  locationId?: string;
  quantity: number;
  notes?: string;
}

export async function checkout(req: Request, res: Response) {
  const body = req.body as CheckoutBody;
  const { quantity, notes } = body;
  if (!quantity || quantity <= 0) {
    throw new HttpError(400, "A positive quantity is required");
  }
  if (!body.inventoryItemId && !(body.productId && body.locationId)) {
    throw new HttpError(400, "inventoryItemId or (productId and locationId) is required");
  }

  const result = await prisma.$transaction(async (tx) => {
    const inventoryItem = body.inventoryItemId
      ? await tx.inventory.findUnique({ where: { id: body.inventoryItemId } })
      : await tx.inventory.findUnique({
          where: { productId_locationId: { productId: body.productId!, locationId: body.locationId! } },
        });

    if (!inventoryItem) throw new HttpError(404, "Inventory item not found");
    if (inventoryItem.quantity < quantity) {
      throw new HttpError(409, `Only ${inventoryItem.quantity} in stock at this location`);
    }

    const updated = await tx.inventory.update({
      where: { id: inventoryItem.id },
      data: { quantity: { decrement: quantity } },
    });

    const transaction = await tx.transaction.create({
      data: {
        type: "checkout",
        inventoryItemId: updated.id,
        productId: updated.productId,
        locationId: updated.locationId,
        quantityDelta: -quantity,
        quantityAfter: updated.quantity,
        performedBy: req.user!.id,
        notes,
      },
    });

    return { inventoryItem: updated, transaction };
  });

  res.status(201).json(result);
}
