import { Router } from "express";
import * as usersController from "../controllers/users.controller";
import { requireRole } from "../middleware/auth.middleware";

export const usersRoutes = Router();

usersRoutes.use(requireRole("admin"));
usersRoutes.get("/", usersController.listUsers);
usersRoutes.post("/", usersController.createUser);
usersRoutes.patch("/:id", usersController.updateUser);
