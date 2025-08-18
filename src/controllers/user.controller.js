import userService from '../services/user.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

/**
 * @description สร้างผู้ใช้ใหม่พร้อมกับข้อมูลเริ่มต้น (Goal, Wallet, และภารกิจ Onboarding)
 * @route POST /v1/user
 * @param {object} req - Express request object, คาดว่าจะมีข้อมูลผู้ใช้ทั้งหมดใน `req.body`
 * @param {object} res - Express response object, ใช้สำหรับส่งข้อมูลกลับไปยัง client
 * @returns {Promise<void>} ส่ง response กลับไปพร้อม status code 201 และข้อมูล user ที่สร้างใหม่ในรูปแบบ JSON
 */
const createUser = catchAsync(async (req, res) => {
  const newUser = await userService.createUserWithGoal(req.body);
  return res.status(201).json(newUser);
});

/**
 * @description อัปเดตข้อมูลส่วนตัวของผู้ใช้
 * @route PATCH /v1/user/:userId
 */
const updateUser = catchAsync(async (req, res) => {
  console.log(req.user.line_user_id);
  console.log(req.body);
  const updatedUser = await userService.updateUser(req.user.line_user_id, req.body);
  res.status(httpStatus.OK).json(updatedUser);
});

/**
 * @description ดึงข้อมูลผู้ใช้ทั้งหมดพร้อม relations (wallet, goal, etc.) โดยใช้ Line User ID
 * @route GET /v1/user/:line_user_id
 * @param {object} req - Express request object, คาดว่าจะมี Line User ID ใน `req.params.userId`
 * @param {object} res - Express response object, ใช้สำหรับส่งข้อมูลกลับไปยัง client
 * @param {function} next - Express next middleware function
 * @returns {Promise<void>} ส่ง response กลับไปพร้อม status code 200 และข้อมูล user ทั้งหมดในรูปแบบ JSON, หรือ `null` หากไม่พบ
 */
const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUser(req.params.line_user_id);
  return res.status(httpStatus.OK).json(user);
});

/**
 * @description ค้นหาผู้รับโอนด้วยเบอร์โทรศัพท์
 * @route GET /v1/user/by-phone/:phoneNumber
 */
const findUserByPhone = catchAsync(async (req, res) => {
  const { phoneNumber } = req.params;
  const recipient = await userService.findUserByPhone(phoneNumber);
  res.status(httpStatus.OK).json(recipient);
});

/**
 * @description ตรวจสอบสถานะของผู้ใช้ว่าเป็นผู้ใช้ใหม่หรือไม่ โดยใช้ Line User ID
 * @route GET /v1/user/status/:userId
 * @param {object} req - Express request object, คาดว่าจะมี Line User ID ใน `req.params.userId`
 * @param {object} res - Express response object, ใช้สำหรับส่งข้อมูลกลับไปยัง client
 * @returns {Promise<void>} ส่ง response กลับไปพร้อม status code 200 และ object ที่ระบุสถานะ เช่น `{ isNewUser: true }`
 */

const checkStatus = catchAsync(async (req, res) => {
  const status = await userService.checkUserStatus(req.params.line_user_id);
  res.status(httpStatus.OK).json(status);
});

const getReferralHistory = catchAsync(async (req, res) => {
  console.log(req.params.line_user_id);
  const history = await userService.getReferralHistory(req.params.line_user_id);
  res.status(httpStatus.OK).json(history);
});

const createReferral = catchAsync(async (req, res) => {
  const { newcomerId, referralCode } = req.body;
  const referral = await userService.createReferral(newcomerId, referralCode);
  res.status(httpStatus.OK).json(referral);
});

const setLocked = catchAsync(async (req, res) => {
  const { line_user_id } = req.params;
  const locked = await userService.setLocked(line_user_id);
  res.status(httpStatus.OK).json({ message: 'locked successfully!' });
});

const unlock = catchAsync(async (req, res) => {
  const { line_user_id, pin } = req.body;
  const unlock = await userService.unlock(line_user_id, pin);
  res.status(httpStatus.OK).json(unlock);
});

const getLockStatus = catchAsync(async (req, res) => {
  const { isLocked } = await userService.getLockStatus(req.params.line_user_id);
  const { isNewUser } = await userService.checkUserStatus(req.params.line_user_id);
  res.status(httpStatus.OK).json({ isLocked, isNewUser });
});

export default {
  // สร้าง user ใหม่
  createUser,
  // อัพเดทข้อมูล
  updateUser,
  // ดึงข้อมูลผู้ใช้ทั้งหมดพร้อม relations
  getUser,
  findUserByPhone,
  checkStatus,
  createReferral,
  getReferralHistory,
  getLockStatus,
  setLocked,
  unlock,
};
