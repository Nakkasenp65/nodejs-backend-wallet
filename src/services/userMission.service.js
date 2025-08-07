import prisma from '../libs/prisma.js';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';

/**
 * -----------------------------------------
 * User Mission Service
 * จัดการภารกิจที่ผู้ใช้แต่ละคนเข้าร่วม
 * -----------------------------------------
 */

/**
 * ให้ผู้ใช้เข้าร่วมภารกิจ (Enroll)
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} missionId - ID ของ Mission ที่จะเข้าร่วม
 * @returns {Promise<object>} Object ของ UserMission ที่สร้างใหม่
 */
const enrollInMission = async (userId, missionId) => {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
  });

  if (!mission) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Mission not found');
  }
  if (new Date() > mission.webExpiresAt) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This mission is no longer available for enrollment.');
  }

  const existingEnrollment = await prisma.userMission.findUnique({
    where: { userId_missionId: { userId, missionId } },
  });

  if (existingEnrollment) {
    throw new ApiError(httpStatus.CONFLICT, 'User is already enrolled in this mission');
  }

  const userExpiresAt = new Date();
  userExpiresAt.setDate(userExpiresAt.getDate() + mission.durationDays);

  const newUserMission = await prisma.userMission.create({
    data: {
      userId: userId,
      missionId: missionId,
      status: 'ENROLLED',
      userExpiresAt: userExpiresAt,
      completeProgress: mission.completeProgress,
    },
    include: {
      mission: true, // ส่งข้อมูล mission กลับไปด้วยเสมอ
    },
  });

  return newUserMission;
};

/**
 * อัปเดตความคืบหน้าของภารกิจ (ถูกเรียกจาก Service อื่น)
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} eventType - ประเภทของเหตุการณ์ เช่น 'DEPOSIT_SUCCESS'
 * @param {object} eventData - ข้อมูลของเหตุการณ์ เช่น { amount: 500 }
 */
const updateMissionProgress = async (userId, eventType, eventData) => {
  // Logic การค้นหาภารกิจที่ Active และตรงกับเงื่อนไขของ eventType
  // ตัวอย่าง: ถ้าเป็น DEPOSIT_SUCCESS ก็จะหาภารกิจเกี่ยวกับการออม
  const activeUserMission = await prisma.userMission.findFirst({
    where: {
      userId: userId,
      status: 'ENROLLED',
      // เพิ่มเงื่อนไขตาม eventType ที่นี่
    },
  });

  if (!activeUserMission) return;

  // Logic การเพิ่ม progress
  // ตัวอย่าง: ถ้าเป็นภารกิจนับจำนวนครั้ง
  const updatedMission = await prisma.userMission.update({
    where: { id: activeUserMission.id },
    data: { currentProgress: { increment: 1 } },
  });

  // ตรวจสอบการสำเร็จภารกิจโดยอัตโนมัติ
  await checkForCompletion(updatedMission);
};

/**
 * (Private Function) ตรวจสอบว่าภารกิจสำเร็จหรือไม่ และอัปเดตสถานะ
 * @param {object} userMission - Object ของ UserMission ที่เพิ่งอัปเดต progress
 */
const checkForCompletion = async (userMission) => {
  if (userMission.currentProgress >= userMission.completeProgress) {
    const claimExpiresAt = new Date();
    claimExpiresAt.setHours(claimExpiresAt.getHours() + 24);

    await prisma.userMission.update({
      where: { id: userMission.id },
      data: {
        status: 'AWAITING_CLAIM',
        completedAt: new Date(),
        claimExpiresAt: claimExpiresAt,
      },
    });
    // ส่ง Notification แจ้งเตือนผู้ใช้
  }
};

/**
 * ให้ผู้ใช้กดรับรางวัลภารกิจ
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} userMissionId - ID ของ UserMission ที่จะรับรางวัล
 * @returns {Promise<object>} Object ของ UserMission ที่อัปเดตแล้ว
 */
const claimMissionReward = async (userId, userMissionId) => {
  const missionToClaim = await prisma.userMission.findUnique({
    where: { id: userMissionId },
    include: { mission: true },
  });

  if (!missionToClaim || missionToClaim.userId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mission not found or you don't have permission.");
  }
  if (missionToClaim.status !== 'AWAITING_CLAIM') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This mission is not available for claiming.');
  }
  if (new Date() > missionToClaim.claimExpiresAt) {
    await prisma.userMission.update({
      where: { id: userMissionId },
      data: { status: 'CLAIM_EXPIRED' },
    });
    throw new ApiError(httpStatus.BAD_REQUEST, 'The claim period for this mission has expired.');
  }

  return prisma.$transaction(async (tx) => {
    const rewardAmount = missionToClaim.mission.rewardAmount;

    const rewardTransaction = await tx.transaction.create({
      data: {
        name: `รางวัลภารกิจ: ${missionToClaim.mission.title}`,
        type: 'REWARD',
        status: 'SUCCESS',
        amount: rewardAmount,
        walletId: missionToClaim.walletId, // **หมายเหตุ:** คุณต้องหาวิธีดึง walletId ของ user มา
      },
    });

    await tx.wallet.update({
      where: { id: missionToClaim.walletId }, // **หมายเหตุ:** เช่นเดียวกัน
      data: { bonusBalance: { increment: rewardAmount } },
    });

    return tx.userMission.update({
      where: { id: userMissionId },
      data: {
        status: 'CLAIMED',
        claimedAt: new Date(),
        rewardTransactionId: rewardTransaction.id,
      },
    });
  });
};

/**
 * ดึงข้อมูลภารกิจทั้งหมดของผู้ใช้ (My Missions) พร้อมความสามารถในการกรอง
 * @param {string} userId - ID ของผู้ใช้
 * @param {object} [options={}] - ตัวเลือกเพิ่มเติม
 * @param {string} [options.filter] - ประเภทการกรอง: 'active' หรือ 'history'
 * @returns {Promise<Array<object>>} Array ของ UserMissions
 */
const getMyMissions = async (userId, options = {}) => {
  const { filter } = options;

  // 1. สร้างเงื่อนไขพื้นฐานของ where clause
  const whereClause = {
    userId: userId,
  };

  // 2. เพิ่มเงื่อนไขการกรองตาม filter ที่ส่งเข้ามา
  switch (filter) {
    // กรณีต้องการเฉพาะภารกิจที่ "กำลังทำ" หรือ "รอกดรับรางวัล"
    case 'active':
      whereClause.status = {
        in: ['ENROLLED', 'AWAITING_CLAIM'],
      };
      break;

    // กรณีต้องการเฉพาะภารกิจที่ "จบไปแล้ว" (สำเร็จ, หมดอายุ)
    case 'history':
      whereClause.status = {
        in: ['CLAIMED', 'EXPIRED', 'CLAIM_EXPIRED'],
      };
      break;

    // ถ้าไม่ระบุ filter (default) ก็จะดึงมาทั้งหมด
    default:
      break;
  }

  // 3. ดึงข้อมูลจากฐานข้อมูลด้วย where clause ที่สร้างขึ้น
  return prisma.userMission.findMany({
    where: whereClause,
    include: {
      mission: true,
    },
    orderBy: [
      { status: 'asc' }, // 1. เรียงตามสถานะก่อน (AWAITING_CLAIM, ENROLLED จะมาก่อน)
      { enrolledAt: 'desc' }, // 2. ถ้าสถานะเหมือนกัน ให้เรียงตามวันที่เข้าร่วมล่าสุด
    ],
  });
};

/**
 * ดึงข้อมูลรายละเอียดภารกิจของผู้ใช้แบบเจาะจง
 * @param {string} userMissionId - ID ของ UserMission
 * @returns {Promise<object>} Object ของ UserMission
 */
const getMyMissionDetails = async (userMissionId) => {
  return prisma.userMission.findUnique({
    where: { id: userMissionId },
    include: {
      mission: true,
    },
  });
};

/**
 * (สำหรับ Cron Job) จัดการภารกิจที่หมดอายุ
 */
const expireOverdueMissions = async () => {
  const now = new Date();
  // อัปเดตภารกิจที่ทำไม่สำเร็จ
  await prisma.userMission.updateMany({
    where: {
      status: 'ENROLLED',
      userExpiresAt: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });
  // อัปเดตภารกิจที่ไม่ได้กดรับรางวัล
  await prisma.userMission.updateMany({
    where: {
      status: 'AWAITING_CLAIM',
      claimExpiresAt: { lt: now },
    },
    data: { status: 'CLAIM_EXPIRED' },
  });
};

export default {
  enrollInMission,
  updateMissionProgress,
  claimMissionReward,
  getMyMissions,
  getMyMissionDetails,
  expireOverdueMissions,
};
