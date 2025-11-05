/**
 * @file TypeScript version of transaction controller
 * @description This TS file imports from JS service files - they work together!
 */

import { Request, Response } from "express";
import transactionService from "./transaction.service.js";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";
import slipService from "../slips/slip.service.js";
import qstashService from "../qstash/qstash.service.js";

/**
 * Controller for creating a saving transaction (deposit)
 * @description Accepts slip image, uploads it, creates pending transaction, schedules verification
 */
const createSavingTransaction = catchAsync(async (req: Request, res: Response) => {
  const imageInfo = await slipService.uploadSlip(req.file, req.body.walletId);
  const newTransaction = await transactionService.createSavingTransaction(req.body, imageInfo.url);
  const qstashJob = await qstashService.scheduleSlipVerification(req.body.userId, newTransaction.id, imageInfo.url);
  res.status(httpStatus.CREATED).json({ newTransaction, qstashJob });
});

/**
 * Controller for updating transaction after slip verification (legacy version)
 */
const updateTransaction = catchAsync(async (req: Request, res: Response) => {
  const updatedTransaction = await transactionService.updateTransaction(
    req.body.code,
    req.params.transactionId,
    req.body.amount,
  );
  res.status(httpStatus.OK).json(updatedTransaction);
});

/**
 * Controller for creating a withdrawal request
 */
const createWithdrawTransaction = catchAsync(async (req: Request, res: Response) => {
  const { amount, bank, accountNumber, accountName, userId } = req.body;
  const newTransaction = await transactionService.createWithdrawTransaction(userId, amount, {
    bank,
    accountNumber,
    accountName,
  });
  res.status(httpStatus.CREATED).json(newTransaction);
});

/**
 * Controller for internal transfer between users
 */
const createInternalTransfer = catchAsync(async (req: Request, res: Response) => {
  const { userId, recipientUserId, amount, pin, line_user_id } = req.body;
  const { senderTransaction, receiverTransaction } = await transactionService.createInternalTransfer(userId, {
    line_user_id,
    recipientUserId,
    amount,
    pin,
  });
  if (senderTransaction && receiverTransaction) {
    // Transaction successful
  }
  res.status(httpStatus.CREATED).json(senderTransaction);
});

/**
 * Controller for getting wallet transactions
 */
const getWalletTransactions = catchAsync(async (req: Request, res: Response) => {
  const { walletId } = req.params;
  const options = req.query;
  const transactions = await transactionService.getWalletTransaction(walletId, options);
  res.status(httpStatus.OK).json(transactions);
});

/**
 * Controller for getting latest successful transactions
 */
const getSuccessTransactions = catchAsync(async (req: Request, res: Response) => {
  const { walletId } = req.params;
  const options = req.query;
  const transactions = await transactionService.getSuccessTransaction(walletId, options);
  res.status(httpStatus.OK).json(transactions);
});

/**
 * Controller for getting transactions with Thai status labels
 */
const getThaiTransactions = catchAsync(async (req: Request, res: Response) => {
  const { walletId } = req.params;
  const transactions = await transactionService.getTransactionsWithThaiStatus(walletId);
  res.status(httpStatus.OK).json(transactions);
});

/**
 * Controller for exporting transactions to PDF via email
 */
const exportToPdf = catchAsync(async (req: Request, res: Response) => {
  const { email, endDate, startDate, walletId } = req.body;
  const result = await transactionService.exportToPdf(email, walletId, startDate, endDate);
  res.status(httpStatus.OK).json(result);
});

/**
 * Controller for getting all transactions (Admin)
 * ⚠️ FIXED: Changed res.httpStatus to res.status
 */
const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const transactions = await transactionService.getTransactions(req.query);
  res.status(httpStatus.OK).json(transactions); // ✅ FIXED
});

export default {
  createSavingTransaction,
  createWithdrawTransaction,
  createInternalTransfer,
  getWalletTransactions,
  getSuccessTransactions,
  getThaiTransactions,
  updateTransaction,
  exportToPdf,
  getTransactions,
};
