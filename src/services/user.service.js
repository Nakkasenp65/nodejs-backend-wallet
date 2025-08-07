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
 * สร้างผู้ใช้ใหม่พร้อมกับ Goal และผูกภารกิจ Onboarding ให้โดยอัตโนมัติ
 * @param {object} userData - ข้อมูลของผู้ใช้ใหม่
 * @returns {Promise<object>} - Object ของ User ที่ถูกสร้างขึ้นใหม่พร้อม relations
 */
const createUserWithGoal = async (userData) => {
  const { mobileId, planId, liffId, displayName, pictureUrl, occupation, ageRange, monthlyPayment } = userData;

  const existingUser = await prisma.user.findUnique({
    where: { userId: liffId },
    include: {
      wallet: true,
      goal: {
        include: {
          plan: true,
          product: true,
        },
      },
    },
  });

  if (existingUser) {
    return existingUser;
  }

  const referralCode = await generateUniqueReferralCode();

  const newUser = await prisma.$transaction(async (tx) => {
    // 2.1 สร้าง User, Wallet, และ Goal พร้อมกัน (เหมือนเดิม แต่ใช้ 'tx' แทน 'prisma')
    const createdUser = await tx.user.create({
      data: {
        userId: liffId,
        username: displayName,
        userProfilePicUrl: pictureUrl,
        occupation,
        ageRange,
        firstTime: false, // ตั้งเป็น false เพราะกำลังจะผ่านขั้นตอน Onboarding
        monthlyPayment: monthlyPayment,
        referralCode: referralCode,
        wallet: {
          create: {
            balance: 0,
            bonusBalance: 0, // เพิ่ม bonusBalance ตาม schema ล่าสุด
          },
        },
        goal: {
          create: {
            product: { connect: { id: mobileId } },
            plan: { connect: { id: planId } },
          },
        },
      },
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

    const onboardingMissions = await tx.mission.findMany({
      where: {
        type: MissionType.ONBOARDING,
        webExpiresAt: { gte: new Date() },
      },
    });

    if (onboardingMissions.length === 0) {
      return createdUser;
    }

    const userMissionsData = onboardingMissions.map((mission) => {
      const userExpiresAt = new Date();
      userExpiresAt.setDate(userExpiresAt.getDate() + mission.durationDays);

      return {
        userId: createdUser.id,
        missionId: mission.id,
        status: 'ENROLLED',
        userExpiresAt: userExpiresAt,
        completeProgress: mission.completeProgress,
      };
    });

    await tx.userMission.createMany({
      data: userMissionsData,
    });

    return createdUser;
  });

  return newUser;
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
