/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับกระเป๋าเงิน (Wallet)
 * @description ไฟล์นี้ทำหน้าที่เป็นตัวกลางรับคำขอจาก Client, เรียกใช้ Service ที่เหมาะสม
 * เพื่อจัดการตรรกะทางธุรกิจ, และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/wallet
 * @requires services/wallet.service - Service สำหรับจัดการตรรกะของ Wallet
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import walletService from "./wallet.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import httpStatus from "http-status";
/**
 * คอนโทรลเลอร์สำหรับยืนยันยอดเงินของธุรกรรม
 * @description รับ HTTP request เพื่อยืนยันยอดเงินของธุรกรรม โดยดึง `transactionId` จากพารามิเตอร์ URL
 * และข้อมูล `amount` จาก Request Body จากนั้นเรียกใช้ `walletService.confirmWalletAmount`
 * และส่งข้อมูลธุรกรรมที่อัปเดตแล้วกลับไปพร้อมสถานะ 200 (OK)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมี `req.params.transactionId` และ `req.body.amount`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getUserWallet = catchAsync(async (req, res) => {
    const wallet = await walletService.getUserWallet(req.params.line_user_id);
    res.status(httpStatus.OK).json(wallet);
});
export default { getUserWallet };
//# sourceMappingURL=wallet.controller.js.map