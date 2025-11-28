/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการภารกิจหลัก (Mission)
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints ทั้งสำหรับผู้ใช้ทั่วไปและผู้ดูแลระบบ
 * เพื่อจัดการภารกิจ โดยเชื่อมต่อเส้นทางแต่ละเส้นเข้ากับฟังก์ชัน Controller ที่เหมาะสม
 * @module routes/mission
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/mission.controller - Controller ที่บรรจุตรรกะการจัดการ Mission
 */
import { Router } from "express";
import missionController from "./mission.controller.js";
import auth from "../../../middlewares/auth.js";

const missionRouter = Router();

missionRouter.use(auth);

/**
 * @route GET /api/missions/available/:userId
 * @description ดึงรายการภารกิจที่ผู้ใช้ระบุสามารถเข้าร่วมได้
 * @access Private (Requires Authentication)
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการตรวจสอบภารกิจ
 */
missionRouter.get("/available/:userId", missionController.getAvailableMissions);

/**
 * @route POST /api/missions
 * @description สร้างภารกิจใหม่ (สำหรับ Admin)
 * @access Admin Only
 * @body {object} missionData - อ็อบเจกต์ข้อมูลทั้งหมดที่จำเป็นสำหรับการสร้างภารกิจ
 */
missionRouter.post("/", missionController.createMission);

/**
 * @route PATCH /api/missions/:missionId
 * @description แก้ไขรายละเอียดของภารกิจที่มีอยู่ (สำหรับ Admin)
 * @access Admin Only
 * @param {string} missionId - ID ของภารกิจที่ต้องการแก้ไข
 * @body {object} updateData - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 */
missionRouter.patch("/:missionId", missionController.updateMission);

/**
 * @route GET /api/missions/admin
 * @description ดึงรายการภารกิจทั้งหมดสำหรับหน้า Admin Dashboard
 * @access Admin Only
 * @query {string} [search] - คำค้นหาสำหรับชื่อหรือคำอธิบายภารกิจ
 * @query {string} [type] - กรองตามประเภทภารกิจ
 * @query {string} [status] - กรองตามสถานะ ('ACTIVE', 'EXPIRED')
 * @query {string} [sort] - รูปแบบการเรียงลำดับ ('latest', 'expiresSoon', 'rewardHigh')
 * @query {number} [page=1] - เลขหน้า
 * @query {number} [pageSize=10] - จำนวนรายการต่อหน้า
 */
missionRouter.get("/admin", missionController.getAllMissionsForAdmin);

export default missionRouter;
