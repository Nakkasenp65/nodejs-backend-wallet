import prisma from '../libs/prisma.js';

// --- ฟังก์ชันใหม่สำหรับ Admin ---

/**
 * @description สร้าง Mission ใหม่ (สำหรับ Admin)
 * @param {object} missionData - ข้อมูลของ Mission ที่จะสร้าง
 * @param {string} missionData.title - ชื่อภารกิจ
 * @param {string} missionData.description - คำอธิบายภารกิจ
 * @param {number} missionData.rewardAmount - จำนวนเงินรางวัล
 * @param {string|Date} missionData.webExpiresAt - วันที่ภารกิจจะหายไปจากหน้าให้กดรับ
 * @param {number} missionData.durationDays - จำนวนวันที่ผู้ใช้มีในการทำภารกิจให้สำเร็จหลังกดรับ
 * @returns {Promise<object>} - Object ของ Mission ที่ถูกสร้างขึ้น
 */
const createMission = async (missionData) => {
  const newMission = await prisma.mission.create({
    data: missionData, // ส่งข้อมูลเข้าไปตรงๆ ได้เลยถ้า key ตรงกับใน schema
  });
  return newMission;
};

const createMockMissions = async () => {
  // ตรวจสอบว่ามีภารกิจตัวอย่างแล้วหรือยัง เพื่อป้องกันการสร้างซ้ำ
  const existingMission = await prisma.mission.findFirst({
    where: {
      title: 'ออมต่อเนื่อง 7 วัน',
    },
  });

  if (existingMission) {
    console.log('Mock missions already exist. Skipping creation.');
    return { message: 'Mock missions already exist.' };
  }

  const missionsToCreate = [
    {
      title: 'ออมต่อเนื่อง 7 วัน',
      description: 'เพียงออมเงินติดต่อกันให้ครบ 7 วัน เพื่อรับรางวัลพิเศษไปเลย!',
      rewardAmount: 50.0,
      webExpiresAt: new Date('2025-12-31T23:59:59Z'), // หมดเขตให้กดรับ สิ้นปี 2025
      durationDays: 7, // มีเวลาทำ 7 วันหลังกดรับ
    },
    {
      title: 'ภารกิจออมครั้งแรก',
      description: 'เริ่มต้นเส้นทางการออมของคุณ! เพียงออมเงินครั้งแรกเท่าไหร่ก็ได้ รับรางวัลทันที',
      rewardAmount: 20.0,
      webExpiresAt: new Date('2025-10-31T23:59:59Z'),
      durationDays: 30, // ให้เวลา 30 วันในการออมครั้งแรก
    },
    {
      title: 'พิชิตยอดออม 1,000 บาท',
      description: 'สะสมยอดออมในกระเป๋าให้ถึง 1,000 บาทภายใน 1 เดือนเพื่อรับโบนัส',
      rewardAmount: 100.0,
      webExpiresAt: new Date('2025-09-30T23:59:59Z'),
      durationDays: 30,
    },
    {
      title: '[หมดเขต] ภารกิจพิเศษเดือนมิถุนายน',
      description: 'ภารกิจนี้หมดเขตให้เข้าร่วมแล้ว',
      rewardAmount: 99.0,
      webExpiresAt: new Date('2025-06-30T23:59:59Z'), // หมดเขตไปแล้ว
      durationDays: 5,
    },
  ];

  const result = await prisma.mission.createMany({
    data: missionsToCreate,
    skipDuplicates: true, // ป้องกัน error หากพยายามสร้างซ้ำ (ถึงแม้จะเช็คไปแล้ว)
  });

  console.log(`Created ${result.count} mock missions.`);
  return result;
};

const enrollUserInMission = async (userId, missionId) => {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
  });

  if (!mission) {
    throw new Error('Mission not found');
  }

  if (new Date() > mission.webExpiresAt) {
    throw new Error('This mission is no longer available for enrollment.');
  }

  const existingEnrollment = await prisma.userMission.findUnique({
    where: { userId_missionId: { userId, missionId } },
  });

  if (existingEnrollment) {
    throw new Error('User is already enrolled in this mission');
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
      mission: true,
    },
  });

  return newUserMission;
};

/**
 * @description ดึงข้อมูลภารกิจที่ผู้ใช้สามารถเข้าร่วมได้
 */
const getAvailableMissions = async (userId) => {
  const enrolledMissionIds = (
    await prisma.userMission.findMany({
      where: { userId: userId },
      select: { missionId: true },
    })
  ).map((um) => um.missionId);

  const availableMissions = await prisma.mission.findMany({
    where: {
      webExpiresAt: {
        gte: new Date(), // เช็คภารกิจที่ยังไม่หมดเขตให้กดรับ
      },
      id: {
        notIn: enrolledMissionIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return availableMissions;
};

/**
 * @description ดึงข้อมูลภารกิจทั้งหมดของผู้ใช้คนนั้นๆ
 */
const getAllMissionsForUser = async (userId) => {
  const userMissions = await prisma.userMission.findMany({
    where: { userId: userId },
    include: {
      mission: true,
    },
    orderBy: {
      enrolledAt: 'desc',
    },
  });
  return userMissions;
};

/**
 * @description ดึงข้อมูลรายละเอียดภารกิจของผู้ใช้แบบเจาะจง
 */
const getUserMissionDetails = async (userMissionId) => {
  const userMission = await prisma.userMission.findUnique({
    where: { id: userMissionId },
    include: {
      mission: true,
    },
  });
  return userMission;
};

// Export ทั้งฟังก์ชันใหม่และฟังก์ชันเดิม
export default {
  createMission,
  createMockMissions,
  enrollUserInMission,
  getAvailableMissions,
  getAllMissionsForUser,
  getUserMissionDetails,
};
