import prisma from '../libs/prisma.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const getNotificationsByUserId = async (userId) => {
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required');
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: userId },
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
};

const markNotificationAsRead = async (notificationId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  // ไม่ต้องอัปเดตซ้ำถ้าอ่านแล้ว
  if (notification.isRead) {
    return notification;
  }

  const updatedNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updatedNotification;
};

const clearNotificationsByType = async (userId, type) => {
  const deleteResult = await prisma.notification.deleteMany({
    where: {
      userId: userId,
      type: type,
    },
  });

  return deleteResult; // `deleteResult` จะเป็น object ที่มี property `count`
};

/**
 * (ฟังก์ชันหลัก) สร้าง Notification ใหม่ในฐานข้อมูล
 * @param {string} userId - ID ของผู้ใช้ที่จะรับการแจ้งเตือน
 * @param {object} payload - ข้อมูลของการแจ้งเตือน
 * @param {string} payload.title - หัวข้อการแจ้งเตือน
 * @param {string} [payload.body] - เนื้อหาเพิ่มเติม (ถ้ามี)
 * @param {('WALLET'|'REWARD'|'SYSTEM')} payload.type - ประเภทของการแจ้งเตือน
 * @param {string} [payload.transactionId] - ID ของ Transaction ที่เกี่ยวข้อง (ถ้ามี)
 * @returns {Promise<object>} - Object ของ Notification ที่ถูกสร้างขึ้น
 */
const createNotification = async (userId, payload) => {
  const { title, body, type, transactionId } = payload;

  if (!userId || !title || !type) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User ID, title, and type are required for notification.');
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        title,
        body,
        type,
        user: {
          connect: { id: userId },
        },
        // เชื่อมกับ Transaction ถ้ามี transactionId ส่งเข้ามา
        ...(transactionId && {
          transaction: {
            connect: { id: transactionId },
          },
        }),
      },
    });
    console.log(`Create notification success!: ${title} - ${body}`);
    return notification;
  } catch (error) {
    console.error(`Failed to create notification for user ${userId}:`, error);
    // ไม่โยน Error ที่ทำให้ Flow หลักพัง แต่ log ไว้
    // throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Could not create notification.');
  }
};

// --- ฟังก์ชันย่อยสำหรับเหตุการณ์ต่างๆ ---

/**
 * ส่งการแจ้งเตือน "การฝากเงินสำเร็จ"
 * @param {string} userId - ID ของผู้ใช้
 * @param {number} amount - จำนวนเงินที่ฝากสำเร็จ
 * @param {string} transactionId - ID ของ Transaction ที่เกี่ยวข้อง
 */
const sendDepositSuccess = async (userId, amount, transactionId) => {
  return createNotification(userId, {
    title: '✅ ฝากเงินสำเร็จ',
    body: `ยอดเงินจำนวน ${amount.toFixed(2)} บาทเข้าสู่บัญชีของคุณแล้ว`,
    type: 'WALLET',
    transactionId: transactionId,
  });
};

/**
 * ส่งการแจ้งเตือน "การฝากเงินถูกปฏิเสธ"
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} reason - เหตุผลที่ถูกปฏิเสธ
 * @param {string} transactionId - ID ของ Transaction ที่เกี่ยวข้อง
 */
const sendDepositRejected = async (userId, reason, transactionId) => {
  return createNotification(userId, {
    title: '❌ รายการถูกปฏิเสธ',
    body: reason, // ใช้เหตุผลจาก description ของ transaction ได้เลย
    type: 'WALLET',
    transactionId: transactionId,
  });
};

/**
 * ส่งการแจ้งเตือน "ทำภารกิจสำเร็จ" (รอกดรับรางวัล)
 * @param {string} userId - ID ของผู้ใช้
 * @param {string} missionTitle - ชื่อของภารกิจที่ทำสำเร็จ
 */
const sendMissionCompleted = async (userId, missionTitle) => {
  return createNotification(userId, {
    title: '🎉 ภารกิจสำเร็จ!',
    body: `ยินดีด้วย! คุณทำภารกิจ "${missionTitle}" สำเร็จแล้ว กดเพื่อรับรางวัลเลย!`,
    type: 'REWARD',
  });
};

/**
 * ส่งการแจ้งเตือน "รับรางวัลภารกิจแล้ว"
 * @param {string} userId - ID ของผู้ใช้
 * @param {number} rewardAmount - จำนวนเงินรางวัลที่ได้รับ
 * @param {string} transactionId - ID ของ Transaction รางวัล
 */
const sendRewardClaimed = async (userId, rewardAmount, transactionId) => {
  return createNotification(userId, {
    title: '💰 ได้รับรางวัลแล้ว',
    body: `คุณได้รับโบนัส ${rewardAmount.toFixed(2)} บาทเข้าสู่กระเป๋าเงินโบนัสเรียบร้อยแล้ว`,
    type: 'REWARD',
    transactionId: transactionId,
  });
};

/**
 * ส่งการแจ้งเตือน "ยินดีต้อนรับ" สำหรับผู้ใช้ใหม่
 * @param {string} userId - ID ของผู้ใช้ใหม่
 */
const sendWelcomeNotification = async (userId) => {
  return createNotification(userId, {
    title: 'ยินดีต้อนรับสู่ NO1Money+ 👋',
    body: 'เริ่มต้นเส้นทางการออมดาวน์เพื่อคว้าโทรศัพท์ในฝันของคุณได้เลย!',
    type: 'SYSTEM',
  });
};

export default {
  getNotificationsByUserId,
  markNotificationAsRead,
  clearNotificationsByType,
  sendDepositSuccess,
  sendDepositRejected,
  sendMissionCompleted,
  sendRewardClaimed,
  sendWelcomeNotification,
};
