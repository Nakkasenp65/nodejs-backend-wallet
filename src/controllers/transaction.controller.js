import transactionService from '../services/transaction.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

const createTransaction = catchAsync(async (req, res) => {
  const transactionData = req.body;
  console.log('Uploaded file info:', req.file);
  transactionData.amount = parseFloat(transactionData.amount);
  const newTransaction = await transactionService.createTransaction(req.params.walletId, transactionData);
  res.status(httpStatus.CREATED).json(newTransaction);
});

const getTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.getTransactions(req.params.walletId, req.query);
  res.status(httpStatus.OK).json(transactions);
});

export default {
  createTransaction,
  getTransactions,
};
