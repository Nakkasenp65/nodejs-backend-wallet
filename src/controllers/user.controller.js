import userService from '../services/user.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

/**
 * @description สร้างผู้ใช้ใหม่พร้อมกับข้อมูลเริ่มต้น (Goal, Wallet, และภารกิจ Onboarding)
 * @route POST /v1/user
 * @param {object} req - Express request object, คาดว่าจะมีข้อมูลผู้ใช้ทั้งหมดใน `req.body`
 * @param {object} res - Express response object, ใช้สำหรับส่งข้อมูลกลับไปยัง client
 * @param {function} next - Express next middleware function
 * @returns {Promise<void>} ส่ง response กลับไปพร้อม status code 201 และข้อมูล user ที่สร้างใหม่ในรูปแบบ JSON
 */
const createUser = catchAsync(async (req, res, next) => {
  const newUser = await userService.createUserWithGoal(req.body);
  return res.status(201).json(newUser);
});

/**
 * @description ดึงข้อมูลผู้ใช้ทั้งหมดพร้อม relations (wallet, goal, etc.) โดยใช้ Line User ID
 * @route GET /v1/user/:userId
 * @param {object} req - Express request object, คาดว่าจะมี Line User ID ใน `req.params.userId`
 * @param {object} res - Express response object, ใช้สำหรับส่งข้อมูลกลับไปยัง client
 * @param {function} next - Express next middleware function
 * @returns {Promise<void>} ส่ง response กลับไปพร้อม status code 200 และข้อมูล user ทั้งหมดในรูปแบบ JSON, หรือ `null` หากไม่พบ
 */
const getUserWithLineUserId = catchAsync(async (req, res, next) => {
  const user = await userService.getUserByLineUserId(req.params.userId);
  return res.status(httpStatus.OK).json(user);
});

/**
 * @description ตรวจสอบสถานะของผู้ใช้ว่าเป็นผู้ใช้ใหม่หรือไม่ โดยใช้ Line User ID
 * @route GET /v1/user/status/:userId
 * @param {object} req - Express request object, คาดว่าจะมี Line User ID ใน `req.params.userId`
 * @param {object} res - Express response object, ใช้สำหรับส่งข้อมูลกลับไปยัง client
 * @returns {Promise<void>} ส่ง response กลับไปพร้อม status code 200 และ object ที่ระบุสถานะ เช่น `{ isNewUser: true }`
 */
const checkStatus = catchAsync(async (req, res) => {
  const status = await userService.checkUserStatus(req.params.userId);
  res.status(httpStatus.OK).json(status);
});

export default {
  createUser,
  getUserWithLineUserId,
  checkStatus,
};
