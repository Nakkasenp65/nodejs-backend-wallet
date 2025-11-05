/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่มาจาก Cron Job Scheduler
 * @description ไฟล์นี้ทำหน้าที่เป็นตัวกลางรับคำขอที่ถูกกระตุ้น (triggered) โดย Scheduler ภายนอก,
 * เรียกใช้ Service ที่เหมาะสมเพื่อจัดการตรรกะที่ต้องทำงานเป็นประจำ, และส่งผลลัพธ์การดำเนินการกลับไป
 * @module controllers/cron
 * @requires services/user-mission.service - Service สำหรับจัดการตรรกะของ User Mission
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";
import userMissionService from "../user-missions/user-mission.service.js";
/**
 * คอนโทรลเลอร์สำหรับจัดการกระบวนการอัปเดตสถานะภารกิจที่หมดอายุ
 * @description ทำหน้าที่เป็น Endpoint ที่ถูกเรียกโดย Scheduler ภายนอก (เช่น QStash)
 * โดยจะเรียกใช้ `userMissionService.expireOverdueMissions` เพื่อดำเนินการค้นหาและอัปเดตภารกิจ
 * ที่หมดอายุทั้งหมดในระบบ จากนั้นส่งผลสรุปการดำเนินการกลับไปเป็น JSON Response
 * @param {object} req - อ็อบเจกต์ Express Request (ควรมีการตรวจสอบ Header เพื่อยืนยันว่าเป็นคำขอจาก Scheduler ที่เชื่อถือได้)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const handleExpireMissions = catchAsync(async (req, res) => {
    // (สำคัญ) เพิ่มการตรวจสอบความปลอดภัย
    // ตรวจสอบว่า request มาจาก QStash จริงๆ ไม่ใช่จากผู้ใช้ทั่วไป
    const result = await userMissionService.expireOverdueMissions();
    res.status(httpStatus.OK).json({
        message: "Successfully processed overdue missions.",
        ...result,
    });
});
export default {
    handleExpireMissions,
};
//# sourceMappingURL=cron.controller.js.map