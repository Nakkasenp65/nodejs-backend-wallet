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
  const { missionId, userId } = req.body;
  const newUserMission = await missionService.enrollUserInMission(userId, missionId);
  res.status(httpStatus.CREATED).json({ newUserMission });
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

/**
 * Service สำหรับให้ผู้ใช้กดรับรางวัลจากภารกิจที่ทำสำเร็จแล้ว
 * @param {string} userId - ID ของผู้ใช้ที่กดรับ
 * @param {string} userMissionId - ID ของ UserMission ที่ต้องการกดรับ
 * @returns {Promise<object>} - Object ของ UserMission ที่อัปเดตแล้ว
 */
const claimMissionReward = async (userId, userMissionId) => {
  // 1. ค้นหา UserMission ที่ต้องการกดรับ
  const missionToClaim = await prisma.userMission.findUnique({
    where: { id: userMissionId },
    include: { mission: true }, // ดึงข้อมูล mission แม่แบบมาด้วยเพื่อเอา rewardAmount
  });

  // 2. ตรวจสอบเงื่อนไขสำคัญ
  if (!missionToClaim || missionToClaim.userId !== userId) {
    throw new Error("Mission not found or you don't have permission.");
  }
  if (missionToClaim.status !== 'AWAITING_CLAIM') {
    throw new Error('This mission is not available for claiming.');
  }
  if (new Date() > missionToClaim.claimExpiresAt) {
    // ถ้าหมดเวลาแล้ว, อัปเดตสถานะและแจ้งผู้ใช้
    await prisma.userMission.update({
      where: { id: userMissionId },
      data: { status: 'CLAIM_EXPIRED' },
    });
    throw new Error('The claim period for this mission has expired.');
  }

  // 3. ใช้ Transaction เพื่อสร้างรางวัลและอัปเดตสถานะพร้อมกัน
  const claimedMission = await prisma.$transaction(async (tx) => {
    // 3.1 สร้าง Transaction รางวัล
    const rewardTransaction = await tx.transaction.create({
      data: {
        name: `รางวัลจากภารกิจ: ${missionToClaim.mission.title}`,
        type: 'REWARD',
        status: 'SUCCESS',
        amount: missionToClaim.mission.rewardAmount,
        walletId: missionToClaim.user.walletId, // ต้องหาวิธีดึง walletId ของ user มา
        // ... field อื่นๆ
      },
    });

    // 3.2 อัปเดต Wallet ของผู้ใช้ (เพิ่มเงินใน bonusBalance)
    await tx.wallet.update({
      where: { userId: userId },
      data: {
        bonusBalance: { increment: missionToClaim.mission.rewardAmount },
      },
    });

    // 3.3 อัปเดต UserMission เป็นสถานะสุดท้าย
    const finalMissionState = await tx.userMission.update({
      where: { id: userMissionId },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date(),
        rewardTransactionId: rewardTransaction.id,
      },
    });

    return finalMissionState;
  });

  // ส่ง Notification ว่าได้รับรางวัลแล้ว
  // await notificationService.sendRewardClaimedNotification(userId, claimedMission.id);

  return claimedMission;
};

export default {
  enrollInMission,
  getAvailableMissions,
  getAllUserMissions,
  getUserMissionDetails,
  createNewMission,
  claimMissionReward,
};
