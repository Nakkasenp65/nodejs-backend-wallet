/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ทั้งหมดที่เกี่ยวข้องกับผู้ใช้ (User)
 * @description ไฟล์นี้เป็นศูนย์กลางการจัดการข้อมูลผู้ใช้, การลงทะเบียน, การตรวจสอบสถานะ,
 * การค้นหา, และการดำเนินการที่ซับซ้อน เช่น การลบผู้ใช้แบบ Atomic Operation
 * และการจัดการเกี่ยวกับระบบผู้แนะนำ (Referral)
 * @module services/user
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import { MissionType, TransactionStatus } from "../../../generated/prisma/index.js";
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";
import axios from "axios";
import crypto from "crypto";
import { NotificationType } from "../../../generated/prisma/index.js";
import notificationService from "../notifications/notification.service.js";
import transactionService from "../transactions/transaction.service.js";
import prisma from "../../../libs/prisma.js";
import { generateUniqueReferralCode, generateUniqueWalletId } from "../../../utils/random.js";
import { Prisma } from "@prisma/client";
import lineService from "../lines/line.service.js";

/**
 * ตรวจสอบสถานะของผู้ใช้จาก line_user_id เพื่อระบุว่าเป็นผู้ใช้ใหม่หรือไม่ และสถานะการล็อก
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการตรวจสอบ
 * @returns {Promise<({isNewUser: true, isLocked: undefined}|{isNewUser: false, isLocked: boolean})>} Promise ที่ resolve เป็นอ็อบเจกต์
 * - `{ isNewUser: true }` หากไม่พบผู้ใช้
 * - `{ isNewUser: false, isLocked: boolean }` หากพบผู้ใช้
 * @throws {ApiError} หากไม่ได้ระบุ `line_user_id` หรือเกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล
 */
const checkUserStatus = async (line_user_id) => {
  if (!line_user_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Line userId is required");
  }
  try {
    const user = await prisma.user.findUnique({
      where: { line_user_id: line_user_id },
      select: {
        isLocked: true,
      },
    });

    if (user === null) {
      // สถานการณ์ B: ไม่พบผู้ใช้ (User Not Found)
      return { isNewUser: true };
    }

    // สถานการณ์ A: พบผู้ใช้ (User Found)
    return { isNewUser: false, isLocked: user.isLocked };
  } catch (error) {
    console.error(`[CRITICAL_DB_ERROR] Failed to check user status for line_user_id: ${line_user_id}`, error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Could not verify user status due to a database error.");
  }
};

/**
 * ดึงข้อมูลผู้ใช้ตาม `line_user_id` พร้อมข้อมูลที่จำเป็นสำหรับหน้าโปรไฟล์
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<object|null>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้พร้อมข้อมูล Wallet หรือ `null` หากไม่พบ
 */
const getUser = async (line_user_id) => {
  return await prisma.user.findUnique({
    where: { line_user_id },
    select: {
      // scalar ที่ต้องใช้เท่านั้น
      id: true,
      line_user_id: true,
      line_display_name: true,
      fullname: true,
      occupation: true,
      phone: true,
      ageRange: true,
      line_profile_url: true,
      referralCode: true,
      monthlyPayment: true,
      isLocked: true,
      createdAt: true,
      role: true,
      wallet: {
        select: {
          id: true,
          walletUniqueId: true,
        },
      },
    },
  });
};

/**
 * ดึงรายการผู้ใช้ทั้งหมดพร้อมระบบแบ่งหน้า (Pagination) และการกรองข้อมูล
 * @async
 * @param {object} [options={}] - อ็อบเจกต์สำหรับกำหนดเงื่อนไขการค้นหา
 * @param {number|string} [options.page=1] - เลขหน้าปัจจุบัน
 * @param {number|string} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.search] - คำค้นหาสำหรับชื่อที่แสดงใน LINE หรือชื่อเต็ม
 * @param {string} [options.role] - กรองตามบทบาทของผู้ใช้ (Role)
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลผู้ใช้และข้อมูลการแบ่งหน้า
 */
const getUsers = async (options = {}) => {
  const { page = 1, pageSize = 10, search, role } = options;

  const ps = Math.min(Number(pageSize) || 10, 100); // ป้องกันการดึงข้อมูลเยอะเกินไป
  const p = Math.max(Number(page) || 1, 1);
  const skip = (p - 1) * ps;

  // 3. สร้างเงื่อนไขการค้นหา (whereClause) แบบ Dynamic
  // ทำให้เราสามารถเพิ่มเงื่อนไขการค้นหาและการกรองได้ง่าย
  const whereClause = {};
  if (search) {
    // ค้นหาแบบ case-insensitive ในหลายฟิลด์
    whereClause.OR = [
      { line_display_name: { contains: search, mode: "insensitive" } },
      { fullname: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) {
    whereClause.role = role;
  }

  // 4. ใช้ prisma.$transaction เพื่อรัน 2 query พร้อมกัน (ดึงข้อมูล + นับจำนวนทั้งหมด)
  // ซึ่งเร็วกว่าการรันทีละ query
  const [data, total] = await prisma.$transaction([
    // Query ที่ 1: ดึงข้อมูลผู้ใช้ตามเงื่อนไข
    prisma.user.findMany({
      where: whereClause,
      // ---- นี่คือส่วนที่สำคัญที่สุดเพื่อประสิทธิภาพ ----
      // เราใช้ `select` เพื่อเลือกเฉพาะข้อมูลที่ต้องใช้ใน "ตาราง" เท่านั้น
      include: {
        wallet: true,
        goal: {
          include: {
            plan: true,
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: ps,
    }),
    // Query ที่ 2: นับจำนวนผู้ใช้ทั้งหมดที่ตรงตามเงื่อนไข (สำหรับคำนวณ Pagination)
    prisma.user.count({
      where: whereClause,
    }),
  ]);

  // 5. คืนค่าข้อมูลพร้อม object สำหรับ Pagination
  return {
    data,
    paging: {
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
      hasNextPage: skip + data.length < total,
      hasPrevPage: p > 1,
    },
  };
};

/**
 * ค้นหาผู้รับ (Recipient) โดยใช้เบอร์โทรศัพท์หรือรหัส Wallet
 * @async
 * @param {object} criteria - อ็อบเจกต์เงื่อนไขการค้นหา
 * @param {'phone'|'walletId'} criteria.type - ประเภทการค้นหา
 * @param {string} criteria.value - ค่าที่ใช้ค้นหา
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลผู้ใช้ที่ค้นพบ
 * @throws {ApiError} หากข้อมูลนำเข้าไม่ถูกต้อง, ประเภทการค้นหาไม่รองรับ, หรือไม่พบผู้ใช้
 */
const findRecipient = async ({ type, value }) => {
  // --- STAGE 1: การตรวจสอบความสมบูรณ์ของโครงสร้าง (Structural Integrity Check) ---
  if (!type || !value) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Search type and value are required.");
  }

  // --- STAGE 2: การสร้างเงื่อนไขการ Query (Dynamic Where Clause Construction) ---
  let whereClause = {};

  switch (type) {
    case "phone":
      whereClause = { phone: value };
      break;
    case "walletId":
      whereClause = { wallet: { walletUniqueId: value } };
      break;
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid search type: ${type}`);
  }

  // --- STAGE 3: การปฏิบัติการ (The Operation) ---
  const user = await prisma.user.findFirst({
    where: whereClause,
    select: {
      id: true,
      line_display_name: true,
      line_profile_url: true,
      phone: true,
      wallet: {
        select: { walletUniqueId: true },
      },
    },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "ไม่พบผู้ใช้ที่ตรงกับข้อมูลที่คุณระบุ");
  }

  return user;
};

/**
 * ดึงสถานะ firstTime ของผู้ใช้จาก ID ภายในของระบบ
 * @async
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูล
 * @returns {Promise<{firstTime: boolean}>} Promise ที่ resolve เป็นอ็อบเจกต์สถานะ firstTime
 * @throws {ApiError} หากไม่พบผู้ใช้
 */
const getUserFirstTimeById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstTime: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "ไม่พบผู้ใช้ที่มี id นี้");
  }
  return user;
};

/**
 * สร้างผู้ใช้ใหม่พร้อมตั้งค่าเริ่มต้นที่จำเป็นทั้งหมดภายใน Atomic Transaction เดียว
 * @description กระบวนการนี้จะสร้าง User, Wallet, Goal, UserMissions, Welcome Bonus Transaction,
 * Notifications, และ Referral record (ถ้ามี) พร้อมกันทั้งหมด
 * @async
 * @param {object} userData - อ็อบเจกต์ข้อมูลสำหรับการลงทะเบียนผู้ใช้ใหม่
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่สร้างขึ้นใหม่พร้อมข้อมูลที่เกี่ยวข้องทั้งหมด
 * @throws {ApiError} หากมีผู้ใช้ที่มี `line_user_id` นี้อยู่แล้วในระบบ (CONFLICT)
 */
const createUserWithGoal = async (userData) => {
  const {
    mobileId,
    planId,
    line_user_id,
    line_display_name,
    line_profile_url,
    email, // <-- เพิ่ม email เข้ามา
    occupation,
    ageRange,
    monthlyPayment,
    fullname,
    chat_url,
    phone,
    pin,
    referToCode,
  } = userData;

  const floatMonthlyPayment = parseFloat(monthlyPayment);

  // --- STAGE 1: การตรวจสอบเงื่อนไขเบื้องต้น (Pre-condition Validation) ---
  // ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่ ก่อนที่จะเริ่มกระบวนการที่ซับซ้อน
  const existingUser = await prisma.user.findUnique({
    where: { line_user_id: line_user_id },
    select: { id: true },
  });
  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, "มีผู้ใช้งานนี้ในระบบแล้ว");
  }

  // --- STAGE 2: การเตรียมข้อมูลภายนอก (External Data Preparation) ---
  // ทำงานที่ไม่ขึ้นกับ Transaction ให้เสร็จสิ้นก่อน
  const referralCode = await generateUniqueReferralCode(prisma);
  const walletUniqueId = await generateUniqueWalletId(prisma);

  const onboardingMissions = await prisma.mission.findMany({
    where: {
      type: MissionType.ONBOARDING,
      webExpiresAt: { gte: new Date() },
    },
  });

  let referrerId = null;
  if (referToCode) {
    const referredUser = await prisma.user.findUnique({
      where: { referralCode: referToCode },
      select: { id: true },
    });
    if (referredUser) {
      referrerId = referredUser.id;
    } else {
      console.warn(`[Onboarding] Invalid referral code used: ${referToCode}`);
    }
  }

  // --- STAGE 3: ปฏิบัติการก่อกำเนิดเชิงปรมาณู (The Genesis Atomic Operation) ---
  // ทุกการ "เขียน" ข้อมูลลงฐานข้อมูลจะเกิดขึ้นภายใน "ห้องนิรภัย" นี้เท่านั้น
  const createdUser = await prisma.$transaction(async (tx) => {
    // 1. สร้าง User, Wallet, และ Goal พร้อมกัน
    const newUser = await tx.user.create({
      data: {
        line_user_id,
        line_display_name,
        line_profile_url,
        email,
        occupation,
        ageRange,
        monthlyPayment: floatMonthlyPayment,
        referralCode,
        fullname,
        chat_url,
        pin,
        phone,
        referToCode: referToCode || null, // ตรวจสอบให้แน่ใจว่าเป็น null ถ้าไม่มี
        wallet: {
          create: {
            walletUniqueId: walletUniqueId,
            balance: 0,
            bonusBalance: 100,
          },
        },
        goal: {
          create: {
            plan: { connect: { id: planId } },
            product: { connect: { id: mobileId } },
          },
        },
      },
      select: { id: true, wallet: { select: { id: true } } },
    });

    // 2. สร้าง UserMissions (ถ้ามี)
    if (onboardingMissions.length > 0) {
      const userMissionsData = onboardingMissions.map((mission) => ({
        userId: newUser.id,
        missionId: mission.id,
        status: "ENROLLED",
        userExpiresAt: new Date(Date.now() + (mission.durationDays || 30) * 24 * 60 * 60 * 1000),
        completeProgress: mission.completeProgress,
      }));
      await tx.userMission.createMany({ data: userMissionsData });
    }

    // 3. สร้าง Transaction โบนัสต้อนรับ
    const welcomeTransaction = await tx.transaction.create({
      data: {
        name: "💰 รับโบนัสฟรี 100 บาท!",
        type: "REWARD",
        status: "SUCCESS",
        amount: 100,
        toWalletId: newUser.wallet.id,
        externalSource: "SYSTEM_WELCOME_BONUS",
        description: "โบนัสต้อนรับสำหรับสมาชิกใหม่",
        verified: true,
        verifiedAmount: 100,
      },
    });

    // 4. สร้าง Notifications ต้อนรับ
    await tx.notification.createMany({
      data: [
        {
          userId: newUser.id,
          type: NotificationType.REWARD,
          title: "💰 รับโบนัสฟรี 100 บาท!",
          body: "ยินดีต้อนรับ! เรามอบโบนัส 100 บาทเข้าบัญชีของคุณทันที",
          transactionId: welcomeTransaction.id,
        },
        {
          userId: newUser.id,
          type: NotificationType.SYSTEM,
          title: "💵 พิเศษ! ออมครั้งแรก รับโบนัส 2 เท่า",
          body: "เริ่มต้นการออมของคุณอย่างคุ้มค่า! เพียงออมเงินครั้งแรก รับโบนัสเพิ่มสูงสุด 100 บาท",
        },
      ],
    });

    // 5. สร้าง Referral Record (ถ้ามี)
    if (referrerId) {
      await tx.referral.create({
        data: {
          newcomerId: newUser.id,
          referrerId: referrerId,
        },
      });
    }

    // 6. [FINAL STEP] ดึงข้อมูลทั้งหมดที่จำเป็นกลับไปในครั้งเดียว
    // นี่คือปฏิบัติการ "อ่าน" ครั้งสุดท้ายภายใน Transaction
    return tx.user.findUnique({
      where: { id: newUser.id },
      include: {
        goal: { include: { product: true, plan: true } },
        wallet: true,
        notifications: { orderBy: { createdAt: "desc" }, take: 5 }, // เอามาแค่บางส่วนเพื่อประสิทธิภาพ
        userMissions: true,
      },
    });
  });

  await lineService.sendRegisterFlexMessage(createdUser.line_user_id);

  return createdUser;
};

/**
 * อัปเดตข้อมูลโปรไฟล์ของผู้ใช้โดยใช้ `line_user_id`
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ที่ต้องการอัปเดต
 * @param {object} updateData - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต (fullname, phone, etc.)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้วพร้อมข้อมูลที่เกี่ยวข้องทั้งหมด
 * @throws {ApiError} หากไม่ได้ระบุ `line_user_id`, ไม่พบผู้ใช้, หรือเกิดข้อผิดพลาดจากฐานข้อมูล
 */
const updateUser = async (line_user_id, updateData) => {
  // 1. ตรวจสอบว่ามี User ID ส่งเข้ามาหรือไม่
  if (!line_user_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, "จำเป็นต้องระบุ User ID");
  }

  // 2. เตรียมข้อมูลที่จะอัปเดต
  //    เราสามารถเพิ่ม Logic การ clean up ข้อมูลได้ที่นี่ เช่น trim() ช่องว่าง
  const dataToUpdate = {
    fullname: updateData.fullname,
    phone: updateData.phone,
    occupation: updateData.occupation,
    ageRange: updateData.ageRange,
  };

  try {
    // 3. ใช้ prisma.user.update เพื่อค้นหาและอัปเดตข้อมูลในขั้นตอนเดียว
    const updatedUser = await prisma.user.update({
      where: {
        line_user_id: line_user_id, // ค้นหาผู้ใช้ด้วย ID หลัก
      },
      data: dataToUpdate,
      // (สำคัญ) include ข้อมูลทั้งหมดที่ Frontend ต้องการกลับไป เพื่อให้ React Query cache อัปเดตถูกต้อง
      include: {
        goal: {
          include: {
            product: true,
            plan: true,
          },
        },
        wallet: true,
        userMissions: {
          include: {
            mission: true,
          },
        },
        notifications: true,
      },
    });

    return updatedUser;
  } catch (error) {
    // 4. จัดการกับ Error ที่อาจเกิดขึ้นจาก Prisma
    // P2025 คือ error code เมื่อไม่พบ record ที่ต้องการจะอัปเดต
    if (error.code === "P2025") {
      throw new ApiError(httpStatus.NOT_FOUND, `ไม่พบผู้ใช้ที่มี ID: ${userId}`);
    }
    // โยน Error อื่นๆ ต่อไป
    console.error("Error updating user:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้");
  }
};

/**
 * อัปเดตข้อมูลผู้ใช้โดย Admin (ใช้ ID ภายในระบบ)
 * @description ฟังก์ชันนี้อนุญาตให้ Admin แก้ไขฟิลด์ที่จำกัด เช่น role
 * @async
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูล
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต (fullname, phone, role, etc.)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้ว
 */
const updateUserByAdmin = async (userId, payload) => {
  // เลือกเฉพาะ field ที่อนุญาตให้ Admin แก้ไขได้
  const { fullname, phone, occupation, role } = payload;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { fullname, phone, occupation, role },
  });
  return user;
};

/**
 * ลบผู้ใช้ออกจากระบบอย่างถาวรพร้อมข้อมูลที่เกี่ยวข้องทั้งหมดภายใน Atomic Transaction
 * @description ใช้ Prisma's onDelete: Cascade เพื่อลบข้อมูลที่ผูกกันทั้งหมด เช่น Wallet, Goal, Transactions ฯลฯ
 * @async
 * @param {string} userId - ID ของผู้ใช้ในฐานข้อมูลที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลของผู้ใช้ที่ถูกลบไป (สำหรับใช้ในการบันทึก Log)
 * @throws {ApiError} หากไม่ได้ระบุ `userId` หรือไม่พบผู้ใช้
 */
const deleteUser = async (userId) => {
  // --- STAGE 1: การตรวจสอบความสมบูรณ์ของโครงสร้าง (Structural Integrity Check) ---
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User ID is required.");
  }

  // --- STAGE 2: การปฏิบัติการเชิงปรมาณู (The Atomic Operation) ---
  // เราใช้ $transaction เพื่อความปลอดภัย แม้ว่า onDelete: Cascade จะทำงานในระดับฐานข้อมูล
  // แต่นี่เป็นการรับประกันว่าการตรวจสอบและการลบจะเกิดขึ้นในบริบทเดียวกัน
  // และทำให้ง่ายต่อการเพิ่ม "ปฏิบัติการล้างข้อมูลด้วยมือ" ในอนาคต
  const deletedUser = await prisma.$transaction(async (tx) => {
    // 2.1 การสืบสวนเบื้องต้น (Initial Investigation)
    const userToDelete = await tx.user.findUnique({
      where: { id: userId },
    });

    // Structural Safeguard: หากไม่พบเป้าหมาย, ยุติภารกิจและ Rollback
    if (!userToDelete) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
    }

    // [OPTIONAL BUT RECOMMENDED] ปฏิบัติการล้างข้อมูลด้วยมือ (Manual Cleanup)
    // สำหรับความสัมพันธ์ที่ซับซ้อนหรือไม่ใช่ Cascade
    // ตัวอย่าง: หากคุณต้องการยกเลิกการอ้างอิงถึง User นี้ใน Referral record ของคนอื่น
    // await tx.user.updateMany({
    //   where: { referToCode: userToDelete.referralCode },
    //   data: { referToCode: null }
    // });

    // 2.2 การออกคำสั่งรื้อถอน (The Decommissioning Order)
    // Prisma จะจัดการ onDelete: Cascade ทั้งหมดโดยอัตโนมัติ
    await tx.user.delete({
      where: { id: userId },
    });

    // คืนค่าข้อมูลของผู้ที่ถูกลบ เพื่อการบันทึก Log
    return userToDelete;
  });

  console.log(`[AUDIT] User with ID ${deletedUser.id} and all associated data has been permanently deleted.`);

  return deletedUser;
};

/**
 * ดึงประวัติการแนะนำเพื่อนของผู้ใช้ที่ระบุ
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE ของผู้ที่ต้องการดูประวัติ
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของข้อมูลการแนะนำเพื่อน
 * @throws {ApiError} หากไม่พบผู้ใช้
 */
const getReferralHistory = async (line_user_id) => {
  // 1. ค้นหา User และดึงข้อมูล madeReferrals ที่เกี่ยวข้อง
  const userWithReferrals = await prisma.user.findUnique({
    where: {
      line_user_id: line_user_id,
    },
    select: {
      // 2. เลือกเฉพาะ field madeReferrals
      madeReferrals: {
        // 4. จัดเรียงข้อมูลตามวันที่สร้างล่าสุด
        orderBy: {
          createdAt: "desc",
        },
        // 3. ดึงข้อมูลของ newcomer (ผู้ถูกเชิญ) มาด้วย
        include: {
          newcomer: {
            select: {
              id: true,
              line_user_id: true,
              line_display_name: true,
              line_profile_url: true,
              createdAt: true, // วันที่ newcomer สมัคร
            },
          },
        },
      },
    },
  });

  // กรณีไม่พบ User ID ดังกล่าวในระบบ
  if (!userWithReferrals) {
    throw new ApiError(httpStatus.NOT_FOUND, `User with ID ${line_user_id} not found.`);
  }

  // 5. แปลงข้อมูลให้อยู่ในรูปแบบ DTO ที่ใช้งานง่าย
  const history = userWithReferrals.madeReferrals.map((referral) => ({
    referredUserName: referral.newcomer.line_display_name,
    referredUserImageUrl: referral.newcomer.line_profile_url,
    referredUserId: referral.newcomer.userId,
    referredUserLineId: referral.newcomer.line_user_id,
    referralDate: referral.createdAt, //วันที่ชวน
    rewardGiven: referral.rewardGiven,
    newcomerJoinedDate: referral.newcomer.createdAt, // วันที่เพื่อนสมัครเข้ามา
  }));

  return history;
};

/**
 * สร้างบันทึกการแนะนำ (Referral Record) เพื่อเชื่อมโยงผู้แนะนำและผู้ใช้ใหม่
 * @async
 * @param {string} newcomerId - ID ของผู้ใช้ใหม่ (ผู้ถูกแนะนำ)
 * @param {string} referralCode - โค้ดของผู้แนะนำ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Referral ที่สร้างขึ้นใหม่
 * @throws {Error} หากข้อมูลไม่ครบถ้วน, โค้ดไม่ถูกต้อง, แนะนำตัวเอง, หรือผู้ใช้ใหม่เคยถูกแนะนำแล้ว
 */
const createReferral = async (newcomerId, referralCode) => {
  // 1. ตรวจสอบว่ามี Input ที่จำเป็นครบถ้วน
  if (!newcomerId || !referralCode) {
    throw new Error("Newcomer ID และ Referral Code เป็นสิ่งจำเป็น");
  }

  // 2. ค้นหาผู้ใช้ที่เป็นเจ้าของ referralCode (ผู้แนะนำ)
  const referrer = await prisma.user.findUnique({
    where: {
      referralCode: referralCode,
    },
  });

  // 3. ตรวจสอบความถูกต้อง
  if (!referrer) {
    // ไม่พบโค้ดนี้ในระบบ
    throw new Error(`โค้ดแนะนำ "${referralCode}" ไม่ถูกต้องหรือไม่พบในระบบ`);
  }

  if (referrer.id === newcomerId) {
    // ป้องกันการเชิญตัวเอง
    throw new Error("ผู้ใช้ไม่สามารถแนะนำตัวเองได้");
  }

  // ตรวจสอบว่าผู้ใช้ใหม่คนนี้เคยถูกแนะนำแล้วหรือยัง
  // ใช้ findUnique เพราะ field `newcomerId` ในตาราง Referral เป็น @unique
  const existingReferral = await prisma.referral.findUnique({
    where: {
      newcomerId: newcomerId,
    },
  });

  if (existingReferral) {
    throw new Error(`ผู้ใช้ ID ${newcomerId} ได้ถูกแนะนำไปแล้ว`);
  }

  // 4. ถ้าทุกอย่างถูกต้อง, สร้าง Referral record ใหม่
  console.log(`กำลังสร้าง Referral: ผู้แนะนำ (${referrer.id}) -> ผู้ใช้ใหม่ (${newcomerId})`);

  const newReferral = await prisma.referral.create({
    data: {
      referrerId: referrer.id, // ID ของผู้แนะนำ
      newcomerId: newcomerId, // ID ของผู้ใช้ใหม่
      // rewardGiven จะมีค่า default เป็น false ตาม schema
    },
  });

  // 5. คืนค่า Referral ที่สร้างใหม่
  return newReferral;
};

/**
 * ตั้งค่าหรืออัปเดตโค้ดผู้แนะนำที่ผู้ใช้คนนี้ถูกแนะนำมา (referToCode)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} referCode - โค้ดของผู้แนะนำ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้ว
 */
const setUserReferCode = async (userId, referCode) => {
  const referSet = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      referToCode: referCode,
    },
  });
  return referSet;
};

/**
 * ตั้งสถานะของผู้ใช้เป็นล็อก (isLocked = true)
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ผู้ใช้ที่อัปเดตแล้ว
 */
const setLocked = async (line_user_id) => {
  const locked = await prisma.user.update({
    where: { line_user_id: line_user_id },
    data: {
      isLocked: true,
    },
  });

  return locked;
};

/**
 * ปลดล็อกผู้ใช้โดยการเปรียบเทียบ PIN ที่ส่งมากับ PIN ที่จัดเก็บไว้อย่างปลอดภัย
 * @description ใช้ `crypto.timingSafeEqual` เพื่อป้องกัน Timing Attacks
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @param {string|number} pin - PIN ที่ผู้ใช้ป้อนเข้ามาเพื่อปลดล็อก
 * @returns {Promise<{message: string}>} Promise ที่ resolve เป็นข้อความยืนยันการปลดล็อกสำเร็จ
 * @throws {ApiError} หาก PIN ไม่ถูกต้อง
 */
const unlock = async (line_user_id, pin) => {
  const response = await axios.get(`https://checkuserdb.vercel.app/api/get-pin/${line_user_id}`);
  const serverPin = response.data.pin;

  const userPinBuffer = Buffer.from(String(pin));
  const serverPinBuffer = Buffer.from(String(serverPin));

  if (userPinBuffer.length !== serverPinBuffer.length) {
    // If lengths don't match, they can't be equal.
    // We still run a dummy comparison on the serverPin to prevent leaking length information.
    crypto.timingSafeEqual(serverPinBuffer, serverPinBuffer);
    throw new ApiError(httpStatus.UNAUTHORIZED, "รหัสผ่านไม่ถูกต้องกรุณาลองใหม่");
  }

  const pinsMatch = crypto.timingSafeEqual(userPinBuffer, serverPinBuffer);

  if (pinsMatch) {
    await prisma.user.update({
      where: { line_user_id: line_user_id },
      data: {
        isLocked: false,
      },
    });
    // It's good practice to return something to indicate success
    return { message: "User unlocked successfully." };
  } else {
    throw new ApiError(httpStatus.UNAUTHORIZED, "รหัสผ่านไม่ถูกต้องกรุณาลองใหม่");
  }
};

/**
 * ดึงสถานะการล็อก (isLocked) ของผู้ใช้
 * @description ออกแบบมาให้ทำงานอย่างปลอดภัย โดยจะคืนค่า isLocked: true หากไม่พบผู้ใช้หรือเกิดข้อผิดพลาด
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE
 * @returns {Promise<{isLocked: boolean}>} Promise ที่ resolve เป็นอ็อบเจกต์สถานะการล็อก
 */
const getLockStatus = async (line_user_id) => {
  try {
    const userStatus = await prisma.user.findUnique({
      where: { line_user_id: line_user_id },
      select: { isLocked: true },
    });

    if (userStatus === null) {
      console.warn(`[AUTH] Lock status check: User not found for line_user_id: ${line_user_id}. Defaulting to locked.`);
      return { isLocked: true };
    }

    return userStatus;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`[PRISMA_ERROR] Known Prisma Error on getLockStatus: ${error.code}`, error.message);
    } else {
      // สถานการณ์ C: ฐานข้อมูลล่ม หรือข้อผิดพลาดอื่นๆ (System Failure)
      console.error(`[CRITICAL_DB_ERROR] Failed to get lock status for line_user_id: ${line_user_id}`, error);
    }

    return { isLocked: true };
  }
};

export default {
  checkUserStatus,
  getUsers,
  getUser,
  findRecipient,
  getUserFirstTimeById,
  createUserWithGoal,
  updateUser,
  updateUserByAdmin,
  deleteUser,
  getReferralHistory,
  createReferral,
  setUserReferCode,
  setLocked,
  unlock,
  getLockStatus,
};
