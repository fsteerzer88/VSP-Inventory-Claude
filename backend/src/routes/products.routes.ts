import { Router } from "express";
import * as productsController from "../controllers/products.controller";
import { uploadProductImage as uploadProductImageMiddleware } from "../middleware/upload.middleware";

export const productsRoutes = Router();

productsRoutes.get("/", productsController.listProducts);
productsRoutes.get("/lookup", productsController.lookupProductByBarcode);
productsRoutes.get("/:id", productsController.getProduct);
productsRoutes.post("/", productsController.createProduct);
productsRoutes.patch("/:id", productsController.updateProduct);
productsRoutes.post(
  "/:id/images",
  uploadProductImageMiddleware.single("image"),
  productsController.uploadProductImage,
);
productsRoutes.get("/:id/images/:imageId", productsController.streamProductImage);
productsRoutes.delete("/:id/images/:imageId", productsController.deleteProductImage);
