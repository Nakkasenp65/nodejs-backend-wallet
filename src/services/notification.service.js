import { NotificationType } from '../generated/prisma/index.js';
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

// ---- Helpers ----
const formatBaht = (amount) => {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} บาท`;
  // ใช้ toFixed ให้สอดคล้องกับโค้ดเดิม
  return `${n.toFixed(2)} บาท`;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  // 08x-xxx-xx12
  const s = String(phone).replace(/\D/g, '');
  if (s.length < 4) return phone;
  return `${s.slice(0, 2)}${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-2)}`;
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

/**
 * แจ้งเตือนเมื่อผู้ใช้ "ได้รับเงิน" จากผู้อื่น
 * @param {string} userId - ผู้รับเงิน
 * @param {object} data
 * @param {number|string} data.amount - จำนวนเงินที่ได้รับ
 * @param {string} [data.fromName] - ชื่อผู้ส่ง (ถ้ามี)
 * @param {string} [data.fromPhone] - เบอร์ผู้ส่ง (จะถูก mask)
 * @param {string} [data.note] - โน้ตที่แนบมากับการโอน (ถ้ามี)
 * @param {string} [data.transactionId] - ไอดีรายการโอน
 */
const sendTransferReceived = async (userId, { amount, fromName, fromPhone, note, transactionId } = {}) => {
  const sender = fromName?.trim() || (fromPhone ? `ผู้ใช้ (${maskPhone(fromPhone)})` : 'ผู้ใช้ไม่ระบุชื่อ');

  const pieces = [`ได้รับเงิน ${formatBaht(amount)} จาก ${sender}`, note ? `โน้ต: ${note}` : null].filter(Boolean);

  return createNotification(userId, {
    title: '📥 เงินเข้าแล้ว',
    body: pieces.join('\n'),
    type: 'WALLET',
    transactionId,
  });
};

// (ทางเลือก) แจ้งเตือนฝั่งผู้โอนเองว่าทำรายการสำเร็จ
const sendTransferSent = async (userId, { amount, toName, toPhone, note, transactionId } = {}) => {
  const receiver = toName?.trim() || (toPhone ? `ผู้ใช้ (${maskPhone(toPhone)})` : 'ผู้ใช้ไม่ระบุชื่อ');

  const pieces = [`โอนเงิน ${formatBaht(amount)} ไปยัง ${receiver} สำเร็จ`, note ? `โน้ต: ${note}` : null].filter(
    Boolean,
  );

  return createNotification(userId, {
    title: '✅ โอนเงินสำเร็จ',
    body: pieces.join('\n'),
    type: 'WALLET',
    transactionId,
  });
};

/**
 * เมื่อผู้ใช้สร้างเป้าหมายออมดาวน์ใหม่
 * @param {string} userId
 * @param {object} data
 * @param {string} data.goalTitle - ชื่อเป้าหมาย (เช่น "iPhone 16")
 * @param {number|string} data.targetAmount - ยอดเป้าหมายรวม
 * @param {string|Date} [data.deadline] - วันสิ้นสุด (แสดงแบบข้อความ)
 */
const sendGoalCreated = async (userId, { goalTitle, targetAmount, deadline } = {}) => {
  const lines = [
    `ตั้งเป้าหมาย "${goalTitle}" เรียบร้อย`,
    `ยอดเป้าหมายรวม ${formatBaht(targetAmount)}`,
    deadline ? `กำหนดเสร็จภายใน: ${new Date(deadline).toLocaleDateString('th-TH')}` : null,
  ].filter(Boolean);

  return createNotification(userId, {
    title: '🎯 เริ่มออมดาวน์แล้ว!',
    body: lines.join('\n'),
    type: 'SYSTEM',
  });
};

/**
 * แจ้งเตือนเมื่อความคืบหน้าแตะ Milestone สำคัญ (25/50/75/100%)
 * @param {string} userId
 * @param {object} data
 * @param {string} data.goalTitle
 * @param {number} data.percent - 0-100
 * @param {number|string} [data.currentAmount]
 * @param {number|string} [data.targetAmount]
 */
const sendGoalMilestone = async (userId, { goalTitle, percent, currentAmount, targetAmount } = {}) => {
  const lines = [
    `ออมครบ ${Math.round(percent)}% ของ "${goalTitle}" แล้ว`,
    currentAmount != null && targetAmount != null
      ? `ยอดสะสม ${formatBaht(currentAmount)} / ${formatBaht(targetAmount)}`
      : null,
  ].filter(Boolean);

  return createNotification(userId, {
    title: '📈 ความคืบหน้าการออม',
    body: lines.join('\n'),
    type: 'SYSTEM',
  });
};

/**
 * แจ้งเตือนใกล้ถึงกำหนดออมครั้งถัดไป/ครบกำหนด (D-n)
 * @param {string} userId
 * @param {object} data
 * @param {string} data.goalTitle
 * @param {number|string} data.amountDue - แนะนำยอดที่ควรออม
 * @param {number} data.daysLeft - เหลือกี่วัน
 */
const sendGoalDueReminder = async (userId, { goalTitle, amountDue, daysLeft } = {}) => {
  const when = daysLeft <= 0 ? 'วันนี้' : `อีก ${daysLeft} วัน`;
  return createNotification(userId, {
    title: '⏰ ถึงเวลาฝากออมแล้ว',
    body: `${when}ควรออม ${formatBaht(amountDue)} สำหรับ "${goalTitle}"\nกดเพื่อฝากตอนนี้เลย`,
    type: 'SYSTEM',
  });
};

/**
 * แจ้งเตือนเมื่อบรรลุเป้าหมายออมดาวน์ครบ 100%
 * @param {string} userId
 * @param {object} data
 * @param {string} data.goalTitle
 */
const sendGoalAchieved = async (userId, { goalTitle } = {}) => {
  return createNotification(userId, {
    title: '🏁 บรรลุเป้าหมายแล้ว!',
    body: `ยินดีด้วย คุณออมครบตามเป้าหมาย "${goalTitle}" แล้ว\nดำเนินการสั่งซื้อ/รับสิทธิ์ได้ทันที`,
    type: 'SYSTEM',
  });
};

/**
 * แจ้งเตือนเมื่อไม่มีการออมมาระยะหนึ่ง (ป้องกันหลุดแผน)
 * @param {string} userId
 * @param {object} data
 * @param {number} data.days - เว้นไปกี่วันแล้วที่ไม่ได้ออม
 * @param {string} [data.goalTitle]
 */
const sendInactivityReminder = async (userId, { days, goalTitle } = {}) => {
  const goal = goalTitle ? ` สำหรับ "${goalTitle}"` : '';
  return createNotification(userId, {
    title: '📌 อย่าลืมออมต่อเนื่อง',
    body: `คุณไม่ได้ออมมา ${days} วันแล้ว${goal}\nการออมสม่ำเสมอช่วยให้ถึงเป้าหมายไวขึ้น`,
    type: 'SYSTEM',
  });
};

/**
 * สร้างชุดการแจ้งเตือนต้อนรับสำหรับผู้ใช้ใหม่
 * ประกอบด้วย:
 * 1. โบนัสสมัครใหม่ 100 บาท (REWARD)
 * 2. ข้อเสนอโบนัสออมครั้งแรก 2 เท่า (SYSTEM)
 * @param userId - ID ของผู้ใช้ใหม่ (จาก Model User)
 */
const createWelcomeNotifications = async (userId, welcomeTransactionId) => {
  if (!userId) {
    console.error('Error: userId is required to create welcome notifications.');
    return;
  }

  // 1. การแจ้งเตือน: แจกโบนัส 100 บาทสำหรับผู้ใช้ใหม่
  const welcomeBonusNotification = {
    userId: userId,
    type: NotificationType.REWARD,
    title: '💰 รับโบนัสฟรี 100 บาท!',
    body: `ยินดีต้อนรับสู่ One Wallet! เราขอมอบเงินโบนัสพิเศษ 100 บาทเข้าสู่บัญชีของคุณทันที!\n\nคุณสามารถใช้โบนัสนี้เป็นส่วนหนึ่งของการออมเพื่อพิชิตเป้าหมายการดาวน์สินค้าที่คุณต้องการได้เลย\n\n**คำเตือน:** \nเงินโบนัสนี้สามารถนำมาแลกสินค้าเพื่อเริ่มการดาวน์ได้ ไม่สามารถถอนเป็นเงินสดได้`,
  };

  const firstDepositOfferNotification = {
    userId: userId,
    type: NotificationType.SYSTEM,
    title: '💵 พิเศษ! ออมครั้งแรก รับโบนัส 2 เท่า',
    body: `เริ่มต้นการออมของคุณอย่างคุ้มค่าที่สุด! เพียงออมเงินครั้งแรกกับเรา รับโบนัสเพิ่มทันที 100% ของยอดออม สูงสุด 100 บาท\n\nตัวอย่าง:\n- ออมครั้งแรก 50 บาท -> รับโบนัสเพิ่ม 50 บาท\n- ออมครั้งแรก 100 บาท -> รับโบนัสเพิ่ม 100 บาท\n\nภารกิจนี้มีไว้สำหรับคุณโดยเฉพาะ อย่ารอช้า เริ่มออมเพื่อรับความคุ้มค่าแบบสองเท่าได้เลย!`,
    // transactionId จะเป็น null ในที่นี้ เพราะนี่คือการแจ้ง "ข้อเสนอ"
    // เมื่อผู้ใช้ฝากเงินจริงและระบบให้โบนัส การแจ้งเตือนครั้งนั้นถึงจะมี transactionId
  };

  try {
    // ใช้ createMany เพื่อสร้างการแจ้งเตือนหลายรายการพร้อมกันอย่างมีประสิทธิภาพ
    const result = await prisma.notification.createMany({
      data: [welcomeBonusNotification, firstDepositOfferNotification],
    });

    console.log(`Successfully created ${result.count} welcome notifications for user ${userId}.`);
  } catch (error) {
    console.error(`Failed to create welcome notifications for user ${userId}:`, error);
    // สามารถโยน Error ต่อเพื่อให้ Service ที่เรียกใช้จัดการต่อได้
    throw new Error('Could not create welcome notifications.');
  }
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
  sendTransferReceived,
  sendTransferSent,
  sendGoalCreated,
  sendGoalMilestone,
  sendGoalDueReminder,
  sendGoalAchieved,
  sendInactivityReminder,
  createWelcomeNotifications,
};
