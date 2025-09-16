/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับภารกิจหลัก (Mission)
 * @description ไฟล์นี้ทำหน้าที่รับคำขอจาก Client ทั้งในฝั่งผู้ใช้ (User) และผู้ดูแลระบบ (Admin),
 * เรียกใช้ Mission Service ที่เหมาะสมเพื่อจัดการตรรกะ, และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/mission
 * @requires services/mission.service - Service สำหรับจัดการตรรกะของ Mission
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import httpStatus from "http-status";
import catchAsync from "../../../utils/catchAsync.js";
import missionService from "./mission.service.js";

/**
 * คอนโทรลเลอร์สำหรับสร้างภารกิจใหม่ (สำหรับ Admin)
 * @description รับข้อมูลภารกิจจาก Request Body, เรียกใช้ Service เพื่อสร้างภารกิจ,
 * และส่งข้อมูลภารกิจที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่คาดว่าจะมีข้อมูลภารกิจใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createMission = catchAsync(async (req, res) => {
  const newMission = await missionService.createMission(req.body);
  res.status(httpStatus.CREATED).json(newMission);
});

/**
 * คอนโทรลเลอร์สำหรับแก้ไขภารกิจ (สำหรับ Admin)
 * @description รับ `missionId` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service เพื่ออัปเดตข้อมูล, และส่งข้อมูลภารกิจที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.missionId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const updateMission = catchAsync(async (req, res) => {
  const { missionId } = req.params;
  const updatedMission = await missionService.updateMission(missionId, req.body);
  res.status(httpStatus.OK).json(updatedMission);
});

/**
 * คอนโทรลเลอร์สำหรับดึงรายการภารกิจทั้งหมด (สำหรับ Admin)
 * @description รับเงื่อนไขการกรอง, การจัดเรียง, และการแบ่งหน้าจาก Query String, เรียกใช้ Service,
 * และส่งรายการภารกิจพร้อมข้อมูลการแบ่งหน้าและสถิติกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getAllMissionsForAdmin = catchAsync(async (req, res) => {
  const missions = await missionService.getAllMissionsForAdmin(req.query);
  res.status(httpStatus.OK).json(missions);
});

/**
 * คอนโทรลλεอร์สำหรับดึงรายการภารกิจที่ผู้ใช้สามารถเข้าร่วมได้
 * @description รับ `userId` จาก URL parameters, เรียกใช้ Service เพื่อค้นหาภารกิจที่เข้าเงื่อนไข,
 * และส่งรายการภารกิจกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getAvailableMissions = catchAsync(async (req, res) => {
  // userId ควรมาจาก middleware authentication
  const userId = req.params.userId;
  const availableMissions = await missionService.getAvailableMissions(userId);
  res.status(httpStatus.OK).json(availableMissions);
});

/**
 * คอนโทรลเลอร์สำหรับลบภารกิจ (สำหรับ Admin)
 * @description รับ `missionId` จาก URL parameters, เรียกใช้ Service เพื่อลบภารกิจ,
 * และส่งข้อมูลภารกิจที่ถูกลบกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.missionId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const deleteMission = catchAsync(async (req, res) => {
  const binMission = await missionService.deleteMission(req.params.missionId);
  res.status(httpStatus.OK).json(binMission);
});

/**
 * คอนโทรลเลอร์สำหรับแก้ไขภารกิจ (สำหรับ Admin - รับ Payload เต็ม)
 * @description รับข้อมูลภารกิจทั้งหมดรวมถึง ID จาก Request Body, เรียกใช้ Service,
 * และส่งข้อมูลภารกิจที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลภารกิจทั้งหมดใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const editMission = catchAsync(async (req, res) => {
  const updatedMission = await missionService.editMission(req.body);
  res.status(httpStatus.OK).json(updatedMission);
});

/**
 * คอนโทรลเลอร์สำหรับดึงข้อมูลภารกิจเชิงลึก (สำหรับ Admin)
 * @description รับ `missionId` จาก URL parameters และตัวเลือกการแบ่งหน้าสำหรับรายชื่อผู้เข้าร่วมจาก Query String,
 * เรียกใช้ Service, และส่งข้อมูลเชิงลึกทั้งหมดกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.missionId` และ `req.query`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getMissionDetails = catchAsync(async (req, res) => {
  const { missionId } = req.params;
  const options = req.query;
  const result = await missionService.getDetailsMission(missionId, options);
  res.status(httpStatus.OK).json(result);
});

export default {
  createMission,
  updateMission,
  getAllMissionsForAdmin,
  getMissionDetails,
  getAvailableMissions,
  deleteMission,
  editMission,
};
