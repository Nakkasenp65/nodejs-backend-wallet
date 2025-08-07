import transactionService from '../services/transaction.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import slipService from '../services/slip.service.js';
import qstashService from '../services/qstash.service.js';

const createSavingTransaction = catchAsync(async (req, res) => {
  const imageInfo = await slipService.uploadSlip(req.file, req.body.walletId);
  const newTransaction = await transactionService.createSavingTransaction(req.body, imageInfo.url);
  const qstashJob = await qstashService.scheduleSlipVerification(newTransaction.id, imageInfo.url);
  res.status(httpStatus.CREATED).json({ newTransaction, qstashJob });
});

const updateTransaction = catchAsync(async (req, res) => {
  const updatedTransaction = await transactionService.updateTransaction(
    req.body.code,
    req.params.transactionId,
    req.body.amount,
  );
  res.status(httpStatus.OK).json(updatedTransaction);
});

const verifyTransaction = catchAsync(async (req, res) => {
  // เรียก verifySlip -> เอาผลไปเรียก confirmTransaction
});

const getTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.getTransactions(req.params.walletId, req.query);
  res.status(httpStatus.OK).json(transactions);
});

const getSuccessTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.getSuccessTransaction(req.params.walletId, req.query);
  res.status(httpStatus.OK).json(transactions);
});

const getThaiTransactions = catchAsync(async (req, res) => {
  console.log(req.params.walletId);
  const transactions = await transactionService.getTransactionsWithThaiStatus(req.params.walletId);
  res.status(httpStatus.OK).json(transactions);
});

export default {
  createSavingTransaction,
  getTransactions,
  getSuccessTransactions,
  getThaiTransactions,
  updateTransaction,
};
