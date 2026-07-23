import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";

export const inventoryRoutes = Router();

inventoryRoutes.get("/", inventoryController.listInventory);
inventoryRoutes.post("/intake", inventoryController.intake);
inventoryRoutes.post("/checkout", inventoryController.checkout);
inventoryRoutes.get("/:id", inventoryController.getInventoryItem);
