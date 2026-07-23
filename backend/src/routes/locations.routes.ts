import { Router } from "express";
import * as locationsController from "../controllers/locations.controller";

export const locationsRoutes = Router();

locationsRoutes.get("/", locationsController.listLocations);
locationsRoutes.get("/lookup", locationsController.lookupLocation);
locationsRoutes.get("/:id", locationsController.getLocation);
locationsRoutes.get("/:id/qrcode.svg", locationsController.getLocationQrCode);
locationsRoutes.post("/", locationsController.createLocation);
locationsRoutes.patch("/:id", locationsController.updateLocation);
locationsRoutes.delete("/:id", locationsController.deleteLocation);
