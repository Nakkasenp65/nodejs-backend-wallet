/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการที่เกี่ยวข้องกับสลิป (Slip)
 * @description ไฟล์นี้ทำหน้าที่กำหนด API Endpoint สำหรับกระบวนการตรวจสอบสลิปอัตโนมัติ
 * โดยเชื่อมต่อเส้นทางเข้ากับฟังก์ชัน Controller ที่เหมาะสม
 * @module routes/slip
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/slip.controller - Controller ที่บรรจุตรรกะการจัดการ Slip
 */
import slipController from "./slip.controller.js";
import { Router } from "express";
const slipRouter = Router();
/**
 * @route POST /api/slips/verify
 * @description เริ่มกระบวนการตรวจสอบสลิปและอัปเดตสถานะธุรกรรมที่เกี่ยวข้อง
 * @description Endpoint นี้ถูกออกแบบมาเพื่อรับคำขอจากระบบเบื้องหลัง (เช่น QStash) หลังจากที่ผู้ใช้ส่งสลิปเข้ามา
 * @access Private (Internal Service Call)
 * @body {string} userId - ID ของผู้ใช้เจ้าของธุรกรรม
 * @body {string} slipImageUrl - URL ของรูปภาพสลิปที่ต้องการตรวจสอบ
 * @body {string} transactionId - ID ของธุรกรรรมที่ต้องการอัปเดตสถานะ
 */
slipRouter.post("/verify", slipController.slipVerify);
export default slipRouter;
//# sourceMappingURL=slip.route.js.map