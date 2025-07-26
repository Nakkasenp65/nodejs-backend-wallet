import transactionService from '../services/transaction.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

const createTransaction = catchAsync(async (req, res) => {
  console.log(req.params.userId);
  const newTransaction = await transactionService.createTransaction(req.params.userId, req.body);
  res.status(httpStatus.CREATED).json(newTransaction);
});

const getTransactions = catchAsync(async (req, res) => {
  console.log(req.params.userId);
  console.log(req.query);
  const transactions = await transactionService.getTransactions(req.params.userId, req.query);
  res.status(httpStatus.OK).json(transactions);
});

export default {
  createTransaction,
  getTransactions,
};
