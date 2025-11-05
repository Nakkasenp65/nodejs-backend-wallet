/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการภารกิจของผู้ใช้ (User Missions)
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints ทั้งหมดที่เกี่ยวข้องกับ User Missions
 * โดยเชื่อมต่อเส้นทางแต่ละเส้นเข้ากับฟังก์ชัน Controller ที่เหมาะสม
 * @module routes/user-mission
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/user-mission.controller - Controller ที่บรรจุตรรกะการจัดการ User Mission
 */
import { Router } from "express";
import userMissionController from "./user-mission.controller.js";
const userMissionRouter = Router();
/**
 * @route POST /api/user-missions/enroll
 * @description สมัครเข้าร่วมภารกิจใหม่
 * @access Private (Requires Authentication)
 * @body {string} userId - ID ของผู้ใช้ที่สมัคร
 * @body {string} missionId - ID ของภารกิจที่ต้องการสมัคร
 */
userMissionRouter.post("/enroll", userMissionController.enrollInMission);
/**
 * @route POST /api/user-missions/claim
 * @description กดรับรางวัลสำหรับภารกิจที่ทำสำเร็จ
 * @access Private (Requires Authentication)
 * @body {string} userId - ID ของผู้ใช้ที่กดรับรางวัล
 * @body {string} userMissionId - ID ของ UserMission ที่ต้องการรับรางวัล
 */
userMissionRouter.post("/claim", userMissionController.claimMissionReward);
/**
 * @route GET /api/user-missions/:userId
 * @description ดึงรายการภารกิจทั้งหมดของผู้ใช้ที่ระบุ
 * @access Private (Requires Authentication)
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการดึงข้อมูลภารกิจ
 * @query {string} [filter] - ตัวกรองสถานะภารกิจ (เช่น 'active', 'history')
 */
userMissionRouter.get("/:userId", userMissionController.getMyMissions);
/**
 * @route GET /api/user-missions/details/:userMissionId
 * @description ดึงข้อมูลรายละเอียดของภารกิจที่ผู้ใช้กำลังทำอยู่ (UserMission) รายการเดียว
 * @access Private (Requires Authentication)
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการดูรายละเอียด
 */
userMissionRouter.get("/details/:userMissionId", userMissionController.getMyMissionDetails);
export default userMissionRouter;
//# sourceMappingURL=user-mission.route.js.map