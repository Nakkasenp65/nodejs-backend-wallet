import prisma from '../libs/prisma.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

async function getNotificationsByUserId(userId) {
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  // const user = await prisma.user.findUnique({ where: { userId } });

  const notifications = await prisma.notification.findMany({
    where: { userId },
    // Include transaction data for notifications that are linked to one
    include: {
      transaction: true,
    },
    // เรียงลำดับจากใหม่สุดไปเก่าสุด
    orderBy: {
      createdAt: 'desc',
    },
  });
  return notifications;
}

async function markNotificationAsRead(notificationId, userId) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  // ตรวจสอบความปลอดภัย: Notification ต้องมีอยู่ และต้องเป็นของ user คนนี้เท่านั้น
  if (!notification || notification.userId !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  // ไม่ต้องอัปเดตซ้ำถ้าอ่านแล้ว
  if (notification.isRead) {
    return notification;
  }

  const updatedNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updatedNotification;
}

async function clearNotificationsByType(userId, type) {
  let typesToDelete;

  if (type === 'transactions') {
    typesToDelete = ['RECEIVE', 'SENT'];
  } else if (type === 'promos') {
    typesToDelete = ['REWARD', 'SYSTEM'];
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid notification type specified.');
  }

  const deleteResult = await prisma.notification.deleteMany({
    where: {
      userId: userId,
      type: {
        in: typesToDelete,
      },
    },
  });

  return deleteResult; // `deleteResult` จะเป็น object ที่มี property `count`
}

export default {
  getNotificationsByUserId,
  markNotificationAsRead,
  clearNotificationsByType,
};
