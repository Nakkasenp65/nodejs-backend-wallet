/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการการแจ้งเตือน (Notification) ฝั่งผู้ใช้
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints สำหรับผู้ใช้ในการดึงข้อมูล,
 * อัปเดตสถานะ, และล้างการแจ้งเตือนของตนเอง
 * @module routes/notification
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/notification.controller - Controller ที่บรรจุตรรกะการจัดการ Notification
 */
import express from "express";
import notificationController from "./notification.controller.js";

const notificationRouter = express.Router();

/**
 * @route GET /api/notifications/:userId
 * @description ดึงรายการการแจ้งเตือนทั้งหมดของผู้ใช้
 * @access Private (Requires Authentication)
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการดึงการแจ้งเตือน
 */
notificationRouter.get("/:userId", notificationController.getNotifications);

/**
 * @route PATCH /api/notifications/:notificationId/read
 * @description อัปเดตสถานะการแจ้งเตือนเป็น "อ่านแล้ว"
 * @access Private (Requires Authentication)
 * @param {string} notificationId - ID ของการแจ้งเตือนที่ต้องการอัปเดต
 */
notificationRouter.patch("/:notificationId/read", notificationController.markAsRead);

/**
 * @route DELETE /api/notifications/clear/:userId
 * @description ล้าง (ลบ) การแจ้งเตือนทั้งหมดของผู้ใช้ตามประเภทที่ระบุ
 * @access Private (Requires Authentication)
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการล้างการแจ้งเตือน
 * @query {string} type - ประเภทของการแจ้งเตือนที่ต้องการลบ (เช่น 'WALLET', 'REWARD')
 */
notificationRouter.delete("/clear/:userId", notificationController.clearNotifications);

export default notificationRouter;
