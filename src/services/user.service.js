// src/services/user.service.ts

import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MissionType } from '../generated/prisma/index.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const prisma = new PrismaClient();

/**
 * ตรวจสอบว่าผู้ใช้มีข้อมูลอยู่ในระบบแล้วหรือไม่จาก Line User ID เพื่อระบุว่าเป็นผู้ใช้ใหม่หรือผู้ใช้ปัจจุบัน
 * เป็นการตรวจสอบแบบ lightweight ที่ไม่ดึงข้อมูลผู้ใช้ทั้งหมดกลับมา
 * @param {string} userId - Line User ID ของผู้ใช้ที่ต้องการตรวจสอบ
 * @returns {Promise<{isNewUser: boolean}>} Promise ที่จะ resolve เป็น object ที่ระบุสถานะของผู้ใช้ เช่น { isNewUser: true }
 * @throws {ApiError} โยน ApiError หากไม่มีการส่ง `userId` (Line User ID) เข้ามา
 */
const checkUserStatus = async (lineUserId) => {
  if (!lineUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Line userId is required');
  }
  const user = await prisma.user.findUnique({
    where: { line_user_id: lineUserId },
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
const getUserByLineUserId = async (lineUserId) => {
  return await prisma.user.findUnique({
    where: { line_user_id: lineUserId },
    include: {
      wallet: true,
      goal: {
        include: {
          product: true,
          plan: true,
        },
      },
      notifications: {
        include: {
          transaction: true,
        },
      },
      userMissions: true,
    },
  });
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
  } = userData;

  const floatMonthlyPayment = parseFloat(monthlyPayment);

  // 1. ค้นหา User ที่มีอยู่ก่อนด้วย line_user_id
  const existingUser = await prisma.user.findUnique({
    where: { line_user_id: line_user_id },
  });

  // --- กรณีเป็น User ที่มีอยู่แล้ว ---
  if (existingUser) {
    console.log(`User ${line_user_id} already exists. Fetching latest data.`);
    // ดึงข้อมูลล่าสุดทั้งหมดของ User คนนั้นแล้วคืนค่ากลับไปทันที
    // ส่วนนี้เหมือนเดิม แต่ใช้ prisma ตรงๆ แทน tx
    return prisma.user.findUnique({
      where: { id: existingUser.id },
      include: {
        goal: { include: { product: true, plan: true } },
        wallet: true,
        userMissions: { include: { mission: true } },
        notifications: true,
      },
    });
  }

  // --- กรณีเป็น User ใหม่ (ทำงานแบบเรียงลำดับ) ---
  console.log(`Creating new user for ${line_user_id}.`);

  // 2. สร้าง Referral Code ที่ไม่ซ้ำกัน
  // สังเกตว่าเราต้องส่ง `prisma` client เข้าไปแทน `tx`
  const referralCode = await generateUniqueReferralCode(prisma);

  // 3. สร้าง User, Wallet, และ Goal ใหม่ทั้งหมด
  // ใช้ prisma.user.create() โดยตรง
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
      wallet: {
        create: {
          balance: 0,
          bonusBalance: 0,
        },
      },
      goal: {
        create: {
          plan: { connect: { id: planId } },
          product: { connect: { id: mobileId } },
        },
      },
    },
  });

  // 4. จัดการภารกิจ Onboarding สำหรับ User ใหม่
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

  // 5. ดึงข้อมูลล่าสุดทั้งหมดของ "User ใหม่" ที่เพิ่งสร้างเสร็จ กลับไป
  // เราต้องดึงข้อมูลอีกครั้งเพื่อให้ได้ข้อมูล nested relations ที่สร้างขึ้นมาทั้งหมด
  return prisma.user.findUnique({
    where: { id: newUser.id },
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

const updateUserProfile = async (liffId, payload) => {
  return prisma.user.update({
    where: { liffId },
    data: {
      username: payload.username,
      userProfilePicUrl: payload.userProfilePicUrl,
    },
  });
};

export default { getUserByLineUserId, updateUserProfile, checkUserStatus, createUserWithGoal };
