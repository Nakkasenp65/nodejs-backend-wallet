import missionService from '../services/mission.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

const createMission = catchAsync(async (req, res, next) => {
  const { title, description, rewardAmount, duration } = req.body;
  const missionData = { title, description, rewardAmount };
  const newMission = await missionService.createMission(missionData, duration);
  res.status(httpStatus.CREATED).json(newMission);
});

const getActiveMissions = catchAsync(async (req, res, next) => {
  const activeMissions = await missionService.getActiveMissions();
  res.status(httpStatus.OK).json(activeMissions);
});

export default { createMission, getActiveMissions };
