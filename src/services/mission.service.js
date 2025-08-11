import prisma from '../libs/prisma.js'; // หรือ path ไปยัง prisma client ของคุณ

/**
 * -----------------------------------------
 * Mission Service
 * จัดการเฉพาะภารกิจต้นแบบ (Mission Templates)
 * -----------------------------------------
 */

/**
 * สร้าง Mission ใหม่ในระบบ (สำหรับ Admin)
 * @param {object} missionData - ข้อมูลของ Mission ที่จะสร้าง
 * @returns {Promise<object>} Object ของ Mission ที่ถูกสร้างขึ้น
 */
const createMission = async (missionData) => {
  const newMission = await prisma.mission.create({
    data: missionData,
  });
  return newMission;
};

/**
 * แก้ไขรายละเอียดของ Mission ที่มีอยู่ (สำหรับ Admin)
 * @param {string} missionId - ID ของ Mission ที่จะแก้ไข
 * @param {object} updateData - ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Object ของ Mission ที่อัปเดตแล้ว
 */
const updateMission = async (missionId, updateData) => {
  const updatedMission = await prisma.mission.update({
    where: { id: missionId },
    data: updateData,
  });
  return updatedMission;
};

/**
 * ดึงข้อมูล Mission ทั้งหมดในระบบ (สำหรับ Admin Panel)
 * @param {object} [options={}] - ตัวเลือกสำหรับ pagination
 * @returns {Promise<Array<object>>} Array ของ Missions
 */
const getAllMissionsForAdmin = async (options = {}) => {
  // เพิ่ม Logic สำหรับ pagination ได้ที่นี่
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return missions;
};

/**
 * ดึงข้อมูลภารกิจที่ผู้ใช้ "สามารถเข้าร่วมได้"
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Array<object>>} Array ของ Missions ที่ผู้ใช้ยังไม่เคยเข้าร่วมและยังไม่หมดเขต
 */
const getAvailableMissions = async (userId) => {
  const now = new Date();

  // 1) ภารกิจทั้งหมดที่ user เคยรับ (กันรับซ้ำ mission เดิม)
  const enrolledMissionIds = (
    await prisma.userMission.findMany({
      where: { userId },
      select: { missionId: true },
    })
  )
    .map((um) => um.missionId)
    .filter(Boolean); // กัน null

  // 2) ประเภท (type) ที่ user "กำลังมีภารกิจอยู่" (กันรับภารกิจคนละอันแต่ type เดียวกัน)
  const activeUserMissions = await prisma.userMission.findMany({
    where: {
      userId,
      status: { in: ['ENROLLED', 'AWAITING_CLAIM'] },
    },
    include: {
      mission: { select: { type: true } },
    },
  });

  const blockedTypes = Array.from(new Set(activeUserMissions.map((um) => um.mission?.type).filter(Boolean)));

  // 3) หา mission ที่ยังสมัครได้
  const availableMissions = await prisma.mission.findMany({
    where: {
      AND: [
        // ยังไม่หมดเขต (หรือไม่มีวันหมดอายุ)
        { OR: [{ webExpiresAt: null }, { webExpiresAt: { gte: now } }] },

        // ยังไม่เคยรับ mission นี้มาก่อน
        { id: { notIn: enrolledMissionIds } },

        // ไม่มีภารกิจ type เดียวกันค้างอยู่
        blockedTypes.length ? { type: { notIn: blockedTypes } } : {},
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  return availableMissions;
};

export default {
  createMission,
  updateMission,
  getAllMissionsForAdmin,
  getAvailableMissions,
};
