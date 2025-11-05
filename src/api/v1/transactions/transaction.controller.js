/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับธุรกรรม (Transaction)
 * @description ไฟล์นี้ทำหน้าที่เป็นตัวกลางรับคำขอจาก Client, จัดการไฟล์ที่อัปโหลด (สลิป),
 * เรียกใช้ Service ที่เหมาะสมเพื่อจัดการตรรกะ, และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/transaction
 * @requires services/transaction.service - Service สำหรับจัดการตรรกะของ Transaction
 * @requires services/slip.service - Service สำหรับการอัปโหลดและจัดการไฟล์สลิป
 * @requires services/qstash.service - Service สำหรับการจัดตารางงานเบื้องหลัง (Background Jobs)
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import transactionService from "./transaction.service.js";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";
import slipService from "../slips/slip.service.js";
import qstashService from "../qstash/qstash.service.js";
import notificationService from "../notifications/notification.service.js";

/**
คอนโทรลเลอร์สำหรับสร้างธุรกรรมการออมเงิน (ฝากเงิน)
@description รับไฟล์สลิปและข้อมูลธุรกรรม, อัปโหลดสลิป, สร้างบันทึกธุรกรรมในสถานะ PENDING,
และจัดตารางงาน (schedule) สำหรับการตรวจสอบสลิปในเบื้องหลังผ่าน QStash
@param {object} req - อ็อบเจกต์ Express Request ที่มี req.file (สลิป) และ req.body (ข้อมูลธุรกรรม)
@param {object} res - อ็อบเจกต์ Express Response
*/
const createSavingTransaction = catchAsync(async (req, res) => {
  const imageInfo = await slipService.uploadSlip(req.file, req.body.walletId);
  const newTransaction = await transactionService.createSavingTransaction(req.body, imageInfo.url);
  const qstashJob = await qstashService.scheduleSlipVerification(req.body.userId, newTransaction.id, imageInfo.url);
  res.status(httpStatus.CREATED).json({ newTransaction, qstashJob });
});

/**
 * คอนโทรลเลอร์สำหรับอัปเดตสถานะธุรกรรมหลังการตรวจสอบสลิป (เวอร์ชันเก่า)
 * @description รับ `transactionId` จาก URL และ `code` กับ `amount` จาก body เพื่ออัปเดตสถานะ
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const updateTransaction = catchAsync(async (req, res) => {
  const updatedTransaction = await transactionService.updateTransaction(
    req.body.code,
    req.params.transactionId,
    req.body.amount,
  );
  res.status(httpStatus.OK).json(updatedTransaction);
});

/**
 * คอนโทรลเลอร์สำหรับสร้างคำขอถอนเงิน
 * @description รับข้อมูลการถอนเงินจาก Request Body, เรียกใช้ Service เพื่อสร้างธุรกรรมในสถานะ PENDING,
 * และส่งข้อมูลธุรกรรมที่สร้างใหม่กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลการถอนใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createWithdrawTransaction = catchAsync(async (req, res) => {
  const { amount, bank, accountNumber, accountName, userId } = req.body;
  const newTransaction = await transactionService.createWithdrawTransaction(userId, amount, {
    bank,
    accountNumber,
    accountName,
  });
  res.status(httpStatus.CREATED).json(newTransaction);
});

/**
 * คอนโทรลเลอร์สำหรับจัดการการโอนเงินภายในระบบ
 * @description รับข้อมูลผู้ส่ง, ผู้รับ, จำนวนเงิน, และ PIN จาก Request Body,
 * เรียกใช้ Service เพื่อดำเนินการโอนแบบ Atomic, และส่งผลลัพธ์กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลการโอนใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createInternalTransfer = catchAsync(async (req, res) => {
  const { userId, recipientUserId, amount, pin, line_user_id } = req.body;
  const { senderTransaction, receiverTransaction } = await transactionService.createInternalTransfer(userId, {
    line_user_id,
    recipientUserId,
    amount,
    pin,
  });
  if (senderTransaction && receiverTransaction) {
  }
  res.status(httpStatus.CREATED).json(senderTransaction);
});

/**
 * คอนโทรลเลอร์สำหรับจัดการการโอนเงินภายในระบบ
 * @description รับข้อมูลผู้ส่ง, ผู้รับ, จำนวนเงิน, และ PIN จาก Request Body,
 * เรียกใช้ Service เพื่อดำเนินการโอนแบบ Atomic, และส่งผลลัพธ์กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลการโอนใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getWalletTransactions = catchAsync(async (req, res) => {
  const { walletId } = req.params;
  const options = req.query;
  const transactions = await transactionService.getWalletTransaction(walletId, options);
  res.status(httpStatus.OK).json(transactions);
});

/**
 * คอนโทรลเลอร์สำหรับดึงรายการธุรกรรมที่สำเร็จล่าสุดของ Wallet
 * @description รับ `walletId` จาก URL parameters, เรียกใช้ Service เพื่อดึง 5 รายการล่าสุดที่สำเร็จ,
 * และส่งผลลัพธ์กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.walletId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getSuccessTransactions = catchAsync(async (req, res) => {
  const { walletId } = req.params;
  const options = req.query;
  const transactions = await transactionService.getSuccessTransaction(walletId, options);
  res.status(httpStatus.OK).json(transactions);
});

/**
 * คอนโทรลเลอร์สำหรับดึงธุรกรรมพร้อมสถานะภาษาไทย
 * @description รับ `walletId` จาก URL parameters และเรียกใช้ Service ที่ใช้ Aggregation Pipeline
 * @param {object} req - อ็อบเจกต์ Express Request
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getThaiTransactions = catchAsync(async (req, res) => {
  const { walletId } = req.params;
  const transactions = await transactionService.getTransactionsWithThaiStatus(walletId);
  res.status(httpStatus.OK).json(transactions);
});

/**
 * คอนโทรลเลอร์สำหรับส่งออกรายการเดินบัญชีเป็น PDF ทางอีเมล
 * @description รับ `email`, `walletId`, และช่วงวันที่จาก Request Body, เรียกใช้ Service
 * เพื่อสร้างและส่งไฟล์ PDF, และส่งผลการดำเนินการกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const exportToPdf = catchAsync(async (req, res) => {
  const { email, endDate, startDate, walletId } = req.body;
  const result = await transactionService.exportToPdf(email, walletId, startDate, endDate);
  res.status(httpStatus.OK).json(result);
});

/**
 * คอนโทรลเลอร์สำหรับดึงธุรกรรมทั้งหมดในระบบ (สำหรับ Admin)
 * @description รับเงื่อนไขการแบ่งหน้า, การจัดเรียง, และการกรองจาก Query String,
 * เรียกใช้ Service, และส่งรายการธุรกรรมพร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี req.query
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getTransactions = catchAsync(async (req, res) => {
  const transactions = await transactionService.getTransactions(req.query);
  res.status(httpStatus.OK).json(transactions);
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
