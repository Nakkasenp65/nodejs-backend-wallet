import transactionService from '../services/transaction.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

const createSavingTransaction = catchAsync(async (req, res) => {
  const transactionData = req.body;
  transactionData.amount = parseFloat(transactionData.amount);
  const newTransaction = await transactionService.createSavingTransaction(
    req.params.walletId,
    transactionData,
    req.file,
  );
  res.status(httpStatus.CREATED).json(newTransaction);
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
};
