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
 * Rule: ห้ามมีภารกิจ "ชนิดเดียวกัน" ค้างอยู่พร้อมกัน (ENROLLED | AWAITING_CLAIM)
 * @param {string} userId
 * @param {string} missionId
 * @returns {Promise<object>} UserMission ที่สร้างใหม่ (include mission)
 */
const enrollInMission = async (userId, missionId) => {
  const BLOCKING_STATUSES = ['ENROLLED', 'AWAITING_CLAIM'];
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // 1) โหลด mission ที่จะสมัคร (ต้องการ type/duration/config)
    const mission = await tx.mission.findUnique({
      where: { id: missionId },
      select: {
        id: true,
        title: true,
        type: true,
        webExpiresAt: true,
        durationDays: true,
        completeProgress: true,
      },
    });

    if (!mission) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Mission not found');
    }

    // ยังสมัครได้ ถ้าไม่มีวันหมดอายุ หรือยังไม่หมด
    if (mission.webExpiresAt && now > mission.webExpiresAt) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'This mission is no longer available for enrollment.');
    }

    // 2) กันรับซ้ำภารกิจเดียวกัน
    const existingSameMission = await tx.userMission.findUnique({
      where: { userId_missionId: { userId, missionId } },
      select: { id: true },
    });
    if (existingSameMission) {
      throw new ApiError(httpStatus.CONFLICT, 'User is already enrolled in this mission');
    }

    // 3) กันชนประเภทเดียวกันที่กำลังทำ/รอเคลมอยู่
    const activeSameType = await tx.userMission.findFirst({
      where: {
        userId,
        status: { in: BLOCKING_STATUSES },
        mission: { type: mission.type },
      },
      select: { id: true, status: true, missionId: true },
    });
    if (activeSameType) {
      throw new ApiError(httpStatus.CONFLICT, 'You already have an active mission of this type.');
    }

    // 4) คำนวณ config ที่ต้องมี (กันค่า null)
    const durationDays = Number.isFinite(mission.durationDays) ? mission.durationDays : 7; // fallback หรือโยน error ถ้าอยาก strict
    const completeProgress =
      Number.isFinite(mission.completeProgress) && mission.completeProgress > 0 ? mission.completeProgress : 1;

    const userExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 5) สร้าง UserMission
    const newUserMission = await tx.userMission.create({
      data: {
        userId,
        missionId,
        status: 'ENROLLED',
        userExpiresAt,
        completeProgress,
      },
      include: {
        mission: true,
      },
    });

    return newUserMission;
  });
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
 * ให้ผู้ใช้กดรับรางวัลภารกิจ
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} userMissionId - ID ของ UserMission ที่จะรับรางวัล
 * @returns {Promise<object>} Object ของ UserMission ที่อัปเดตแล้ว
 */
const claimMissionReward = async (userId, userMissionId) => {
  const now = new Date();

  const missionToClaim = await prisma.userMission.findUnique({
    where: { id: userMissionId },
    include: {
      mission: true,
      user: { include: { wallet: true } }, // get user's wallet
    },
  });

  if (!missionToClaim || missionToClaim.userId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mission not found or you don't have permission.");
  }
  if (missionToClaim.status !== 'AWAITING_CLAIM') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This mission is not available for claiming.');
  }

  const { claimExpiresAt } = missionToClaim;
  if (!claimExpiresAt || now > claimExpiresAt) {
    await prisma.userMission.update({
      where: { id: userMissionId },
      data: { status: 'CLAIM_EXPIRED' },
    });
    throw new ApiError(httpStatus.BAD_REQUEST, 'The claim period for this mission has expired.');
  }

  const rewardAmount = Number(missionToClaim.mission?.rewardAmount ?? 0);
  if (!(rewardAmount > 0)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This mission has no reward amount configured.');
  }

  return prisma.$transaction(async (tx) => {
    // ensure wallet
    let wallet = missionToClaim.user.wallet;
    if (!wallet) {
      // either create one or error (choose what fits your app)
      wallet = await tx.wallet.create({
        data: { userId: missionToClaim.userId },
      });
    }

    const rewardTransaction = await tx.transaction.create({
      data: {
        name: `รางวัลภารกิจ: ${missionToClaim.mission?.title ?? ''}`,
        type: 'REWARD',
        status: 'SUCCESS',
        amount: rewardAmount,
        walletId: wallet.id,
      },
    });

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { bonusBalance: { increment: rewardAmount } },
    });

    // NOTE: your schema has no rewardTransactionId on UserMission.
    // If you want to link it, add the field (see below).
    const updated = await tx.userMission.update({
      where: { id: userMissionId },
      data: {
        status: 'CLAIMED',
        claimedAt: now,
        // rewardTransactionId: rewardTransaction.id, // only if you add it to the schema
      },
    });

    return updated;
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
  console.log('Get my mission');
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
  const missions = await prisma.userMission.findMany({
    where: whereClause,
    orderBy: [
      { status: 'asc' }, // 1. เรียงตามสถานะก่อน (AWAITING_CLAIM, ENROLLED จะมาก่อน)
      { enrolledAt: 'desc' }, // 2. ถ้าสถานะเหมือนกัน ให้เรียงตามวันที่เข้าร่วมล่าสุด
    ],
    include: {
      mission: true,
    },
  });

  return missions;
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
 * (ที่คุณเรียกว่า CheckReward)
 * ตรวจสอบและอัปเดตความคืบหน้าของภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่
 * โดยอิงจากเหตุการณ์ (Event) ที่เกิดขึ้นในระบบ
 * @param {string} userId - ID ของผู้ใช้ที่เกิด Event
 * @param {string} eventType - ประเภทของ Event เช่น 'DEPOSIT_SUCCESS'
 * @param {object} eventData - ข้อมูลที่เกี่ยวข้องกับ Event เช่น { amount: 100.00 }
 */
const checkAndUpdateMissionProgress = async (userId, eventType, eventData) => {
  // 1. ค้นหาภารกิจทั้งหมดที่ผู้ใช้กำลังทำอยู่ (ENROLLED)
  const activeUserMissions = await prisma.userMission.findMany({
    where: {
      userId: userId,
      status: 'ENROLLED',
    },
    include: {
      mission: true, // ดึงข้อมูล Mission ต้นแบบมาด้วยเพื่อตรวจสอบเงื่อนไข
    },
  });

  if (activeUserMissions.length === 0) {
    console.log(`No active missions found for user ${userId}.`);
    return; // ไม่มีภารกิจให้ทำ, จบการทำงาน
  }

  console.log(`Found ${activeUserMissions.length} active missions for user ${userId}. Checking progress...`);

  // 2. สร้าง Array ของ Promises สำหรับการอัปเดตแต่ละภารกิจ
  const updatePromises = activeUserMissions.map(async (userMission) => {
    let progressIncrement = 0;

    // --- 3. Logic การคำนวณ Progress ตามประเภทภารกิจและ Event ---
    // เราจะใช้ switch-case ที่ซ้อนกันเพื่อความชัดเจน
    switch (eventType) {
      case 'DEPOSIT_SUCCESS': {
        switch (userMission.mission.type) {
          // ภารกิจ Onboarding (เช่น ออมครั้งแรก)
          case 'ONBOARDING':
            progressIncrement = 1; // นับเป็น 1 ครั้ง
            break;

          // ภารกิจทั่วไป (อาจจะเป็นนับครั้ง หรือนับยอด)
          case 'RECURRING':
            // ตัวอย่าง: ถ้า completeProgress > 100 ให้ถือว่าเป็นภารกิจ "สะสมยอด"
            if (userMission.mission.completeProgress > 100) {
              progressIncrement = eventData.amount; // เพิ่มตามจำนวนเงิน
            } else {
              progressIncrement = 1; // เพิ่ม 1 ครั้ง
            }
            break;
        }
        break;
      }

      case 'NEWCOMER_FIRST_DEPOSIT': {
        // This event should only affect missions of type 'REFERRAL'
        if (userMission.mission.type === 'REFERRAL') {
          // Increment the counter by 1, representing one successful referral.
          progressIncrement = 1;
          console.log(`[Mission] User ${userId}'s REFERRAL mission progress will be incremented.`);
        }
        break;
      }
    }

    // --- 4. ถ้ามีการเปลี่ยนแปลง Progress, ให้อัปเดตฐานข้อมูล ---
    if (progressIncrement > 0) {
      const updatedMission = await prisma.userMission.update({
        where: { id: userMission.id },
        data: {
          currentProgress: { increment: progressIncrement },
        },
      });

      // --- 5. ตรวจสอบการสำเร็จภารกิจโดยอัตโนมัติ ---
      await checkForCompletion(updatedMission);
    }
  });

  // 6. รอให้การอัปเดตทั้งหมดเสร็จสิ้น
  await Promise.all(updatePromises);
  console.log(`Finished checking mission progress for user ${userId}.`);
};

/**
 * (Private Function) ตรวจสอบว่าภารกิจสำเร็จหรือไม่ และอัปเดตสถานะ
 * @param {object} userMission - Object ของ UserMission ที่เพิ่งอัปเดต progress
 */
const checkForCompletion = async (userMission) => {
  // ตรวจสอบว่า progress ปัจจุบันถึงเป้าหมายแล้ว และสถานะยังเป็น ENROLLED อยู่
  if (userMission.currentProgress >= userMission.completeProgress && userMission.status === 'ENROLLED') {
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

    console.log(`Mission ${userMission.id} completed! Status is now AWAITING_CLAIM.`);
    // (Optional) ส่ง Notification แจ้งเตือนผู้ใช้ว่าทำภารกิจสำเร็จแล้ว
  }
};

/**
 * (สำหรับ Cron Job) ค้นหาและอัปเดตสถานะภารกิจทั้งหมดที่หมดอายุ
 * ฟังก์ชันนี้ถูกออกแบบมาให้ถูกเรียกใช้โดย Scheduler (เช่น QStash, Vercel Cron) ตามเวลาที่กำหนด (เช่น ทุกๆ ชั่วโมง)
 * โดยจะจัดการภารกิจ 2 ประเภท:
 * 1. ภารกิจที่ผู้ใช้ทำไม่สำเร็จตามเวลาที่กำหนด (ENROLLED -> EXPIRED)
 * 2. ภารกิจที่ผู้ใช้ทำสำเร็จแต่ไม่มากดรับรางวัลตามเวลาที่กำหนด (AWAITING_CLAIM -> CLAIM_EXPIRED)
 * @returns {Promise<{expiredCount: number, claimExpiredCount: number}>} - Object ที่ระบุจำนวนภารกิจที่ถูกอัปเดตในแต่ละประเภท
 */
const expireOverdueMissions = async () => {
  const now = new Date();
  console.log(`[Cron Job] Running expireOverdueMissions at ${now.toISOString()}`);

  try {
    // --- 1. จัดการภารกิจที่ทำไม่สำเร็จ (ENROLLED -> EXPIRED) ---
    // ใช้ `updateMany` เพื่ออัปเดตหลาย record ในครั้งเดียว ซึ่งมีประสิทธิภาพสูงมาก
    const expiredResult = await prisma.userMission.updateMany({
      where: {
        // เงื่อนไข: สถานะต้องเป็น ENROLLED "และ" เวลาหมดอายุ (userExpiresAt) ต้องผ่านไปแล้ว
        status: 'ENROLLED',
        userExpiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // --- 2. จัดการภารกิจที่ไม่ได้กดรับรางวัล (AWAITING_CLAIM -> CLAIM_EXPIRED) ---
    const claimExpiredResult = await prisma.userMission.updateMany({
      where: {
        status: 'AWAITING_CLAIM',
        claimExpiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'CLAIM_EXPIRED',
      },
    });

    const result = {
      expiredCount: expiredResult.count,
      claimExpiredCount: claimExpiredResult.count,
    };

    console.log('[Cron Job] Finished expiring missions:', result);
    return result;
  } catch (error) {
    console.error('[Cron Job] An error occurred during expireOverdueMissions:', error);
    // โยน Error ต่อไปเพื่อให้ระบบ Scheduler (เช่น QStash) รู้ว่างานล้มเหลวและอาจจะลองใหม่ (retry)
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to process overdue missions.');
  }
};

export default {
  enrollInMission,
  updateMissionProgress,
  claimMissionReward,
  getMyMissions,
  getMyMissionDetails,
  expireOverdueMissions,
  checkAndUpdateMissionProgress,
  expireOverdueMissions,
};
