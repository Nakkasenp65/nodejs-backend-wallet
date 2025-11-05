/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการผู้ใช้ (User)
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints ทั้งหมดที่เกี่ยวข้องกับ User,
 * สถานะ, การค้นหา, และระบบผู้แนะนำ โดยเชื่อมต่อเส้นทางแต่ละเส้นเข้ากับฟังก์ชัน Controller ที่เหมาะสม
 * @module routes/user
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/user.controller - Controller ที่บรรจุตรรกะการจัดการ User
 */
import { Router } from "express";
import userController from "./user.controller.js";
const userRouter = Router();
/**
 * @route GET /api/users/status/:line_user_id
 * @description ตรวจสอบสถานะของผู้ใช้ (เป็นผู้ใช้ใหม่หรือไม่, สถานะการล็อก)
 * @access Public
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการตรวจสอบ
 */
userRouter.get("/status/:line_user_id", userController.checkStatus);
/**
@route GET /api/users/recipient
@description ค้นหาข้อมูลผู้รับ (Recipient) ด้วยเงื่อนไขที่กำหนด
@access Private (Requires Authentication)
@query {string} type - ประเภทการค้นหา (เช่น 'phone', 'walletId')
@query {string} value - ค่าที่ใช้ในการค้นหา
*/
userRouter.get("/recipient", userController.searchRecipient);
/**
 * @route GET /api/users/referral/:line_user_id
 * @description ดึงประวัติการแนะนำเพื่อนของผู้ใช้ที่ระบุ
 * @access Private (Requires Authentication)
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ของผู้ที่ต้องการดูประวัติ
 */
userRouter.get("/referral/:line_user_id", userController.getReferralHistory);
/**
 * @route GET /api/users/lock/:line_user_id
 * @description ดึงสถานะการล็อกและสถานะความเป็นผู้ใช้ใหม่
 * @access Public
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการตรวจสอบ
 */
userRouter.get("/lock/:line_user_id", userController.getLockStatus);
/**
 * @route GET /api/users/:line_user_id
 * @description ดึงข้อมูลโปรไฟล์ของผู้ใช้รายบุคคล
 * @access Private (Requires Authentication)
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ของผู้ใช้ที่ต้องการดึงข้อมูล
 */
userRouter.get("/:line_user_id", userController.getUser);
/**
 * @route POST /api/users
 * @description สร้างผู้ใช้ใหม่ (ลงทะเบียน)
 * @access Public
 * @body {object} userData - อ็อบเจกต์ข้อมูลทั้งหมดที่จำเป็นสำหรับการลงทะเบียน
 */
userRouter.post("/", userController.createUser);
/**
 * @route POST /api/users/refer
 * @description สร้างบันทึกการแนะนำ (Referral Record)
 * @access Private (Requires Authentication)
 * @body {string} newcomerId - ID ของผู้ใช้ใหม่ (ผู้ถูกแนะนำ)
 * @body {string} referralCode - โค้ดของผู้แนะนำ
 */
userRouter.post("/refer", userController.createReferral);
/**
 * @route POST /api/users/lock/:line_user_id
 * @description ตั้งสถานะล็อกบัญชีผู้ใช้
 * @access Private (Requires Authentication)
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการล็อก
 */
userRouter.post("/lock/:line_user_id", userController.setLocked);
/**
 * @route POST /api/users/unlock
 * @description ปลดล็อกบัญชีผู้ใช้ด้วย PIN
 * @access Public
 * @body {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการปลดล็อก
 * @body {string|number} pin - รหัส PIN สำหรับการยืนยันตัวตน
 */
userRouter.post("/unlock", userController.unlock);
/**
 * @route PATCH /api/users/:line_user_id
 * @description อัปเดตข้อมูลโปรไฟล์ของผู้ใช้
 * @access Private (Requires Authentication)
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการอัปเดต
 * @body {object} updateData - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 */
userRouter.patch("/:line_user_id", userController.updateUser);
export default userRouter;
//# sourceMappingURL=user.route.js.map