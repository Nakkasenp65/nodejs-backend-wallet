/**
 * @file Transaction routes - Updated to import from TS controller
 */
import multer from "multer";
// ✅ Import from .ts file - no extension needed in TS
import transactionController from "./transaction.controller.js";
import { Router } from "express";

const transactionRouter = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @route POST /api/transactions
 * @description Create saving transaction (deposit) with slip
 */
transactionRouter.post("/", upload.single("slipImage"), transactionController.createSavingTransaction);

/**
 * @route POST /api/transactions/withdraw
 * @description Create withdrawal request
 */
transactionRouter.post("/withdraw", transactionController.createWithdrawTransaction);

/**
 * @route POST /api/transactions/transfer
 * @description Internal transfer between users
 */
transactionRouter.post("/transfer", transactionController.createInternalTransfer);

/**
 * @route POST /api/transactions/update/:transactionId
 * @deprecated Use new admin approval/rejection endpoints
 */
transactionRouter.post("/update/:transactionId", transactionController.updateTransaction);

/**
 * @route POST /api/transactions/export
 * @description Export statement to PDF via email
 */
transactionRouter.post("/export", transactionController.exportToPdf);

/**
 * ⚠️ FIXED: Reordered routes - specific routes BEFORE parameterized routes
 */

/**
 * @route GET /api/transactions/thai/:walletId
 * @description Get transactions with Thai status labels
 */
transactionRouter.get("/thai/:walletId", transactionController.getThaiTransactions);

/**
 * @route GET /api/transactions/success/:walletId
 * @description Get latest 5 successful transactions
 */
transactionRouter.get("/success/:walletId", transactionController.getSuccessTransactions);

/**
 * @route GET /api/transactions/:walletId
 * @description Get all transactions for wallet
 */
transactionRouter.get("/:walletId", transactionController.getWalletTransactions);

export default transactionRouter;
