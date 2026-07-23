import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { usersRoutes } from "./users.routes";
import { productsRoutes } from "./products.routes";
import { locationsRoutes } from "./locations.routes";
import { inventoryRoutes } from "./inventory.routes";
import { transactionsRoutes } from "./transactions.routes";
import { requireAuth } from "../middleware/auth.middleware";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", requireAuth, usersRoutes);
apiRouter.use("/products", requireAuth, productsRoutes);
apiRouter.use("/locations", requireAuth, locationsRoutes);
apiRouter.use("/inventory", requireAuth, inventoryRoutes);
apiRouter.use("/transactions", requireAuth, transactionsRoutes);
