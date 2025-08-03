// src/controllers/mission.controller.js

import missionService from '../services/mission.service.js';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

const createNewMission = catchAsync(async (req, res) => {
  // req.body ควรจะมี title, description, rewardAmount, webExpiresAt, durationDays
  const newMission = await missionService.createMission(req.body);
  res.status(httpStatus.CREATED).json(newMission);
});

/**
 * @description POST /v1/mission/enroll - รับภารกิจใหม่
 */
const enrollInMission = catchAsync(async (req, res) => {
  // ผมตั้งสมมติฐานว่า userId จะถูกแนบเข้ามาใน req object จาก middleware authentication นะครับ
  // เช่น req.user = { id: '...' }
  const { missionId, userId } = req.body;

  const newUserMission = await missionService.enrollUserInMission(userId, missionId);

  res.status(httpStatus.CREATED).json({
    message: 'Successfully enrolled in mission!',
    data: newUserMission,
  });
});

/**
 * @description GET /v1/mission/available - ดูภารกิจทั้งหมดที่สามารถเข้าร่วมได้
 */
const getAvailableMissions = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const availableMissions = await missionService.getAvailableMissions(userId);
  res.status(httpStatus.OK).json(availableMissions);
});

/**
 * @description GET /v1/mission/my-missions - ดูภารกิจทั้งหมดของฉัน
 */
const getAllUserMissions = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const userMissions = await missionService.getAllMissionsForUser(userId);
  res.status(httpStatus.OK).json(userMissions);
});

/**
 * @description GET /v1/mission/:userMissionId - ดูรายละเอียดภารกิจของฉันแบบเจาะจง
 */
const getUserMissionDetails = catchAsync(async (req, res) => {
  const { userMissionId } = req.params;
  const missionDetails = await missionService.getUserMissionDetails(userMissionId);

  if (!missionDetails) {
    return res.status(httpStatus.NOT_FOUND).json({ message: 'User mission not found' });
  }

  res.status(httpStatus.OK).json(missionDetails);
});

export default {
  enrollInMission,
  getAvailableMissions,
  getAllUserMissions,
  getUserMissionDetails,
  createNewMission,
};
