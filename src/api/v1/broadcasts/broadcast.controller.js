/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับการส่งข้อความประกาศ (Broadcast)
 * @description ไฟล์นี้ทำหน้าที่รับคำขอจาก Admin Panel สำหรับการสร้าง, จัดการ, และส่งข้อความประกาศ
 * โดยเรียกใช้ Broadcast Service ที่เหมาะสมเพื่อจัดการตรรกะ และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/broadcast
 * @requires services/broadcast.service - Service สำหรับจัดการตรรกะของ Broadcast
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import broadcastService from "./broadcast.service.js";
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";

/**
 * คอนโทรลเลอร์สำหรับดึงรายการข้อความประกาศทั้งหมด (สำหรับ Admin)
 * @description รับเงื่อนไขการแบ่งหน้าและการค้นหาจาก Query String, เรียกใช้ Service,
 * และส่งรายการข้อความประกาศพร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query` (page, pageSize, search)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getBroadcasts = catchAsync(async (req, res) => {
  // รับ options (page, pageSize, search) จาก query string
  const result = await broadcastService.getBroadcasts(req.query);
  res.status(httpStatus.OK).json(result);
});

/**
 * คอนโทรลเลอร์สำหรับสร้างข้อความประกาศฉบับร่างใหม่ (สำหรับ Admin)
 * @description รับข้อมูล (title, body) จาก Request Body, เรียกใช้ Service,
 * และส่งข้อมูล Broadcast ที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลใน req.body
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createBroadcast = catchAsync(async (req, res) => {
  // รับ payload (title, body) จาก request body
  const newBroadcast = await broadcastService.createBroadcast(req.body);
  res.status(httpStatus.CREATED).json(newBroadcast);
});

/**
 * คอนโทรลเลอร์สำหรับแก้ไขข้อความประกาศ (สำหรับ Admin)
 * @description รับ `broadcastId` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service, และส่งข้อมูล Broadcast ที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.broadcastId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const updateBroadcast = catchAsync(async (req, res) => {
  const { broadcastId } = req.params;
  const updatedBroadcast = await broadcastService.updateBroadcast(broadcastId, req.body);
  res.status(httpStatus.OK).json(updatedBroadcast);
});

/**
 * คอนโทรลเลอร์สำหรับลบข้อความประกาศ (สำหรับ Admin)
 * @description รับ `broadcastId` จาก URL parameters, เรียกใช้ Service เพื่อลบ,
 * และส่งสถานะ 204 (No Content) กลับไปเมื่อดำเนินการสำเร็จ
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.broadcastId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const deleteBroadcast = catchAsync(async (req, res) => {
  const { broadcastId } = req.params;
  await broadcastService.deleteBroadcast(broadcastId);
  // ส่ง status 204 No Content กลับไปเมื่อลบสำเร็จ
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * คอนโทรลเลอร์สำหรับส่งข้อความประกาศไปยังผู้ใช้ทุกคน (สำหรับ Admin)
 * @description รับ `broadcastId` จาก URL parameters, เรียกใช้ Service เพื่อเริ่มกระบวนการส่ง,
 * และส่งผลลัพธ์การดำเนินการ (เช่น จำนวนผู้รับ) กลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.broadcastId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const sendBroadcast = catchAsync(async (req, res) => {
  const { broadcastId } = req.params;
  const result = await broadcastService.sendBroadcastToAllUsers(broadcastId);
  res.status(httpStatus.OK).json(result);
});

export default {
  getBroadcasts,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  sendBroadcast,
};
