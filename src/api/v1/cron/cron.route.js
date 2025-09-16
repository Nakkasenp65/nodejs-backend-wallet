/**
 * @file กำหนดเส้นทาง (Routes) สำหรับงานที่ต้องทำซ้ำตามเวลาที่กำหนด (Cron Jobs)
 * @description ไฟล์นี้ทำหน้าที่รวบรวมและกำหนด API Endpoints ที่ถูกออกแบบมาเพื่อให้ Scheduler ภายนอก
 * (เช่น QStash, Vercel Cron Jobs, or a traditional cron daemon) เรียกใช้งาน
 * เพื่อกระตุ้น (trigger) การทำงานของ Service ที่ต้องรันเป็นประจำ
 * @module routes/cron
 * @requires express - Framework สำหรับการจัดการ Routing
 * @requires controllers/cron.controller - Controller ที่บรรจุตรรกะสำหรับ Cron Jobs
 */
import { Router } from "express";
import cronController from "./cron.controller.js";

const cronRouter = Router();

/**
 * @route POST /api/cron/expire-missions
 * @description กระตุ้น (Trigger) กระบวนการตรวจสอบและอัปเดตสถานะภารกิจที่หมดอายุ
 * @description Endpoint นี้ควรถูกเรียกใช้งานเป็นประจำโดย Scheduler (เช่น ทุกๆ ชั่วโมง)
 * เพื่อจัดการภารกิจที่ผู้ใช้ทำไม่สำเร็จตามเวลา (ENROLLED -> EXPIRED)
 * และภารกิจที่ผู้ใช้ไม่กดรับรางวัลตามเวลา (AWAITING_CLAIM -> CLAIM_EXPIRED)
 * @access Internal (Scheduled Task)
 */
cronRouter.post("/expire-missions", cronController.handleExpireMissions);

export default cronRouter;
