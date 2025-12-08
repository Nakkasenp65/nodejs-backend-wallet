/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับการตรวจสอบสลิป (Slip Verification)
 * @description ไฟล์นี้ทำหน้าที่เป็นจุดเริ่มต้น (Entry Point) สำหรับกระบวนการตรวจสอบสลิปอัตโนมัติ
 * โดยรับคำขอ (ซึ่งโดยทั่วไปจะถูกเรียกโดย Background Job Scheduler เช่น QStash),
 * เรียกใช้ Slip Service เพื่อตรวจสอบ, และ 'แปลผล' ที่ได้เพื่อส่งต่อไปยัง Transaction Service
 * สำหรับการอนุมัติหรือปฏิเสธรายการอย่างเหมาะสม
 * @module controllers/slip
 * @requires services/slip.service - Service สำหรับการตรวจสอบสลิปกับ API ภายนอก
 * @requires services/transaction.service - Service สำหรับการอัปเดตสถานะธุรกรรม (อนุมัติ/ปฏิเสธ)
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import { Request, Response } from "express";
import slipService from "./slip.service.js";
import transactionService from "../transactions/transaction.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import httpStatus from "http-status";

/**
 * คอนโทรลเลอร์สำหรับจัดการกระบวนการตรวจสอบสลิปและอัปเดตสถานะธุรกรรม
 * @description ทำหน้าที่เป็นตัวกลางในการรับคำขอตรวจสอบสลิป โดยจะส่ง `slipImageUrl`
 * ไปยัง `slipService` เพื่อตรวจสอบความถูกต้อง จากนั้นจะแปลผลลัพธ์ที่ได้ (success/fail)
 * และเรียกใช้ `transactionService` ที่เหมาะสม (`approveDeposit` หรือ `rejectDeposit`)
 * เพื่อปิดกระบวนการธุรกรรมอย่างสมบูรณ์
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลใน `req.body`
 * @param {string} req.body.userId - ID ของผู้ใช้เจ้าของธุรกรรม
 * @param {string} req.body.slipImageUrl - URL ของรูปภาพสลิปที่ต้องการตรวจสอบ
 * @param {string} req.body.transactionId - ID ของธุรกรรมที่ต้องการอัปเดตสถานะ
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const slipVerify = catchAsync(async (req: Request, res: Response) => {
    const { userId, slipImageUrl, transactionId } = req.body;

    // ตรวจสอบสลิปด้วย url รูป
    const verifyResult = await slipService.verfifySlip(slipImageUrl, transactionId);

    let updatedTransaction;

    // 2. "แปลภาษา" และส่ง "คำสั่งภายใน" ที่ชัดเจน
    if (verifyResult.code === "200000" && verifyResult.data) {
        // คำสั่ง: "อนุมัติรายการฝากนี้"
        updatedTransaction = await transactionService.approveDeposit(transactionId, {
            userId: userId, // <-- ส่ง userId เข้าไป
            amount: verifyResult.data.amount,
            sender: verifyResult.data.sender, // หรือข้อมูลอื่นๆ ที่จำเป็น
        });
    } else {
        // คำสั่ง: "ปฏิเสธรายการฝากนี้"
        updatedTransaction = await transactionService.rejectDeposit(transactionId, {
            code: verifyResult.code,
            reason: verifyResult.message || "Slip verification failed.",
        });
    }

    res.status(httpStatus.OK).json({
        message: `Transaction ${transactionId} processed with status: ${updatedTransaction.status}`,
        data: updatedTransaction,
    });
});

export default { slipVerify };
