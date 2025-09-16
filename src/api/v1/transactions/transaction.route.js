/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการธุรกรรม (Transaction)
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints ทั้งหมดที่เกี่ยวข้องกับ Transaction,
 * รวมถึงการสร้างรายการ (ฝาก/ถอน/โอน), การดึงข้อมูล, และการส่งออกข้อมูล
 * @module routes/transaction
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires multer - Middleware สำหรับจัดการ multipart/form-data (ไฟล์อัปโหลด)
 * @requires controllers/transaction.controller - Controller ที่บรรจุตรรกะการจัดการ Transaction
 */
import multer from "multer";
import transactionController from "./transaction.controller.js";
import { Router } from "express";

const transactionRouter = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @route POST /api/transactions
 * @description สร้างธุรกรรมการออมเงิน (ฝากเงิน) ใหม่โดยแนบสลิป
 * @consumes multipart/form-data
 * @access Private (Requires Authentication)
 * @body {file} slipImage - ไฟล์รูปภาพสลิป
 * @body {string} walletId - ID ของ Wallet ที่ต้องการฝากเงินเข้า
 * @body {string} userId - ID ของผู้ใช้เจ้าของรายการ
 * @body {string} from - (Optional) แหล่งที่มา
 */
transactionRouter.post("/", upload.single("slipImage"), transactionController.createSavingTransaction);

/**
 * @route POST /api/transactions/withdraw
 * @description สร้างคำขอถอนเงิน
 * @access Private (Requires Authentication)
 * @body {string} userId - ID ของผู้ใช้ที่ต้องการถอนเงิน
 * @body {number} amount - จำนวนเงินที่ต้องการถอน
 * @body {string} bank - ชื่อธนาคาร
 * @body {string} accountNumber - เลขที่บัญชี
 * @body {string} accountName - ชื่อบัญชี
 */
transactionRouter.post("/withdraw", transactionController.createWithdrawTransaction);

/**
 * @route POST /api/transactions/transfer
 * @description โอนเงินภายในระบบระหว่างผู้ใช้
 * @access Private (Requires Authentication)
 * @body {string} userId - ID ของผู้ส่ง
 * @body {string} recipientUserId - ID ของผู้รับ
 * @body {number} amount - จำนวนเงิน
 * @body {string} pin - รหัส PIN ของผู้ส่งเพื่อยืนยัน
 * @body {string} line_user_id - Line User ID ของผู้ส่ง
 */
transactionRouter.post("/transfer", transactionController.createInternalTransfer);

/**
 * @route POST /api/transactions/update/:transactionId
 * @description [เลิกใช้งาน] อัปเดตสถานะธุรกรรมหลังการตรวจสอบสลิป (เวอร์ชันเก่า)
 * @deprecated This route is deprecated. Use the new admin approval/rejection endpoints.
 * @access Private (Admin Only)
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการอัปเดต
 * @body {string} code - รหัสผลการตรวจสอบ
 * @body {number} [amount] - ยอดเงินที่ตรวจสอบแล้ว (กรณีสำเร็จ)
 */
transactionRouter.post("/update/:transactionId", transactionController.updateTransaction);

/**
 * @route POST /api/transactions/export
 * @description ส่งออกรายการเดินบัญชีเป็น PDF ทางอีเมล
 * @access Private (Requires Authentication)
 * @body {string} email - อีเมลผู้รับ
 * @body {string} walletId - ID ของ Wallet ที่ต้องการส่งออก
 * @body {string} [startDate] - วันที่เริ่มต้น (ISO format)
 * @body {string} [endDate] - วันที่สิ้นสุด (ISO format)
 */
transactionRouter.post("/export", transactionController.exportToPdf);

/**
 * @route GET /api/transactions/:walletId
 * @description ดึงประวัติธุรกรรมทั้งหมดของ Wallet ที่ระบุ
 * @access Private (Requires Authentication)
 * @param {string} walletId - ID ของ Wallet ที่ต้องการดูประวัติ
 * @query {number} [year] - ปีที่ต้องการกรอง (ค.ศ.)
 * @query {number} [month] - เดือนที่ต้องการกรอง (0-11)
 */
transactionRouter.get("/:walletId", transactionController.getWalletTransactions);

/**
 * @route GET /api/transactions/thai/:walletId
 * @description ดึงประวัติธุรกรรมพร้อมสถานะภาษาไทย
 * @access Private (Requires Authentication)
 * @param {string} walletId - ID ของ Wallet ที่ต้องการดูประวัติ
 */
transactionRouter.get("/thai/:walletId", transactionController.getThaiTransactions);

/**
 * @route GET /api/transactions/success/:walletId
 * @description ดึง 5 ธุรกรรมล่าสุดที่สำเร็จของ Wallet
 * @access Private (Requires Authentication)
 * @param {string} walletId - ID ของ Wallet ที่ต้องการดูประวัติ
 */
transactionRouter.get("/success/:walletId", transactionController.getSuccessTransactions);

export default transactionRouter;
