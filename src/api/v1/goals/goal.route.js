/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการเป้าหมายการออม (Goal) ของผู้ใช้
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints สำหรับการสร้าง, อัปเดต, และดึงข้อมูลเป้าหมาย
 * โดยทุกเส้นทางมีการป้องกันด้วย Middleware สำหรับยืนยันตัวตน (Authentication)
 * @module routes/goal
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/goal.controller - Controller ที่บรรจุตรรกะการจัดการ Goal
 * @requires middlewares/auth - Middleware สำหรับการยืนยันตัวตน
 */
import goalController from "./goal.controller.js";
import { Router } from "express";
import auth from "../../../middlewares/auth.js";

const goalRouter = Router();

/**
 * @route POST /api/goals/:userId
 * @description สร้างเป้าหมายการออมใหม่สำหรับผู้ใช้
 * @access Private (Requires Authentication)
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการสร้างเป้าหมายให้
 * @body {string} mobileId - ID ของสินค้า (Product) ที่เป็นเป้าหมาย
 * @body {string} planId - ID ของแผนการออม (Plan) ที่เลือก
 */
goalRouter.post("/:userId", auth, goalController.createGoal);

/**
 * @route GET /api/goals/:line_user_id
 * @description ดึงข้อมูลเป้าหมายการออมปัจจุบันของผู้ใช้
 * @access Private (Requires Authentication)
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ของผู้ใช้ที่ต้องการดึงข้อมูลเป้าหมาย
 */
goalRouter.get("/:line_user_id", auth, goalController.getUserGoal);

/**
 * @route PATCH /api/goals/:userId
 * @description อัปเดตเป้าหมายการออมของผู้ใช้ (เช่น เปลี่ยนแผนหรือสินค้า)
 * @access Private (Requires Authentication)
 * @param {string} userId - ID ของผู้ใช้เจ้าของเป้าหมายที่ต้องการอัปเดต
 * @body {string} [planId] - (Optional) ID ใหม่ของแผนการออม
 * @body {string} [productId] - (Optional) ID ใหม่ของสินค้า
 */
goalRouter.patch("/:userId", auth, goalController.updateGoal);

export default goalRouter;
