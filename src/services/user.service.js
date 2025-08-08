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
    pin,
  } = userData;

  const floatMonthlyPayment = parseFloat(monthlyPayment);

  // ใช้ Transaction เพื่อครอบคลุมทุกขั้นตอน
  const finalUserWithData = await prisma.$transaction(async (tx) => {
    // 1. ค้นหา User ที่มีอยู่ก่อน
    let user = await tx.user.findUnique({
      where: { line_user_id: line_user_id },
    });

    let wasUserCreated = false;

    // 2. ถ้าไม่เจอ User, ให้สร้างใหม่ทั้งหมด
    if (!user) {
      wasUserCreated = true;
      const referralCode = await generateUniqueReferralCode(tx);

      user = await tx.user.create({
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
          wallet: { create: { balance: 0, bonusBalance: 0 } },
          goal: {
            create: {
              plan: { connect: { id: planId } },
              product: { connect: { id: mobileId } },
            },
          },
        },
      });
    }

    // 3. จัดการภารกิจ Onboarding
    if (wasUserCreated) {
      // ... Logic การสร้าง UserMission (เหมือนเดิม) ...
    }

    // --- 4. (จุดที่แก้ไข) ดึงข้อมูลล่าสุดทั้งหมด "ภายใน" Transaction ---
    // การทำแบบนี้จะทำให้ Prisma รอจนกว่าการเขียนทั้งหมดก่อนหน้านี้จะ commit เสร็จสมบูรณ์
    // ก่อนที่จะทำการอ่านข้อมูลนี้
    const fullUserData = await tx.user.findUnique({
      where: { id: user.id },
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

    // 5. คืนค่าข้อมูลที่สมบูรณ์ออกมาจาก Transaction
    return fullUserData;
  });

  // 6. คืนค่าที่ได้จาก Transaction โดยตรง
  return finalUserWithData;
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
