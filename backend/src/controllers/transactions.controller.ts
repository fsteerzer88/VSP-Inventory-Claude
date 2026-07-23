import type { Request, Response } from "express";
import { prisma } from "../config/prisma";

export async function listTransactions(req: Request, res: Response) {
  const { productId, locationId, userId, from, to } = req.query as {
    productId?: string;
    locationId?: string;
    userId?: string;
    from?: string;
    to?: string;
  };

  const transactions = await prisma.transaction.findMany({
    where: {
      productId: productId || undefined,
      locationId: locationId || undefined,
      performedBy: userId || undefined,
      performedAt:
        from || to
          ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            }
          : undefined,
    },
    include: {
      product: true,
      location: true,
      performedByUser: { select: { id: true, username: true, displayName: true, role: true } },
    },
    orderBy: { performedAt: "desc" },
    take: 200,
  });
  res.json(transactions);
}
