import { Router } from "express";
import * as transactionsController from "../controllers/transactions.controller";

export const transactionsRoutes = Router();

transactionsRoutes.get("/", transactionsController.listTransactions);
