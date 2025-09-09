import transactionService from './transaction.service.js';
import httpStatus from 'http-status';
import catchAsync from '../../../utils/catchAsync.js';
import slipService from '../slips/slip.service.js';
import qstashService from '../qstash/qstash.service.js';
import notificationService from '../notifications/notification.service.js';

const createSavingTransaction = catchAsync(async (req, res) => {
  const imageInfo = await slipService.uploadSlip(req.file, req.body.walletId);
  const newTransaction = await transactionService.createSavingTransaction(req.body, imageInfo.url);
  const qstashJob = await qstashService.scheduleSlipVerification(req.body.userId, newTransaction.id, imageInfo.url);
  res.status(httpStatus.CREATED).json({ newTransaction, qstashJob });
});

const updateTransaction = catchAsync(async (req, res) => {
  const updatedTransaction = await transactionService.updateTransaction(req.body.code, req.params.transactionId, req.body.amount);
  res.status(httpStatus.OK).json(updatedTransaction);
});

const createWithdrawTransaction = catchAsync(async (req, res) => {
  const { amount, bank, accountNumber, accountName, userId } = req.body;
  const newTransaction = await transactionService.createWithdrawTransaction(userId, amount, {
    bank,
    accountNumber,
    accountName,
  });
  res.status(httpStatus.CREATED).json(newTransaction);
});

const createInternalTransfer = catchAsync(async (req, res) => {
  const { userId, recipientUserId, amount, pin, line_user_id } = req.body;
  const { senderTransaction, receiverTransaction } = await transactionService.createInternalTransfer(userId, {
    line_user_id,
    recipientUserId,
    amount,
    pin,
  });
  if (senderTransaction && receiverTransaction) {
    const receiverNotification = await notificationService.sendTransferReceived(recipientUserId, {
      amount,
      fromName: receiverTransaction.from,
      note: receiverTransaction.description,
    });
  }
  res.status(httpStatus.CREATED).json(senderTransaction);
});

const getWalletTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.getWalletTransaction(req.params.walletId, req.query);
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

const exportToPdf = catchAsync(async (req, res) => {
  const { email, endDate, startDate, walletId } = req.body;
  const result = await transactionService.exportToPdf(email, walletId, startDate, endDate);
  res.status(httpStatus.OK).json(result);
});

const getTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.getTransactions(req.query);
  res.httpStatus(OK).json(transactions);
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
