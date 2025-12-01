/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับภารกิจหลัก (Mission)
 * @description ไฟล์นี้รวบรวมฟังก์ชันสำหรับผู้ดูแลระบบในการสร้าง, แก้ไข, และดูข้อมูลเชิงลึกของภารกิจ
 * รวมถึงฟังก์ชันสำหรับผู้ใช้ในการดึงข้อมูลภารกิจที่สามารถเข้าร่วมได้
 * @module services/mission
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 * @requires zod - Library สำหรับการตรวจสอบความถูกต้องของข้อมูล (Schema Validation)
 */
import httpStatus from "http-status";
import { z } from "zod";
import { Prisma, MissionType, UserMissionStatus } from "@prisma/client";
import prisma from "../../../libs/prisma.js";
import ApiError from "../../../utils/ApiError.js";

/**
 * สร้างภารกิจใหม่ในระบบ (สำหรับ Admin)
 * @description ใช้ Zod Schema ในการตรวจสอบความถูกต้องของข้อมูล (Validation) ที่ส่งเข้ามาอย่างเข้มงวด
 * ก่อนที่จะสร้างข้อมูลลงในฐานข้อมูล
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลของภารกิจที่ต้องการสร้าง
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ภารกิจที่สร้างขึ้นใหม่
 * @throws {Error} หากข้อมูลไม่ถูกต้องตาม Schema (ZodError) หรือเกิดข้อผิดพลาดจากฐานข้อมูล
 */
const createMission = async (payload: any) => {
  const MissionSchema = z.object({
    title: z.string().min(1, "กรุณาระบุชื่อภารกิจ"),
    description: z.string().optional(),
    type: z.enum(["ONBOARDING", "ACCUMULATION", "STREAK", "REFERRAL", "DELETE"]), // ต้องเป็นค่าใน Enum นี้เท่านั้น
    rewardAmount: z.number().min(0, "รางวัลต้องไม่เป็นค่าติดลบ"),
    durationDays: z.number().int().positive("ระยะเวลาต้องเป็นจำนวนเต็มบวก"),
    completeProgress: z.number().int().positive("เป้าหมายต้องเป็นจำนวนเต็มบวก").optional().default(1),
    // เราสามารถกำหนดค่า default ได้ด้วย
  });

  try {
    const validatedData = MissionSchema.parse(payload);

    const missionDataToCreate: Prisma.MissionCreateInput = {
      title: validatedData.title,
      description: validatedData.description,
      type: validatedData.type as MissionType,
      rewardAmount: validatedData.rewardAmount,
      durationDays: validatedData.durationDays,
      completeProgress: validatedData.completeProgress,
      // เราสามารถเพิ่ม Business Logic ที่นี่ได้ เช่น:
      webExpiresAt: new Date(Date.now() + validatedData.durationDays * 24 * 60 * 60 * 1000),
    };

    // --- 5. Create the mission in the database ---
    const newMission = await prisma.mission.create({
      data: missionDataToCreate,
    });

    // (Optional) สามารถเพิ่ม Logic อื่นๆ หลังสร้างสำเร็จได้ที่นี่
    // await sendNotificationToAdmins('New Mission Created!');

    return newMission;
  } catch (error) {
    // --- 6. Robust Error Handling ---
    if (error instanceof z.ZodError) {
      // ถ้าเป็น Error จาก Zod (ข้อมูลไม่ถูกต้อง)
      console.error("Validation Error:", error);
      // เราสามารถโยน Error ที่มีความหมายมากขึ้นเพื่อให้ Layer บน (เช่น Controller) นำไปใช้ได้
      throw new Error(`ข้อมูลไม่ถูกต้อง: ${error}`);
    }
    // ถ้าเป็น Error อื่นๆ (เช่น Database down)
    console.error("Error creating mission:", error);
    throw new Error("ไม่สามารถสร้างภารกิจได้ในขณะนี้");
  }
};

/**
 * แก้ไขรายละเอียดของภารกิจที่มีอยู่ (สำหรับ Admin)
 * @async
 * @param {string} missionId - ID ของภารกิจที่ต้องการแก้ไข
 * @param {object} updateData - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ภารกิจที่อัปเดตแล้ว
 */
const updateMission = async (missionId: string, updateData: Prisma.MissionUpdateInput) => {
  const updatedMission = await prisma.mission.update({
    where: { id: missionId },
    data: updateData,
  });
  return updatedMission;
};

/**
 * ดึงข้อมูลภารกิจทั้งหมดสำหรับหน้า Admin พร้อมรองรับการกรอง, จัดเรียง, แบ่งหน้า, และสถิติ
 * @description ฟังก์ชันนี้ถูกปรับปรุงประสิทธิภาพโดยการใช้ `_count` เพื่อนับจำนวนผู้เข้าร่วมแทนการดึงข้อมูลทั้งหมด
 * และใช้ `$transaction` เพื่อดึงข้อมูลสถิติสรุป (total, active, soon) พร้อมกันในครั้งเดียว
 * @async
 * @param {object} [options={}] - ตัวเลือกสำหรับ Query
 * @returns {Promise<{data: Array<object>, paging: object, stats: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลภารกิจ, การแบ่งหน้า, และสถิติ
 */
const getAllMissionsForAdmin = async (options: any = {}) => {
  // 1. กำหนดค่าเริ่มต้นและดึงค่าจาก options
  const { page = 1, pageSize = 10, search, type, status, sort = "latest" } = options;

  // 2. เตรียมตัวแปรสำหรับ Pagination
  const take = parseInt(pageSize, 10);
  const skip = (parseInt(page, 10) - 1) * take;
  const now = new Date();

  // 3. สร้างเงื่อนไขการค้นหา (Where Clause) แบบไดนามิก
  const where: Prisma.MissionWhereInput = {};
  if (search) {
    // ค้นหาแบบ case-insensitive ทั้งใน title และ description
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type && type !== "ALL") {
    where.type = type as MissionType;
  }
  if (status && status !== "ALL") {
    if (status === "ACTIVE") {
      where.webExpiresAt = { gt: now }; // gt = Greater Than (มากกว่า)
    } else if (status === "EXPIRED") {
      where.webExpiresAt = { lte: now }; // lte = Less Than or Equal (น้อยกว่าหรือเท่ากับ)
    }
  }

  // 4. สร้างเงื่อนไขการเรียงลำดับ (Order By Clause)
  let orderBy: Prisma.MissionOrderByWithRelationInput = {};
  switch (sort) {
    case "expiresSoon":
      orderBy = { webExpiresAt: "asc" }; // เรียงจากน้อยไปมาก (ใกล้หมดอายุก่อน)
      where.webExpiresAt = { gt: now }; // การเรียงแบบนี้ควรใช้กับภารกิจที่ยังไม่หมดอายุเท่านั้น
      break;
    case "rewardHigh":
      orderBy = { rewardAmount: "desc" }; // เรียงจากมากไปน้อย
      break;
    case "latest":
    default:
      orderBy = { createdAt: "desc" }; // เรียงจากมากไปน้อย (สร้างล่าสุดก่อน)
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
    prisma.mission.count({
      where: { webExpiresAt: { gt: now, lte: sevenDaysFromNow } },
    }), // นับที่ใกล้หมดอายุใน 7 วัน
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
    page: parseInt(page as string, 10),
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
 * (Admin) ดึงข้อมูลภารกิจเชิงลึก (Mission Details)
 * @description ใช้ `prisma.$transaction` เพื่อดึงข้อมูล 4 ส่วนพร้อมกันอย่างมีประสิทธิภาพ:
 * 1. ข้อมูลหลักของภารกิจ
 * 2. สถิติสรุป (จำนวนผู้เข้าร่วมทั้งหมด, แยกตามสถานะ) โดยใช้ `groupBy`
 * 3. รายชื่อผู้เข้าร่วมแบบแบ่งหน้า (Paginated)
 * @async
 * @param {string} missionId - ID ของภารกิจที่ต้องการดูรายละเอียด
 * @param {object} [options={}] - ตัวเลือกสำหรับ Query (ใช้สำหรับ Pagination ของรายชื่อผู้เข้าร่วม)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลเชิงลึกทั้งหมดของภารกิจ
 * @throws {ApiError} หากไม่พบภารกิจ
 */
const getDetailsMission = async (missionId: string, options: any = {}) => {
  // 1. Pagination Setup
  const { page = 1, pageSize = 10 } = options;
  const take = parseInt(String(pageSize), 10);
  const skip = (parseInt(String(page), 10) - 1) * take;

  // 2. Use Promise.all for parallel READ operations
  // This is preferred over $transaction for MongoDB reads (no Replica Set needed)
  const [mission, participantsData, totalParticipants, statusStats] = await Promise.all([
    // Query 1: Mission Data
    prisma.mission.findUnique({
      where: { id: missionId },
    }),

    // Query 2: Participants list (Paginated)
    prisma.userMission.findMany({
      where: { missionId: missionId },
      include: {
        user: {
          select: {
            id: true,
            line_display_name: true,
            line_profile_url: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
      take,
      skip,
    }),

    // Query 3: Total count
    prisma.userMission.count({
      where: { missionId: missionId },
    }),

    // Query 4: GroupBy Status Statistics
    prisma.userMission.groupBy({
      by: ["status"],
      where: { missionId: missionId },
      _count: {
        status: true, // Count occurrences of each status
      },
    }),
  ]);

  // 3. Validation
  if (!mission) {
    throw new ApiError(httpStatus.NOT_FOUND, "Mission not found.");
  }

  // 4. Formatting Statistics
  // Define the shape explicitly to match your Enum UserMissionStatus
  const statsTemplate: Record<UserMissionStatus, number> = {
    [UserMissionStatus.ENROLLED]: 0,
    [UserMissionStatus.AWAITING_CLAIM]: 0,
    [UserMissionStatus.CLAIMED]: 0,
    [UserMissionStatus.EXPIRED]: 0,
    [UserMissionStatus.CLAIM_EXPIRED]: 0,
  };

  const statistics = {
    totalEnrolled: totalParticipants,
    byStatus: { ...statsTemplate },
  };

  // Map the groupBy results to the statistics object
  statusStats.forEach((stat) => {
    // Ensure the status exists in our template (Safety check)
    if (stat.status in statistics.byStatus) {
      statistics.byStatus[stat.status] = stat._count.status;
    }
  });

  // 5. Pagination Metadata
  const participantsPaging = {
    page: parseInt(String(page), 10),
    pageSize: take,
    total: totalParticipants,
    totalPages: Math.ceil(totalParticipants / take),
  };

  // 6. Return
  return {
    mission,
    statistics,
    participants: {
      data: participantsData,
      paging: participantsPaging,
    },
  };
};

/**
 * ดึงข้อมูลภารกิจที่ผู้ใช้ "สามารถเข้าร่วมได้"
 * @description ตรวจสอบเงื่อนไข 3 ชั้นเพื่อกรองภารกิจ:
 * 1. ภารกิจยังไม่หมดเขต
 * 2. ผู้ใช้ยังไม่เคยเข้าร่วมภารกิจนี้มาก่อน
 * 3. ผู้ใช้ไม่มีภารกิจประเภท (type) เดียวกันที่กำลังดำเนินอยู่ (ENROLLED หรือ AWAITING_CLAIM)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของภารกิจที่ผู้ใช้สามารถเข้าร่วมได้
 */
const getAvailableMissions = async (userId: string) => {
  const now = new Date();

  // 1) ภารกิจทั้งหมดที่ user เคยรับ (กันรับซ้ำ mission เดิม)
  // FIX: userId is a String (ObjectId), do not use parseInt()
  const previousUserMissions = await prisma.userMission.findMany({
    where: { userId: userId },
    select: { missionId: true },
  });

  // Extract IDs and filter out nulls (ensure TypeScript knows these are strings)
  const enrolledMissionIds = previousUserMissions.map((um) => um.missionId).filter((id): id is string => id !== null);

  // 2) ประเภท (type) ที่ user "กำลังมีภารกิจอยู่" (กันรับภารกิจคนละอันแต่ type เดียวกัน)
  // FIX: userId is a String
  const activeUserMissions = await prisma.userMission.findMany({
    where: {
      userId: userId,
      status: {
        in: [UserMissionStatus.ENROLLED, UserMissionStatus.AWAITING_CLAIM],
      },
    },
    include: {
      mission: { select: { type: true } },
    },
  });

  // Create a Set of unique active types
  const blockedTypes = Array.from(
    new Set(activeUserMissions.map((um) => um.mission?.type).filter((type): type is MissionType => !!type)),
  );

  // 3) หา mission ที่ยังสมัครได้
  const availableMissions = await prisma.mission.findMany({
    where: {
      AND: [
        // A. ยังไม่หมดเขต (webExpiresAt เป็น null หรือ ยังไม่ถึงเวลาหมดอายุ)
        {
          OR: [{ webExpiresAt: null }, { webExpiresAt: { gte: now } }],
        },

        // B. ยังไม่เคยรับ mission นี้มาก่อน (Check ID)
        {
          id: { notIn: enrolledMissionIds },
        },

        // C. ไม่มีภารกิจ type เดียวกันค้างอยู่ (Check Type)
        // Prisma handles empty arrays in `notIn` gracefully, but strictly:
        // if blockedTypes is empty, `notIn: []` does nothing (correct behavior).
        {
          type: { notIn: blockedTypes },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return availableMissions;
};

/**
 * ลบภารกิจออกจากระบบ (สำหรับ Admin)
 * @async
 * @param {string} missionId - ID ของภารกิจที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของภารกิจที่ถูกลบไป
 * @throws {ApiError} หากไม่ได้ระบุ `missionId`
 */
const deleteMission = async (missionId: string) => {
  if (!missionId) throw new ApiError(httpStatus.BAD_REQUEST, "Mission ID is required");
  return await prisma.mission.delete({
    where: { id: missionId },
  });
};

/**
 * แก้ไขรายละเอียดของภารกิจที่มีอยู่ (สำหรับ Admin) - (เวอร์ชันรับ Payload เต็ม)
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต ซึ่งต้องมี `id` ของภารกิจอยู่ด้วย
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ภารกิจที่อัปเดตแล้ว
 * @throws {ApiError} หากไม่ได้ระบุ `id` หรือ `title` ใน payload
 */
const editMission = async (payload: any) => {
  if (!payload.id || !payload.title) throw new ApiError(httpStatus.BAD_REQUEST, "ID and Title are required");
  const { id, title, description, type, rewardAmount, webExpiresAt, durationDays, completeProgress } = payload;
  return await prisma.mission.update({
    where: { id },
    data: {
      title,
      description,
      type,
      rewardAmount,
      webExpiresAt,
      durationDays,
      completeProgress,
    },
  });
};

export default {
  createMission,
  updateMission,
  getAllMissionsForAdmin,
  getAvailableMissions,
  getDetailsMission,
  deleteMission,
  editMission,
};
