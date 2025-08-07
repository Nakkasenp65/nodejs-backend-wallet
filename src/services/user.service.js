// src/services/user.service.ts

import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MissionType } from '../generated/prisma/index.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const prisma = new PrismaClient();

const checkUserStatus = async (userId) => {
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'LIFF ID is required');
  }
  const user = await prisma.user.findUnique({
    where: { userId: userId },
  });
  if (!user) {
    return { isNewUser: true };
  }
  return { isNewUser: false };
};

const getUserByLiffId = async (userId) => {
  return await prisma.user.findUnique({
    where: { userId },
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
  const { mobileId, planId, liffId, displayName, pictureUrl, occupation, ageRange, monthlyPayment } = userData;

  // 1. สร้าง Referral Code ที่ไม่ซ้ำกันก่อน (เผื่อต้องใช้)
  const referralCode = await generateUniqueReferralCode();

  // 2. ใช้ `upsert` เพื่อสร้าง User หรือดึงข้อมูล User ที่มีอยู่แล้ว
  const user = await prisma.user.upsert({
    where: {
      userId: liffId, // เงื่อนไขในการค้นหา
    },
    update: {
      // ถ้าเจอ User, ให้อัปเดตข้อมูลที่อาจเปลี่ยนแปลงได้
      username: displayName,
      userProfilePicUrl: pictureUrl,
    },
    create: {
      // ถ้าไม่เจอ User, ให้สร้างใหม่ด้วยข้อมูลทั้งหมด
      userId: liffId,
      username: displayName,
      userProfilePicUrl: pictureUrl,
      occupation,
      ageRange,
      firstTime: true, // ตั้งเป็น true สำหรับ user ใหม่จริงๆ
      monthlyPayment: monthlyPayment,
      referralCode: referralCode,
      wallet: {
        create: {
          balance: 0,
          bonusBalance: 0,
        },
      },
    },
    include: {
      wallet: true,
      goal: true,
    },
  });

  // 3. ตรวจสอบและสร้าง Goal แยกต่างหาก (เพื่อความปลอดภัย)
  //    วิธีนี้ป้องกันการพยายามสร้าง Goal ซ้ำซ้อนได้อย่างสมบูรณ์
  if (!user.goal) {
    await prisma.goal.create({
      data: {
        userId: user.id,
        productId: mobileId,
        planId: planId,
      },
    });
  }

  // 4. จัดการภารกิจ Onboarding (เฉพาะตอนที่ User ถูกสร้างขึ้นครั้งแรกจริงๆ)
  if (user.firstTime) {
    const onboardingMissions = await prisma.mission.findMany({
      where: {
        type: MissionType.ONBOARDING,
        webExpiresAt: { gte: new Date() },
      },
    });

    if (onboardingMissions.length > 0) {
      const userMissionsData = onboardingMissions.map((mission) => {
        const userExpiresAt = new Date();
        userExpiresAt.setDate(userExpiresAt.getDate() + mission.durationDays);
        return {
          userId: user.id,
          missionId: mission.id,
          status: 'ENROLLED',
          userExpiresAt: userExpiresAt,
          completeProgress: mission.completeProgress,
        };
      });
      await prisma.userMission.createMany({
        data: userMissionsData,
      });
    }

    // อัปเดตสถานะ firstTime เป็น false หลังจากจัดการทุกอย่างเสร็จแล้ว
    await prisma.user.update({
      where: { id: user.id },
      data: { firstTime: false },
    });
  }

  // 5. ดึงข้อมูล User ล่าสุดทั้งหมดกลับไปให้ Frontend
  return prisma.user.findUnique({
    where: { id: user.id },
    include: {
      goal: {
        include: {
          product: true,
          plan: true,
        },
      },
      notifications: true,
      wallet: true,
      userMissions: true,
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

export default { getUserByLiffId, updateUserProfile, checkUserStatus, createUserWithGoal };
