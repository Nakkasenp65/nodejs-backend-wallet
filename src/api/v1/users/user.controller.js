/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับผู้ใช้ (User)
 * @description ไฟล์นี้ทำหน้าที่รับคำขอจาก Client, ดึงข้อมูลที่จำเป็นจาก Request (params, query, body),
 * เรียกใช้ Service ที่เหมาะสมเพื่อจัดการตรรกะ, และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/user
 * @requires services/user.service - Service สำหรับจัดการตรรกะของ User
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import userService from "./user.service.js";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";

/**
 * คอนโทรลเลอร์สำหรับสร้างผู้ใช้ใหม่
 * @description รับข้อมูลผู้ใช้จาก Request Body, เรียกใช้ Service เพื่อสร้างผู้ใช้,
 * และส่งข้อมูลผู้ใช้ที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลผู้ใช้ใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createUser = catchAsync(async (req, res) => {
  const newUser = await userService.createUserWithGoal(req.body);
  return res.status(201).json(newUser);
});

/**
 * คอนโทรลเลอร์สำหรับอัปเดตข้อมูลผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service เพื่ออัปเดตข้อมูล, และส่งข้อมูลผู้ใช้ที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const updateUser = catchAsync(async (req, res) => {
  const updatedUser = await userService.updateUser(req.params.line_user_id, req.body);
  res.status(httpStatus.OK).json(updatedUser);
});

/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลผู้ใช้รายบุคคล
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อดึงข้อมูล,
 * และส่งข้อมูลผู้ใช้กลับไปเป็น JSON response
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getUser = catchAsync(async (req, res) => {
  const { line_user_id } = req.params;
  const user = await userService.getUser(line_user_id);
  return res.status(httpStatus.OK).json(user);
});

/**
 * คอนโทรลเลอร์สำหรับดึงรายการผู้ใช้ทั้งหมด
 * @description รับเงื่อนไขการกรองและการแบ่งหน้าจาก Query String, เรียกใช้ Service,
 * และส่งรายการผู้ใช้พร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่อาจมี `req.query` (page, pageSize, search, role)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getUsers = catchAsync(async (req, res) => {
  const { page = 1, pageSize = 10, search, role } = req.query;
  const result = await userService.getUsers({ page, pageSize, search, role });
  res.status(httpStatus.OK).json(result);
});

/**
 * คอนโทรลเลอร์สำหรับค้นหาผู้รับ (Recipient)
 * @description รับประเภทและค่าที่ใช้ค้นหาจาก Query String (`type`, `value`),
 * เรียกใช้ Service เพื่อค้นหา, และส่งข้อมูลผู้ใช้ที่พบกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query.type` และ `req.query.value`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const searchRecipient = catchAsync(async (req, res) => {
  const { type, value } = req.query;
  const recipient = await userService.findRecipient({ type, value });
  res.status(httpStatus.OK).json(recipient);
});

/**
 * คอนโทรลเลอร์สำหรับตรวจสอบสถานะผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อตรวจสอบ,
 * และส่งสถานะ (เป็นผู้ใช้ใหม่หรือไม่, สถานะการล็อก) กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const checkStatus = catchAsync(async (req, res) => {
  const { line_user_id } = req.params;
  const status = await userService.checkUserStatus(line_user_id);
  res.status(httpStatus.OK).json(status);
});

/**
 * คอนโทรลเลอร์สำหรับดึงประวัติการแนะนำเพื่อน
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service,
 * และส่งประวัติการแนะนำเพื่อนกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getReferralHistory = catchAsync(async (req, res) => {
  const { line_user_id } = req.params;
  const history = await userService.getReferralHistory(line_user_id);
  res.status(httpStatus.OK).json(history);
});

/**
 * คอนโทรลเลอร์สำหรับสร้างบันทึกการแนะนำ
 * @description รับ `newcomerId` และ `referralCode` จาก Request Body,
 * เรียกใช้ Service เพื่อสร้างบันทึก, และส่งผลลัพธ์กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.body.newcomerId` และ `req.body.referralCode`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createReferral = catchAsync(async (req, res) => {
  const { newcomerId, referralCode } = req.body;
  const referral = await userService.createReferral(newcomerId, referralCode);
  res.status(httpStatus.OK).json(referral);
});

/**
 * คอนโทรลเลอร์สำหรับตั้งสถานะล็อกบัญชีผู้ใช้
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service เพื่อล็อกบัญชี,
 * และส่งข้อความยืนยันกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const setLocked = catchAsync(async (req, res) => {
  const { line_user_id } = req.params;
  const locked = await userService.setLocked(line_user_id);
  res.status(httpStatus.OK).json({ message: "locked successfully!" });
});

/**
 * คอนโทรลเลอร์สำหรับปลดล็อกบัญชีผู้ใช้
 * @description รับ `line_user_id` และ `pin` จาก Request Body,
 * เรียกใช้ Service เพื่อปลดล็อก, และส่งผลลัพธ์กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.body.line_user_id` และ `req.body.pin`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const unlock = catchAsync(async (req, res) => {
  const { line_user_id, pin } = req.body;
  const unlock = await userService.unlock(line_user_id, pin);
  res.status(httpStatus.OK).json(unlock);
});

/**
 * คอนโทรลเลอร์สำหรับดึงสถานะการล็อกและสถานะความเป็นผู้ใช้ใหม่
 * @description รับ `line_user_id` จาก URL parameters, เรียกใช้ Service ที่เกี่ยวข้อง,
 * และส่งสถานะ `isLocked` และ `isNewUser` กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.line_user_id`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getLockStatus = catchAsync(async (req, res) => {
  const { line_user_id } = req.params;
  const { isNewUser } = await userService.checkUserStatus(line_user_id);
  const { isLocked } = await userService.getLockStatus(line_user_id);
  res.status(httpStatus.OK).json({ isLocked, isNewUser });
});

export default {
  createUser,
  updateUser,
  getUser,
  getUsers,
  searchRecipient,
  checkStatus,
  getReferralHistory,
  createReferral,
  setLocked,
  unlock,
  getLockStatus,
};
