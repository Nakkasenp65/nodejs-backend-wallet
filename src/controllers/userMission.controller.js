import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import userMissionService from '../services/userMission.service.js';
import ApiError from '../utils/ApiError.js';

/**
 * @description ให้ผู้ใช้เข้าร่วมภารกิจ
 * @route POST /v1/user-mission/enroll
 */
const enrollInMission = catchAsync(async (req, res) => {
  console.log('ENROLL MISSION');
  const { missionId, userId } = req.body;
  const newUserMission = await userMissionService.enrollInMission(userId, missionId);
  console.log('ENROLLED MISSION', newUserMission);

  res.status(httpStatus.CREATED).json(newUserMission);
});

/**
 * @description ให้ผู้ใช้กดรับรางวัลจากภารกิจที่ทำสำเร็จแล้ว
 * @route POST /v1/user-mission/claim
 */
const claimMissionReward = catchAsync(async (req, res) => {
  const { userId, userMissionId } = req.body;
  const claimedMission = await userMissionService.claimMissionReward(userId, userMissionId);
  res.status(httpStatus.OK).json(claimedMission);
});

/**
 * @description ดึงข้อมูลภารกิจทั้งหมดของผู้ใช้ (My Missions)
 * @route GET /v1/user-mission/:userId?filter=[active|history]
 */
const getMyMissions = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const filter = req.query.filter; // รับ filter จาก query string
  const myMissions = await userMissionService.getMyMissions(userId, { filter });
  res.status(httpStatus.OK).json(myMissions);
});

/**
 * @description ดึงข้อมูลรายละเอียดภารกิจของผู้ใช้แบบเจาะจง
 * @route GET /v1/user-mission/:userMissionId
 */
const getMyMissionDetails = catchAsync(async (req, res) => {
  const { userMissionId } = req.params;
  const missionDetails = await userMissionService.getMyMissionDetails(userMissionId);

  if (!missionDetails) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User mission not found');
  }

  // (Optional) อาจจะเพิ่มการตรวจสอบว่าเป็นเจ้าของภารกิจจริงหรือไม่
  // if (missionDetails.userId !== req.user.id) { ... }

  res.status(httpStatus.OK).json(missionDetails);
});

export default {
  enrollInMission,
  claimMissionReward,
  getMyMissions,
  getMyMissionDetails,
};
