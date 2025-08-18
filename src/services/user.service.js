// src/services/user.service.ts

import { PrismaClient, TransactionStatus } from '../generated/prisma/index.js';
import { MissionType } from '../generated/prisma/index.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import axios from 'axios';
import crypto from 'crypto';
import notificationService from './notification.service.js';
import transactionService from './transaction.service.js';

const prisma = new PrismaClient();

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
  const user = await prisma.user.findUnique({
    where: { line_user_id: line_user_id },
    select: {
      id: true,
    },
  });
  if (!user) {
    return { isNewUser: true };
  }
  return { isNewUser: false };
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
      monthlyPayment: true,
      isLocked: true,
      referralCode: true,
      firstTime: true,
      wallet: true, // ทั้งก้อนของ wallet
      madeReferrals: true,
      createdAt: true,
      role: true,
      goal: {
        select: {
          product: {
            select: {
              brand: true,
              model: true,
              imageUrl: true,
              downPaymentAmount: true,
            },
          },
        },
      },
      notifications: {
        select: {
          transaction: true, // หรือ select ฟิลด์ย่อยของ transaction ต่อก็ได้
        },
      },
      userMissions: true,
    },
  });
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
  const {
    mobileId,
    planId,
    line_user_id,
    line_display_name,
    line_profile_url,
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

  const existingUser = await prisma.user.findUnique({
    where: { line_user_id: line_user_id },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'User is already exists');
  }

  // สร้าง Referral Code ที่ไม่ซ้ำกัน
  const referralCode = await generateUniqueReferralCode(prisma);

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
 * สร้าง Referral Code ที่ไม่ซ้ำกันในระบบ
 * @returns {Promise<string>} - Referral Code ที่พร้อมใช้งาน
 */
const generateUniqueReferralCode = async () => {
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    // สร้างรหัสสุ่ม 6 ตัวอักษร (ตัวพิมพ์ใหญ่)
    referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // ตรวจสอบว่ารหัสนี้มีอยู่ในฐานข้อมูลแล้วหรือยัง
    const existingUser = await prisma.user.findUnique({
      where: { referralCode: referralCode },
    });

    // ถ้าไม่พบ แสดงว่ารหัสนี้ใช้ได้
    if (!existingUser) {
      isUnique = true;
    }
  }
  return referralCode;
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
  const status = await prisma.user.findUnique({ where: { line_user_id: line_user_id }, select: { isLocked: true } });
  if (!status) {
    console.log('No user');
    return { isLocked: true };
  }
  return status;
};

export default {
  // ดึงข้อมูล user ด้วย line_user_id
  getUser,
  // ดึงข้อมูล user ด้วย เบอร์
  findUserByPhone,
  getUserFirstTimeById,
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
