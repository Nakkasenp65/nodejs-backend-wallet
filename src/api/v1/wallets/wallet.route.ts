/**
 * @file กำหนดเส้นทาง (Routes) สำหรับการจัดการกระเป๋าเงิน (Wallet)
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints ทั้งหมดที่เกี่ยวข้องกับ Wallet
 * โดยเชื่อมต่อเส้นทางแต่ละเส้นเข้ากับฟังก์ชัน Controller ที่เหมาะสม
 * @module routes/wallet
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/wallet.controller - Controller ที่บรรจุตรรกะการจัดการ Wallet
 */
import walletController from "./wallet.controller.js";
import express from "express";
import auth from "../../../middlewares/auth.js";

const walletRouter = express.Router();

walletRouter.use(auth);

/**
 * @route GET /api/wallets/:line_user_id
 * @description ดึงข้อมูลกระเป๋าเงิน (Wallet) ที่เฉพาะเจาะจงของผู้ใช้
 * @access Public (หรือ Private ตาม Middleware ที่กำหนด)
 * @param {string} line_user_id - รหัสผู้ใช้ LINE (Line User ID) ของเจ้าของ Wallet
 */
walletRouter.get("/:line_user_id", walletController.getUserWallet);

export default walletRouter;
