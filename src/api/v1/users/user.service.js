// src/services/user.service.ts

import { MissionType, TransactionStatus } from '../../../generated/prisma/index.js';
import ApiError from '../../../utils/ApiError.js';
import httpStatus from 'http-status';
import axios from 'axios';
import crypto from 'crypto';
import notificationService from '../notifications/notification.service.js';
import transactionService from '../transactions/transaction.service.js';
import prisma from '../../../libs/prisma.js';
import { generateUniqueReferralCode, generateUniqueWalletId } from '../../../utils/random.js';
import { Prisma } from '@prisma/client';

/**
 * ตรวจสอบว่าผู้ใช้มีข้อมูลอยู่ในระบบแล้วหรือไม่จาก Line User ID เพื่อระบุว่าเป็นผู้ใช้ใหม่หรือผู้ใช้ปัจจุบัน
 * เป็นการตรวจสอบแบบ lightweight ที่ไม่ดึงข้อมูลผู้ใช้ทั้งหมดกลับมา
 * @param {string} userId - Line User ID ของผู้ใช้ที่ต้องการตรวจสอบ
 * @returns {Promise<{isNewUser: boolean}>} Promise ที่จะ resolve เป็น object ที่ระบุสถานะของผู้ใช้ เช่น { isNewUser: true }
 * @throws {ApiError} โยน ApiError หากไม่มีการส่ง `userId` (Line User ID) เข้ามา
 */
const checkUserStatus = async (line_user_id) => {
  if (!line_user_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Line userId is required');
  }
  try {
    const user = await prisma.user.findUnique({
      where: { line_user_id: line_user_id },
      select: {
        id: true,
      },
    });

    if (user === null) {
      // สถานการณ์ B: ไม่พบผู้ใช้ (User Not Found)
      return { isNewUser: true, userId: null };
    }

    // สถานการณ์ A: พบผู้ใช้ (User Found)
    return { isNewUser: false, userId: user.id };
  } catch (error) {
    console.error(`[CRITICAL_DB_ERROR] Failed to check user status for line_user_id: ${line_user_id}`, error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not verify user status due to a database error.');
  }
};

/**
 * ดึงข้อมูลผู้ใช้หนึ่งคนพร้อมกับข้อมูลที่เกี่ยวข้องทั้งหมด ได้แก่ wallet, goal (พร้อมรายละเอียด product และ plan),
 * notifications (พร้อมรายละเอียด transaction), และ userMissions โดยใช้ Line User ID
 * โดยทั่วไปจะใช้ฟังก์ชันนี้เพื่อดึงข้อมูลที่จำเป็นทั้งหมดสำหรับหน้าหลักของแอปพลิเคชันหลังจากผู้ใช้ล็อกอินสำเร็จ
 * @param {string} userId - Line User ID ของผู้ใช้
 * @returns {Promise<object|null>} Promise ที่จะ resolve เป็น object ของผู้ใช้พร้อมข้อมูล relations ทั้งหมดหากพบข้อมูล, หรือ resolve เป็น `null` หากไม่พบ
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
        },
      },
    },
  });
};

/**
 * ดึงข้อมูลผู้ใช้ทั้งหมดพร้อมข้อมูลสรุปของ Wallet และ Goal สำหรับหน้า Admin
 * - ใช้ 'select' เพื่อเลือกเฉพาะฟิลด์ที่จำเป็น ทำให้ได้ประสิทธิภาพสูงสุดและลดขนาดข้อมูล
 * - รองรับ Pagination, การค้นหา (Search), และการกรองตาม Role
 *
 * @param {object} options - ตัวเลือกสำหรับ Query
 * @param {number} [options.page=1] - หน้าปัจจุบัน
 * @param {number} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.search] - คำค้นหาสำหรับชื่อผู้ใช้
 * @param {string} [options.role] - กรองตามบทบาท (USER, ADMIN)
 * @returns {Promise<object>} - Object ที่มีข้อมูลผู้ใช้ (data) และข้อมูลการแบ่งหน้า (paging)
 */
const getUsers = async (options = {}) => {
  // 1. ดึงค่า options พร้อมกำหนดค่าเริ่มต้น
  const { page = 1, pageSize = 10, search, role } = options;

  // 2. เตรียมค่าสำหรับ Pagination
  const ps = Math.min(Number(pageSize) || 10, 100); // ป้องกันการดึงข้อมูลเยอะเกินไป
  const p = Math.max(Number(page) || 1, 1);
  const skip = (p - 1) * ps;

  // 3. สร้างเงื่อนไขการค้นหา (whereClause) แบบ Dynamic
  // ทำให้เราสามารถเพิ่มเงื่อนไขการค้นหาและการกรองได้ง่าย
  const whereClause = {};
  if (search) {
    // ค้นหาแบบ case-insensitive ในหลายฟิลด์
    whereClause.OR = [{ line_display_name: { contains: search, mode: 'insensitive' } }, { fullname: { contains: search, mode: 'insensitive' } }];
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
      select: {
        id: true,
        line_user_id: true,
        line_display_name: true,
        fullname: true,
        line_profile_url: true,
        role: true,
        createdAt: true,
        // ดึงข้อมูล Wallet ที่เกี่ยวข้อง (เฉพาะฟิลด์ที่ต้องการ)
        wallet: {
          select: {
            id: true,
            balance: true,
          },
        },
        // ดึงข้อมูล Goal ที่เกี่ยวข้อง (เฉพาะฟิลด์ที่ต้องการ)
        goal: {
          select: {
            status: true,
            // ดึงข้อมูล Plan ที่ซ้อนอยู่ข้างในอีกที
            plan: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
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
 * ค้นหาผู้ใช้ด้วยเบอร์โทรศัพท์สำหรับฟีเจอร์การโอนเงิน
 * ฟังก์ชันนี้จะคืนค่าเฉพาะข้อมูลที่จำเป็นและปลอดภัยสำหรับแสดงผล (Public-facing data) เท่านั้น
 * @param {string} phoneNumber - เบอร์โทรศัพท์ที่ต้องการค้นหา
 * @param {string} currentUserId - ID ของผู้ใช้ที่กำลังทำการค้นหา (เพื่อป้องกันการค้นหาตัวเอง)
 * @returns {Promise<object>} - Object ของผู้ใช้ที่พบ (ประกอบด้วย id, line_display_name, line_profile_url, phone)
 * @throws {ApiError} - หากไม่พบผู้ใช้, พยายามค้นหาตัวเอง, หรือข้อมูลนำเข้าไม่ถูกต้อง
 */
const findUserByPhone = async (phoneNumber) => {
  // --- 1. Input Validation ---
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง');
  }

  // --- 2. Database Query ---
  // We use `findFirst` because `phone` is not a unique field.
  const user = await prisma.user.findFirst({
    where: {
      phone: phoneNumber.trim(), // Use .trim() to remove accidental whitespace
    },
    select: {
      id: true,
      line_display_name: true,
      line_profile_url: true,
      phone: true,
    },
  });

  // --- 3. Post-Query Validation ---
  // Case 1: User not found
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบผู้ใช้สำหรับเบอร์โทรศัพท์นี้');
  }

  // --- 4. Return successful result ---
  return user;
};

const getUserFirstTimeById = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { firstTime: true } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบผู้ใช้ที่มี id นี้');
  }
  return user;
};

/**
 * สร้างหรืออัปเดตผู้ใช้, สร้าง Goal และ Wallet หากยังไม่มี
 * @param {object} userData - ข้อมูลของผู้ใช้ใหม่
 * @returns {Promise<object>} - Object ของ User พร้อม relations
 */
const createUserWithGoal = async (userData) => {
  const { mobileId, planId, line_user_id, line_display_name, line_profile_url, occupation, ageRange, monthlyPayment, fullname, chat_url, phone, pin, referToCode } = userData;

  const floatMonthlyPayment = parseFloat(monthlyPayment);

  const existingUser = await prisma.user.findUnique({
    where: { line_user_id: line_user_id },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'User is already exists');
  }

  // สร้าง Referral Code ที่ไม่ซ้ำกัน
  const referralCode = await generateUniqueReferralCode(prisma);
  const walletId = await generateUniqueWalletId(prisma);

  // สร้าง User, Wallet, และ Goal ใหม่ทั้งหมด
  const newUser = await prisma.user.create({
    data: {
      line_user_id: line_user_id,
      line_display_name: line_display_name,
      line_profile_url: line_profile_url,
      occupation: occupation,
      ageRange: ageRange,
      monthlyPayment: floatMonthlyPayment,
      referralCode: referralCode,
      fullname: fullname,
      chat_url: chat_url,
      pin: pin,
      phone: phone,
      referToCode: referToCode,
      wallet: {
        create: {
          walletUniqueId: walletId,
          balance: 0,
          bonusBalance: 100,
          // โปรโมชั่น เติมเงินได้ 2 เท่า
        },
      },
      goal: {
        create: {
          plan: { connect: { id: planId } },
          product: { connect: { id: mobileId } },
        },
      },
    },
    select: {
      id: true,
      wallet: true,
    },
  });

  // จัดการภารกิจ Onboarding สำหรับ User ใหม่
  const onboardingMissions = await prisma.mission.findMany({
    where: {
      type: MissionType.ONBOARDING,
      webExpiresAt: { gte: new Date() },
    },
  });

  if (onboardingMissions.length > 0) {
    console.log(`Found ${onboardingMissions.length} onboarding missions.`);

    // Map missions ที่เจอเพื่อเตรียมสร้าง UserMission
    const userMissionsData = onboardingMissions.map((mission) => ({
      userId: newUser.id,
      missionId: mission.id,
      status: 'ENROLLED',
      userExpiresAt: new Date(Date.now() + mission.durationDays * 24 * 60 * 60 * 1000),
      completeProgress: mission.completeProgress,
    }));

    // สร้าง UserMission ทั้งหมดในครั้งเดียว
    await prisma.userMission.createMany({
      data: userMissionsData,
    });
    console.log(`Created ${userMissionsData.length} user missions.`);
  }

  // สร้าง Transaction สำเร็จเพื่อให้ขึ้น 100 บาทในประวัติสำหรับ User ใหม่
  const welcomeTransaction = await transactionService.createSuccessedTransaction(
    '💰รับโบนัสฟรี 100 บาท!',
    100,
    TransactionStatus.SUCCESS,
    'One Wallet',
    line_display_name,
    'ยินดีต้อนรับสู่ One Wallet! เราขอมอบเงินโบนัสพิเศษ 100 บาทเข้าสู่บัญชีของคุณทันที!\n\nคุณสามารถใช้โบนัสนี้เป็นส่วนหนึ่งของการออมเพื่อพิชิตเป้าหมายการดาวน์สินค้าที่คุณต้องการได้เลย\n\n**คำเตือน:** \nเงินโบนัสนี้สามารถนำมาแลกสินค้าเพื่อเริ่มการดาวน์ได้ ไม่สามารถถอนเป็นเงินสดได้',
    newUser.wallet.id,
  );

  // แจ้งเตือนรับเงินโบนัส User ใหม่
  await notificationService.createWelcomeNotifications(newUser.id, welcomeTransaction.id);

  const createdUser = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: {
      goal: {
        include: {
          product: true,
          plan: true,
        },
      },
      wallet: true,
      notifications: true,
    },
  });

  if (referToCode) {
    const referredUser = await prisma.user.findUnique({
      where: { referralCode: referToCode },
      select: { id: true },
    });

    // 2. IMPORTANT: Check if the referrer was actually found before using it
    if (referredUser) {
      await prisma.referral.create({
        data: {
          newcomer: {
            connect: { id: newUser.id },
          },
          referrer: {
            connect: {
              id: referredUser.id,
            },
          },
        },
      });
    } else {
      // Optional: Log that an invalid referral code was used
      console.warn(`Invalid referral code used during signup: ${referToCode}`);
    }
  }

  return createdUser;
};

/**
 * อัปเดตข้อมูลส่วนตัวของผู้ใช้โดยใช้ ID ของผู้ใช้ (ไม่ใช่ Line User ID)
 * ฟังก์ชันนี้ออกแบบมาเพื่อรับข้อมูลที่สามารถแก้ไขได้จากฟอร์ม 'แก้ไขโปรไฟล์'
 * @param {string} userId - ID หลักของผู้ใช้ในฐานข้อมูล (Primary Key, ObjectId)
 * @param {object} updateData - Object ที่มีข้อมูลที่ต้องการอัปเดต เช่น { fullname, phone, occupation, ageRange }
 * @returns {Promise<object>} - Object ของผู้ใช้ที่อัปเดตข้อมูลล่าสุดแล้ว
 * @throws {ApiError} - โยน ApiError หากไม่พบผู้ใช้ด้วย ID ที่ระบุ
 */
const updateUser = async (line_user_id, updateData) => {
  // 1. ตรวจสอบว่ามี User ID ส่งเข้ามาหรือไม่
  if (!line_user_id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'จำเป็นต้องระบุ User ID');
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
    if (error.code === 'P2025') {
      throw new ApiError(httpStatus.NOT_FOUND, `ไม่พบผู้ใช้ที่มี ID: ${userId}`);
    }
    // โยน Error อื่นๆ ต่อไป
    console.error('Error updating user:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้');
  }
};

/**
 * อัปเดตข้อมูลผู้ใช้โดย Admin
 * @param {string} userId - Mongo ID ของผู้ใช้ที่จะแก้ไข
 * @param {object} payload - ข้อมูลที่จะอัปเดต
 * @returns {Promise<object>} - User object ที่อัปเดตแล้ว
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
 * ดึงประวัติการเชิญเพื่อนทั้งหมดของผู้ใช้
 * @param userId - ID ของผู้ใช้ (ผู้แนะนำ)
 * @returns Array ของ ReferralHistoryDto
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
          createdAt: 'desc',
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

const createReferral = async (newcomerId, referralCode) => {
  // 1. ตรวจสอบว่ามี Input ที่จำเป็นครบถ้วน
  if (!newcomerId || !referralCode) {
    throw new Error('Newcomer ID และ Referral Code เป็นสิ่งจำเป็น');
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
    throw new Error('ผู้ใช้ไม่สามารถแนะนำตัวเองได้');
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

const setLocked = async (line_user_id) => {
  const locked = await prisma.user.update({
    where: { line_user_id: line_user_id },
    data: {
      isLocked: true,
    },
  });

  return locked;
};

const unlock = async (line_user_id, pin) => {
  const response = await axios.get(`https://checkuserdb.vercel.app/api/get-pin/${line_user_id}`);
  const serverPin = response.data.pin;

  const userPinBuffer = Buffer.from(String(pin));
  const serverPinBuffer = Buffer.from(String(serverPin));

  if (userPinBuffer.length !== serverPinBuffer.length) {
    // If lengths don't match, they can't be equal.
    // We still run a dummy comparison on the serverPin to prevent leaking length information.
    crypto.timingSafeEqual(serverPinBuffer, serverPinBuffer);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'รหัสผ่านไม่ถูกต้องกรุณาลองใหม่');
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
    return { message: 'User unlocked successfully.' };
  } else {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'รหัสผ่านไม่ถูกต้องกรุณาลองใหม่');
  }
};

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
  getUsers,
  // ดึงข้อมูล user ด้วย line_user_id
  getUser,
  // ดึงข้อมูล user ด้วย เบอร์
  findUserByPhone,
  getUserFirstTimeById,
  updateUserByAdmin,
  updateUser,
  checkUserStatus,
  createUserWithGoal,
  createReferral,
  setUserReferCode,
  getReferralHistory,
  getLockStatus,
  setLocked,
  unlock,
};
