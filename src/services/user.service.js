// src/services/user.service.ts

import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const prisma = new PrismaClient();

const getUserByLiffId = async (userId) => {
  return await prisma.user.findUnique({
    where: { userId },
    include: {
      wallet: {},
      goal: {
        include: {
          mobileModel: {
            include: {
              brand: true,
            },
          },
          plan: true,
        },
      },
      notifications: {
        include: {
          transaction: true,
        },
      },
    },
  });
};

const createUser = async (payload) => {
  const { liffId, username, userProfilePicUrl } = payload;
  if (!liffId || !username) throw new ApiError(httpStatus.BAD_REQUEST, 'liffId and username is required');
  try {
    const newUser = await prisma.user.create({
      data: {
        liffId,
        username,
        userProfilePicUrl,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        wallet: true,
      },
    });

    return newUser;
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(`LIFF ID '${liffId}' นี้ถูกลงทะเบียนแล้วในระบบ`);
    }
    throw error;
  }
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

export default { createUser, getUserByLiffId, updateUserProfile };
