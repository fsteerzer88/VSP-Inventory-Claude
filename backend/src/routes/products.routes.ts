import { Router } from "express";
import * as productsController from "../controllers/products.controller";
import { uploadProductImage as uploadProductImageMiddleware } from "../middleware/upload.middleware";
import { requireRole } from "../middleware/auth.middleware";

export const productsRoutes = Router();

productsRoutes.get("/", productsController.listProducts);
productsRoutes.get("/lookup", productsController.lookupProductByBarcode);
productsRoutes.get("/:id", productsController.getProduct);
productsRoutes.post("/", productsController.createProduct);
productsRoutes.patch("/:id", requireRole("admin"), productsController.updateProduct);
productsRoutes.delete("/:id", requireRole("admin"), productsController.deleteProduct);
productsRoutes.post("/:id/sources", requireRole("admin"), productsController.addProductSource);
productsRoutes.delete("/:id/sources/:sourceId", requireRole("admin"), productsController.deleteProductSource);
productsRoutes.post(
  "/:id/images",
  uploadProductImageMiddleware.single("image"),
  productsController.uploadProductImage,
);
productsRoutes.get("/:id/images/:imageId", productsController.streamProductImage);
productsRoutes.delete("/:id/images/:imageId", productsController.deleteProductImage);
