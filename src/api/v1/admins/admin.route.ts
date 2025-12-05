/**
 * @file กำหนดเส้นทาง (Routes) หลักสำหรับส่วนของผู้ดูแลระบบ (Admin Panel)
 * @description ไฟล์นี้ทำหน้าที่เป็น Router กลาง (Master Router) ที่รวบรวม Endpoints ทั้งหมด
 * สำหรับการจัดการระบบในฝั่ง Admin โดยมีการนำเข้าและจัดกลุ่ม Controller จากหลายโมดูล
 * เพื่อสร้าง API ที่ครอบคลุมสำหรับการจัดการข้อมูลผู้ใช้, ธุรกรรม, ภารกิจ, สินค้า และอื่นๆ
 * @module routes/admin
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires multer - Middleware สำหรับจัดการไฟล์อัปโหลด
 * @requires controllers/admin.controller - Controller กลางสำหรับ Admin
 * @requires controllers/mission.controller - Controller สำหรับจัดการภารกิจหลัก
 * @requires controllers/product.controller - Controller สำหรับจัดการสินค้า
 * @requires controllers/line.controller - Controller สำหรับทดสอบ line
 * @requires controllers/user.controller - Controller สำหรับจัดการข้อมูลผู้ใช้
 */
import { Router } from "express";

import adminController from "./admin.controller.js";
import missionController from "../missions/mission.controller.js";
import broadcastController from "../broadcasts/broadcast.controller.js";
import productController from "../products/product.controller.js";
import lineController from "../lines/line.controller.js";
import userController from "../users/user.controller.js";

import multer from "multer";
import cronController from "../cron/cron.controller.js";
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

import auth from "../../../middlewares/auth.js";
import adminAuth from "../../../middlewares/adminAuth.js";

const adminRoute = Router();

adminRoute.use(auth, adminAuth);

/**
 * @route GET /api/admin/
 * @description ดึงข้อมูลสรุปสำหรับ Admin Dashboard
 * @access Admin Only
 */
adminRoute.get("/", adminController.getDashboardData);

/**
 * 
 * 
 * MARK: USER PART  
 * 
 * 
 */

// ผู้ใช้

/**
 * @route GET /api/admin/users
 * @description ดึงรายการผู้ใช้ทั้งหมดในระบบ พร้อมการแบ่งหน้าและการกรอง
 * @access Admin Only
 * @query {number} [page] - เลขหน้า
 * @query {number} [pageSize] - จำนวนรายการต่อหน้า
 * @query {string} [search] - คำค้นหา
 * @query {string} [role] - กรองตามบทบาท
 */
adminRoute.get("/users", userController.getUsers);

/**
 * @route GET /api/admin/users/:line_user_id
 * @description ดึงข้อมูลผู้ใช้รายบุคคลด้วย LINE User ID
 * @access Admin Only
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 */
adminRoute.get("/users/:line_user_id", userController.getUser);

/**
 * @route PATCH /v1/admin/users/:userId
 * @description แก้ไขข้อมูลผู้ใช้ด้วย ID ภายในระบบ
 * @access Admin Only
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูล
 * @body {object} updateData - ข้อมูลที่ต้องการอัปเดต (เช่น fullname, phone, role)
 */
adminRoute.patch("/users/:userId", adminController.editUser);
/**
 * @route DELETE /v1/admin/users/:userId
 * @description ลบผู้ใช้ (สำหรับ Admin)
 * @access Admin Only
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูล
 */
adminRoute.delete("/users/:userId", userController.deleteUser);

/**
 * 
 * 
 * MARK: TRANSACTION PART  
 * 
 * 
 */

//รายการการเงิน

/**
 * @route GET /v1/admin/transactions
 * @description ดึงรายการธุรกรรมทั้งหมดในระบบ พร้อมการแบ่งหน้าและการกรอง
 * @access Admin Only
 * @query {number} [page] - เลขหน้า
 * @query {string} [status] - กรองตามสถานะ
 */
adminRoute.get("/transactions", adminController.getTransactions);

/**
 * @route PATCH /v1/admin/transactions/:transactionId
 * @description แก้ไขธุรกรรม (รวมถึงการอนุมัติ/ปฏิเสธ) และอัปโหลดสลิปใหม่ (ถ้ามี)
 * @consumes multipart/form-data
 * @access Admin Only
 * @param {string} transactionId - ID ของธุรกรรม
 * @body {file} [slipImage] - (Optional) ไฟล์รูปภาพสลิปใหม่
 * @body {object} updateData - ข้อมูลที่ต้องการอัปเดต (เช่น status, amount)
 */
adminRoute.patch("/transactions/:transactionId", upload.single("slipImage"), adminController.editTransaction);

/**
 * @route DELETE /v1/admin/transactions/:transactionId
 * @description ลบธุรกรรม
 * @access Admin Only
 * @param {string} transactionId - ID ของธุรกรรม
 */
adminRoute.delete("/transactions/:transactionId", adminController.deleteTransaction);

/**
 * 
 * 
 * MARK: MISSION PART  
 * 
 * 
 */

//ภารกิจ

/**
 * @route GET /v1/admin/missions
 * @description ดึงรายการภารกิจหลักทั้งหมด (Mission Templates)
 * @access Admin Only
 */
adminRoute.get("/missions", adminController.getMissions);

/**
 * @route GET /v1/admin/missions/:missionId
 * @description ดึงข้อมูลภารกิจหลักเชิงลึก พร้อมสถิติและรายชื่อผู้เข้าร่วม
 * @access Admin Only
 * @param {string} missionId - ID ของภารกิจหลัก
 */
adminRoute.get("/missions/:missionId", missionController.getMissionDetails);

/**
 * @route POST /v1/admin/missions
 * @description สร้างภารกิจหลักใหม่
 * @access Admin Only
 * @body {object} missionData - ข้อมูลสำหรับสร้างภารกิจ
 */
adminRoute.post("/missions", missionController.createMission);

/**
 * @route PATCH /v1/admin/missions
 * @description แก้ไขภารกิจหลัก (ID อยู่ใน body)
 * @access Admin Only
 * @body {object} missionData - ข้อมูลสำหรับอัปเดตภารกิจ (ต้องมี `id`)
 */
adminRoute.patch("/missions/:missionId", missionController.editMission);

/**
 * @route DELETE /v1/admin/missions/:missionId
 * @description ลบภารกิจหลัก
 * @access Admin Only
 * @param {string} missionId - ID ของภารกิจหลัก
 */
adminRoute.delete("/missions/:missionId", missionController.deleteMission);

/**
 * 
 * 
 * MARK: USER-MISSION PART  
 * 
 * 
 */

// ภารกิจของแต่ละ account

/**
 * @route GET /v1/admin/user-missions/:line_user_id
 * @description ดึงรายการภารกิจทั้งหมดของผู้ใช้รายบุคคล
 * @access Admin Only
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 */
adminRoute.get("/user-missions/:line_user_id", adminController.getUserMisisonsByUserLineId);

/**
 * @route GET /v1/admin/user-missions/details/:userMissionId
 * @description ดึงข้อมูลภารกิจของผู้ใช้โดยละเอียด
 * @access Admin Only
 * @param {string} userMissionId - ID ของ UserMission
 */
adminRoute.get("/user-missions/details/:userMissionId", adminController.getUserMissionDetails);

/**
 * @route PATCH /v1/admin/user-missions/:userMissionId
 * @description แก้ไขข้อมูลภารกิจของผู้ใช้ (เช่น สถานะ, ความคืบหน้า)
 * @access Admin Only
 * @param {string} userMissionId - ID ของ UserMission
 * @body {object} updateData - ข้อมูลที่ต้องการอัปเดต
 */
adminRoute.patch("/user-missions/:userMissionId", adminController.editUserMission);

/**
 * @route DELETE /v1/admin/user-missions/:userMissionId
 * @description ลบข้อมูลภารกิจของผู้ใช้
 * @access Admin Only
 * @param {string} userMissionId - ID ของ UserMission
 */
adminRoute.delete("/user-missions/:userMissionId", adminController.deleteUserMission);

/**
 * 
 * 
 * MARK: BROADCASTS PART  
 * 
 * 
 */

//การแจ้งเตือน เป็น broadcast แทน notification (notification คือส่วนตัวมี userId อยู่)

/**
 * @route GET /v1/admin/broadcasts
 * @description ดึงรายการข้อความประกาศทั้งหมด พร้อมการแบ่งหน้าและการค้นหา
 * @access Admin Only
 * @query {number} [page=1] - เลขหน้าปัจจุบัน
 * @query {number} [pageSize=10] - จำนวนรายการต่อหน้า
 * @query {string} [search] - คำค้นหาสำหรับหัวข้อหรือเนื้อหา
 */

adminRoute.get("/broadcasts", broadcastController.getBroadcasts);

/**
 * @route POST /v1/admin/broadcasts
 * @description สร้างข้อความประกาศฉบับร่าง (Draft) ใหม่
 * @access Admin Only
 * @body {string} title - หัวข้อของข้อความประกาศ
 * @body {string} [body] - เนื้อหาของข้อความประกาศ
 * @body {string} [imageUrl] - URL ของรูปภาพ (Optional - ใช้แทนการอัปโหลดไฟล์ได้)
 * @body {file} [image] - (Optional) ไฟล์รูปภาพ
 */
adminRoute.post("/broadcasts", upload.single("image"), broadcastController.createBroadcast);

/**
 * @route POST /v1/admin/broadcasts/:broadcastId/send
 * @description ส่งข้อความประกาศที่ระบุไปยังผู้ใช้ทุกคนในระบบ
 * @access Admin Only
 * @param {string} broadcastId - ID ของข้อความประกาศที่ต้องการส่ง
 */
adminRoute.post("/broadcasts/:broadcastId/send", broadcastController.sendBroadcast);

/**
 * @route PATCH /v1/admin/broadcasts/:broadcastId
 * @description แก้ไขข้อความประกาศ
 * @access Admin Only
 * @param {string} broadcastId - ID ของข้อความประกาศที่ต้องการแก้ไข
 * @body {string} [title] - หัวข้อใหม่
 * @body {string} [body] - เนื้อหาใหม่
 */
adminRoute.patch("/broadcasts/:broadcastId", broadcastController.updateBroadcast);

/**
 * @route DELETE /v1/admin/broadcasts/:broadcastId
 * @description ลบข้อความประกาศ
 * @access Admin Only
 * @param {string} broadcastId - ID ของข้อความประกาศที่ต้องการลบ
 */
adminRoute.delete("/broadcasts/:broadcastId", broadcastController.deleteBroadcast);

/**
 * 
 * 
 * MARK: PRODUCTS PART  
 * 
 * 
 */

//จัดการแก้ไข เพิ่มลบ รุ่นโทรศัพท์

/**
 * @route GET /v1/admin/products/filters
 * @description ดึงข้อมูลตัวเลือกสำหรับสร้าง Filter UI ในหน้าจัดการสินค้า
 * @access Admin Only
 */
adminRoute.get("/products/filters", productController.getProductFilters);
/**
 * @route GET /v1/admin/products
 * @description ดึงรายการสินค้าทั้งหมด พร้อมการแบ่งหน้าและการกรอง
 * @access Admin Only
 */
adminRoute.get("/products", productController.getProducts);
/**
 * @route POST /v1/admin/products
 * @description สร้างสินค้าใหม่
 * @access Admin Only
 * @body {object} productData - ข้อมูลสำหรับสร้างสินค้า
 */
adminRoute.post("/products", productController.createProduct);
/**
 * @route PATCH /v1/admin/products/:productId
 * @description แก้ไขสินค้า และอัปโหลดรูปภาพใหม่ (ถ้ามี)
 * @consumes multipart/form-data
 * @access Admin Only
 * @param {string} productId - ID ของสินค้า
 * @body {file} [productImage] - (Optional) ไฟล์รูปภาพใหม่
 * @body {object} updateData - ข้อมูลที่ต้องการอัปเดต
 */
adminRoute.patch("/products/:productId", upload.single("productImage"), productController.editProduct);

/**
 * @route DELETE /v1/admin/products/:productId
 * @description ลบสินค้า
 * @access Admin Only
 * @param {string} productId - ID ของสินค้า
 */
adminRoute.delete("/products/:productId", productController.deleteProduct);

/**
 * @route POST /v1/admin/line/:line_user_id
 * @description ทดสอบส่ง flex message ไปยัง line user ตามที่ระบุ
 * @access Admin Only
 * @param {string} line_user_id - line user id ของ user
 */
adminRoute.post("/line/test/:line_user_id", lineController.sendFlexMessage);


/**
 * 
 * 
 * MARK: WALLET PART  
 * 
 * 
 */

// จัดการแก้ไข เพิ่มลบ กระเป๋า

/**
 * @route GET /v1/admin/wallets
 * @description ดึงรายการ Wallet ทั้งหมดในระบบ
 * @access Admin Only
 */
adminRoute.get("/wallets", adminController.getWallets);

/**
 * @route GET /v1/admin/wallets/:walletId
 * @description ดึงข้อมูล Wallet โดยละเอียด
 * @access Admin Only
 * @param {string} walletId - ID ของ Wallet
 */
adminRoute.get("/wallets/:walletId", adminController.getWalletDetails);

/**
 * @route PATCH /v1/admin/wallets/:walletId
 * @description อัปเดตข้อมูล Wallet (เช่น ยอดเงิน)
 * @access Admin Only
 * @param {string} walletId - ID ของ Wallet
 * @body {object} updateData - ข้อมูลที่ต้องการอัปเดต (เช่น `balance`)
 */
adminRoute.patch("/wallets/:walletId", adminController.updateWallet); // Fixed bug: getWallets -> updateWallet

/**
 * 
 * 
 * MARK: REDEEM PART  
 * 
 * 
 */

/**
 * @route POST /v1/admin/wallets/:walletId/redeem
 * @description ตัดยอดเงินจาก Wallet (Bonus ก่อน แล้วค่อย Balance) สำหรับการแลกสินค้า
 * @access Admin Only
 * @param {string} walletId - ID ของ Wallet
 * @body {number} productPrice - ราคาสินค้าที่ต้องการแลก
 * @body {string} description - คำอธิบายรายการ
 */
adminRoute.post("/wallets/:walletId/redeem", adminController.redeemProduct);

// จัดการ cron

/**
 * @route POST /v1/admin/crons/expire-missions
 * @description (สำหรับ Manual Trigger) เริ่มกระบวนการตรวจสอบและอัปเดตสถานะภารกิจที่หมดอายุ
 * @access Admin Only
 */
adminRoute.post("/crons/expire-missions", cronController.handleExpireMissions);

export default adminRoute;
