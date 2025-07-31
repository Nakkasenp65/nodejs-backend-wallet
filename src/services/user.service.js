// src/services/user.service.ts

import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const prisma = new PrismaClient();

const checkUserStatus = async (userId) => {
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'LIFF ID is required');
  }
  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      id: true,
      firstTime: true,
    },
  });

  if (!user) {
    return { isNewUser: true, firstTime: true };
  }

  return { isNewUser: false, firstTime: user.firstTime };
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
    },
  });
};

const createUser = async (payload) => {
  const { liffId, username, userProfilePicUrl } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { userId: liffId },
    include: {
      goal: true,
      wallet: true,
      notifications: true,
    },
  });

  if (existingUser) {
    throw new ApiError(httpStatus.CONFLICT, 'User already exist');
  }

  const newUser = await prisma.user.create({
    data: {
      userId: liffId,
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
};

const createUserWithGoal = async (userData) => {
  const { mobileId, planId, liffId, displayName, pictureUrl } = userData;

  const existingUser = await prisma.user.findUnique({
    where: { userId: liffId },
  });

  if (existingUser) {
    return existingUser;
  }

  const newUser = await prisma.user.create({
    data: {
      userId: liffId,
      username: displayName,
      userProfilePicUrl: pictureUrl,
      wallet: {
        create: {
          balance: 0,
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
      wallet: true,
    },
  });
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

export default { createUser, getUserByLiffId, updateUserProfile, checkUserStatus, createUserWithGoal };
