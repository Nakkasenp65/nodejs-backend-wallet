import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import missionService from '../services/mission.service.js';

// --- CONTROLLERS สำหรับ ADMIN ---

/**
 * @description (Admin) สร้าง Mission ใหม่
 * @route POST /v1/missions
 */
const createMission = catchAsync(async (req, res) => {
  const newMission = await missionService.createMission(req.body);
  res.status(httpStatus.CREATED).json(newMission);
});

/**
 * @description (Admin) แก้ไข Mission ที่มีอยู่
 * @route PATCH /v1/missions/:missionId
 */
const updateMission = catchAsync(async (req, res) => {
  const { missionId } = req.params;
  const updatedMission = await missionService.updateMission(missionId, req.body);
  res.status(httpStatus.OK).json(updatedMission);
});

/**
 * @description (Admin) ดึงข้อมูล Mission ทั้งหมดสำหรับแสดงในระบบหลังบ้าน
 * @route GET /v1/missions/admin
 */
const getAllMissionsForAdmin = catchAsync(async (req, res) => {
  const missions = await missionService.getAllMissionsForAdmin(req.query);
  res.status(httpStatus.OK).json(missions);
});

// --- CONTROLLER สำหรับ USER ทั่วไป ---

/**
 * @description ดึงข้อมูลภารกิจที่ผู้ใช้สามารถเข้าร่วมได้
 * @route GET /v1/missions/available
 */
const getAvailableMissions = catchAsync(async (req, res) => {
  // userId ควรมาจาก middleware authentication
  const userId = req.params.userId;
  const availableMissions = await missionService.getAvailableMissions(userId);
  res.status(httpStatus.OK).json(availableMissions);
});

export default {
  createMission,
  updateMission,
  getAllMissionsForAdmin,
  getAvailableMissions,
};
