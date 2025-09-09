import httpStatus from 'http-status';
import adminService from './admin.service.js';
import catchAsync from '../../../utils/catchAsync.js';
import transactionService from '../transactions/transaction.service.js';
import userService from '../users/user.controller.js';
import missionService from '../missions/mission.service.js';
import lineService from '../lines/line.service.js';
import notificationService from '../notifications/notification.service.js';

const getDashboardData = catchAsync(async (req, res) => {
  const data = await adminService.getDashboardData();
  res.status(httpStatus.OK).json(data);
});

const getTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.getTransactions(req.query);
  res.status(httpStatus.OK).json(transactions);
});

const editTransaction = catchAsync(async (req, res) => {
  const transaction = await transactionService.editTransaction(req.params.transactionId, req.file, req.body);
  console.log('UPDATE:', transaction);
  const userId = transaction.wallet.user.id;
  // const fullname = transaction.wallet.user.fullname
  // const bank = transaction.bank
  const amount = transaction.amount;
  const notification = await notificationService.sendWithdrawSuccessNotification(userId, amount, req.params.transactionId);
  res.status(httpStatus.OK).json(transaction);
});

const deleteTransaction = catchAsync(async (req, res) => {
  const transaction = await transactionService.deleteTransaction(req.params.transactionId);
  res.status(httpStatus.OK).json(transaction);
});

const editUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserByAdmin(req.params.userId, req.body);
  res.status(httpStatus.OK).json(user);
});

const getMissions = catchAsync(async (req, res) => {
  console.log(req.params);
  const missions = await missionService.getAllMissionsForAdmin(req.query);
  res.status(httpStatus.OK).json(missions);
});

export default { getDashboardData, getTransactions, editTransaction, deleteTransaction, editUser, getMissions };
