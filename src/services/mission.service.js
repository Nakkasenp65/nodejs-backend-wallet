import httpStatus from 'http-status';
import { MissionType } from '../generated/prisma/index.js';
import prisma from '../libs/prisma.js'; // หรือ path ไปยัง prisma client ของคุณ
import ApiError from '../utils/ApiError.js';

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
const createMission = async (payload) => {
  const newMission = await prisma.mission.create({ data: payload });
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
/**
 * ดึงข้อมูลภารกิจทั้งหมดสำหรับหน้า Admin พร้อมรองรับการกรอง, จัดเรียง, แบ่งหน้า, และสถิติ
 * @param {object} options - ตัวเลือกสำหรับ Query
 * @param {string} [options.search] - คำค้นหาสำหรับชื่อภารกิจหรือคำอธิบาย
 * @param {string} [options.type] - กรองตามประเภทภารกิจ (เช่น 'STREAK', 'REFERRAL')
 * @param {string} [options.status] - กรองตามสถานะ ('ACTIVE', 'EXPIRED')
 * @param {string} [options.sort] - รูปแบบการเรียงลำดับ ('latest', 'expiresSoon', 'rewardHigh')
 * @param {number} [options.page=1] - หน้าปัจจุบันสำหรับการแบ่งหน้า
 * @param {number} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @returns {Promise<object>} Object ที่มี:
 *                            - `data`: Array ของ Mission objects
 *                            - `paging`: ข้อมูลการแบ่งหน้า
 *                            - `stats`: ข้อมูลสถิติสรุป (total, active, soon)
 */
const getAllMissionsForAdmin = async (options = {}) => {
  // 1. กำหนดค่าเริ่มต้นและดึงค่าจาก options
  const { page = 1, pageSize = 10, search, type, status, sort = 'latest' } = options;

  // 2. เตรียมตัวแปรสำหรับ Pagination
  const take = parseInt(pageSize, 10);
  const skip = (parseInt(page, 10) - 1) * take;
  const now = new Date();

  // 3. สร้างเงื่อนไขการค้นหา (Where Clause) แบบไดนามิก
  const where = {};
  if (search) {
    // ค้นหาแบบ case-insensitive ทั้งใน title และ description
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (type && type !== 'ALL') {
    where.type = type;
  }
  if (status && status !== 'ALL') {
    if (status === 'ACTIVE') {
      where.webExpiresAt = { gt: now }; // gt = Greater Than (มากกว่า)
    } else if (status === 'EXPIRED') {
      where.webExpiresAt = { lte: now }; // lte = Less Than or Equal (น้อยกว่าหรือเท่ากับ)
    }
  }

  // 4. สร้างเงื่อนไขการเรียงลำดับ (Order By Clause)
  let orderBy = {};
  switch (sort) {
    case 'expiresSoon':
      orderBy = { webExpiresAt: 'asc' }; // เรียงจากน้อยไปมาก (ใกล้หมดอายุก่อน)
      where.webExpiresAt = { gt: now }; // การเรียงแบบนี้ควรใช้กับภารกิจที่ยังไม่หมดอายุเท่านั้น
      break;
    case 'rewardHigh':
      orderBy = { rewardAmount: 'desc' }; // เรียงจากมากไปน้อย
      break;
    case 'latest':
    default:
      orderBy = { createdAt: 'desc' }; // เรียงจากมากไปน้อย (สร้างล่าสุดก่อน)
      break;
  }

  // 5. ดึงข้อมูลภารกิจและนับจำนวนทั้งหมดพร้อมกันเพื่อประสิทธิภาพสูงสุด
  const [missions, totalMissions] = await prisma.$transaction([
    prisma.mission.findMany({
      where,
      orderBy,
      skip,
      take,
      // ---- ส่วนสำคัญเพื่อประสิทธิภาพ ----
      // ใช้ `include` กับ `_count` เพื่อดึงแค่ "จำนวน" ผู้ใช้ที่เข้าร่วม
      // แทนที่จะดึงข้อมูล User object ทั้งหมดซึ่งอาจมีขนาดใหญ่มาก
      include: {
        _count: {
          select: { enrolledBy: true },
        },
      },
    }),
    prisma.mission.count({ where }),
  ]);

  // 6. [Optional but Recommended] คำนวณค่า Stats ที่ฝั่ง Backend
  // เพื่อลดภาระ Frontend และส่งข้อมูลที่จำเป็นเท่านั้น
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [total, active, soon] = await prisma.$transaction([
    prisma.mission.count(), // นับทั้งหมดแบบไม่มีเงื่อนไข
    prisma.mission.count({ where: { webExpiresAt: { gt: now } } }), // นับที่ยัง Active
    prisma.mission.count({ where: { webExpiresAt: { gt: now, lte: sevenDaysFromNow } } }), // นับที่ใกล้หมดอายุใน 7 วัน
  ]);

  const stats = { total, active, soon };

  // 7. จัดรูปแบบข้อมูลให้ตรงกับที่ Frontend คาดหวัง
  // Frontend เดิมใช้ `m.enrolledBy.length`, เราจะแปลง `_count.enrolledBy` ให้เป็นแบบนั้น
  const formattedMissions = missions.map((mission) => {
    const { _count, ...restOfMission } = mission;
    return {
      ...restOfMission,
      enrolledByCount: _count.enrolledBy, // สร้าง key ใหม่ที่ชัดเจน
      // หรือถ้าอยากให้เหมือนเดิมเป๊ะๆ ก็ทำแบบนี้ได้ (แต่ไม่แนะนำ)
      // enrolledBy: { length: _count.enrolledBy }
    };
  });

  // 8. สร้าง Object สำหรับ Pagination
  const paging = {
    page,
    pageSize: take,
    total: totalMissions,
    totalPages: Math.ceil(totalMissions / take),
  };

  // 9. คืนค่าข้อมูลทั้งหมดในโครงสร้างที่ Frontend ต้องการ
  return {
    data: formattedMissions,
    paging,
    stats,
  };
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

const deleteMission = async (missionId) => {
  if (!missionId) throw new ApiError(httpStatus.BAD_REQUEST);
  return await prisma.mission.delete({
    where: { id: missionId },
  });
};

const editMission = async (missionId, payload) => {
  if (!missionId) throw new ApiError(httpStatus.BAD_REQUEST);
  return await prisma.mission.update({ where: missionId, data: payload });
};

export default {
  createMission,
  updateMission,
  getAllMissionsForAdmin,
  getAvailableMissions,
  deleteMission,
  editMission,
};
