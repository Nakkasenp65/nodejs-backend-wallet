// สังเกตว่าเราจะ import Type จาก 'express' แทน 'next'
import userService from '../services/user.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

const createUser = catchAsync(async (req, res, next) => {
  const newUser = await userService.createUser(req.body);
  return res.status(201).json(newUser);
});

const getCurrentUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUserByLiffId(req.params.userId);
  return res.status(httpStatus.OK).json(user);
});

const checkStatus = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const status = await userService.checkUserStatus(userId);
  res.status(httpStatus.OK).json({ success: true, data: status });
});

export default {
  createUser,
  getCurrentUser,
  checkStatus,
};
