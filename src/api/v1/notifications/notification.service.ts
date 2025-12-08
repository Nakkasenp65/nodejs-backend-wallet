/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับการแจ้งเตือน (Notification)
 * @description ไฟล์นี้ทำหน้าที่เป็นศูนย์กลางในการสร้าง, อ่าน, และจัดการการแจ้งเตือนทั้งหมดในระบบ
 * ประกอบด้วยฟังก์ชันพื้นฐานสำหรับการสร้างการแจ้งเตือน และฟังก์ชันแม่แบบ (Templated Functions)
 * สำหรับการส่งการแจ้งเตือนที่เป็นมาตรฐานจากส่วนต่างๆ ของแอปพลิเคชัน
 * @module services/notification
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import { NotificationType, Prisma } from "@prisma/client";
import prisma from "../../../libs/prisma.js";
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";

const formatBaht = (amount: number | string) => {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} บาท`;
  // ใช้ toFixed ให้สอดคล้องกับโค้ดเดิม
  return `${n.toFixed(2)} บาท`;
};

const maskPhone = (phone: string) => {
  if (!phone) return "";
  // 08x-xxx-xx12
  const s = String(phone).replace(/\D/g, "");
  if (s.length < 4) return phone;
  return `${s.slice(0, 2)}${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-2)}`;
};

/**
 * (Core) สร้างการแจ้งเตือนที่เชื่อมโยงกับผู้ใช้รายบุคคล
 * @description ฟังก์ชันพื้นฐานสำหรับสร้างการแจ้งเตือนทุกประเภทที่ต้องมีผู้รับชัดเจน
 * สามารถเชื่อมโยงการแจ้งเตือนเข้ากับธุรกรรมที่เกี่ยวข้องได้ผ่าน `transactionId`
 * ถูกออกแบบมาให้ไม่โยน Error เพื่อป้องกันไม่ให้ Flow การทำงานหลัก (เช่น การลงทะเบียน) ล้มเหลว
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่จะได้รับการแจ้งเตือน
 * @param {object} payload - อ็อบเจกต์ข้อมูลการแจ้งเตือน
 * @param {string} payload.title - หัวข้อการแจ้งเตือน
 * @param {string} [payload.body] - เนื้อหาการแจ้งเตือน
 * @param {NotificationType} payload.type - ประเภทของการแจ้งเตือน (จาก Prisma Enum)
 * @param {string} [payload.transactionId] - (Optional) ID ของธุรกรรมที่เกี่ยวข้อง
 * @returns {Promise<object|undefined>} Promise ที่ resolve เป็นอ็อบเจกต์ Notification ที่สร้างขึ้น หรือ undefined หากเกิดข้อผิดพลาด
 */
const createUserNotification = async (
  userId: string,
  payload: { title: string; body: string; type: NotificationType; transactionId?: string },
) => {
  const { title, body, type, transactionId } = payload;

  if (!userId || !title || !type) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User ID, title, and type are required for notification.");
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
 * ดึงรายการการแจ้งเตือนทั้งหมดของผู้ใช้ที่ระบุ
 * @description ดึงข้อมูลโดยเรียงจากใหม่สุดไปเก่าสุด และแนบข้อมูลธุรกรรมที่เกี่ยวข้องมาด้วย (ถ้ามี)
 * @async
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของการแจ้งเตือน
 * @throws {ApiError} หากไม่ได้ระบุ `userId`
 */
const getNotificationsByUserId = async (userId: string) => {
  if (!userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User ID is required");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: userId },
    // Include transaction data for notifications that are linked to one
    include: {
      transaction: true,
    },
    // เรียงลำดับจากใหม่สุดไปเก่าสุด
    orderBy: {
      createdAt: "desc",
    },
  });
  return notifications;
};

/**
 * ดึงรายการการแจ้งเตือนของระบบ (สำหรับ Admin)
 * @description ดึงเฉพาะการแจ้งเตือนประเภท 'SYSTEM' พร้อมรองรับการแบ่งหน้าและการค้นหา
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือก
 * @param {number} [options.page=1] - เลขหน้า
 * @param {number} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.search] - คำค้นหาสำหรับ title และ body
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลและสถานะการแบ่งหน้า
 */
const getSystemNotifications = async (options: any = {}) => {
  // 1. กำหนดค่าเริ่มต้นสำหรับ options
  const { page = 1, pageSize = 10, search } = options;

  // 2. เตรียมตัวแปรสำหรับ Pagination
  const take = parseInt(pageSize, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  // 3. สร้างเงื่อนไขการค้นหา (Where Clause)
  // โดย "บังคับ" ให้ type เป็น 'SYSTEM' เสมอ
  const where: Prisma.NotificationWhereInput = {
    type: "SYSTEM", // <--- Fixed Filter อยู่ตรงนี้
  };

  // เพิ่มเงื่อนไขการค้นหาถ้ามี
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  // 4. ดึงข้อมูลและนับจำนวนทั้งหมดพร้อมกันด้วย $transaction
  const [notifications, totalNotifications] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take,
      // ไม่ต้อง include ข้อมูล User แล้ว เพื่อให้ Query เร็วที่สุด
    }),
    // นับจำนวนโดยใช้เงื่อนไขเดียวกัน
    prisma.notification.count({ where }),
  ]);

  // 5. สร้าง Object สำหรับ Pagination
  const paging = {
    page: parseInt(page as string, 10),
    pageSize: take,
    total: totalNotifications,
    totalPages: Math.ceil(totalNotifications / take),
  };

  // 6. คืนค่าข้อมูล
  return {
    data: notifications,
    paging,
  };
};

/**
 * สร้างชุดการแจ้งเตือนต้อนรับมาตรฐานสำหรับผู้ใช้ใหม่
 * @description ฟังก์ชันนี้จะสร้างการแจ้งเตือน 2 รายการพร้อมกันโดยใช้ `prisma.createMany` เพื่อประสิทธิภาพ:
 * 1. การแจ้งเตือนเรื่องโบนัสต้อนรับ 100 บาท (ประเภท REWARD)
 * 2. การแจ้งเตือนข้อเสนอโบนัส 2 เท่าสำหรับการฝากเงินครั้งแรก (ประเภท SYSTEM)
 * @async
 * @param {string} userId - ID ของผู้ใช้ใหม่ที่ต้องการสร้างการแจ้งเตือนให้
 * @param {string} [welcomeTransactionId] - (ยังไม่ได้ใช้งาน) ID ของธุรกรรมโบนัสต้อนรับ (ถ้ามี)
 * @returns {Promise<void>} ฟังก์ชันนี้ไม่คืนค่าใดๆ
 * @throws {Error} ในกรณีที่การสร้างข้อมูลในฐานข้อมูลล้มเหลว
 */
const createWelcomeNotifications = async (userId: string, welcomeTransactionId?: string) => {
  if (!userId) {
    console.error("Error: userId is required to create welcome notifications.");
    return;
  }

  // 1. การแจ้งเตือน: แจกโบนัส 100 บาทสำหรับผู้ใช้ใหม่
  const welcomeBonusNotification = {
    userId: userId,
    type: NotificationType.REWARD,
    title: "💰 รับโบนัสฟรี 100 บาท!",
    body: `ยินดีต้อนรับสู่ One Wallet! เราขอมอบเงินโบนัสพิเศษ 100 บาทเข้าสู่บัญชีของคุณทันที!\n\nคุณสามารถใช้โบนัสนี้เป็นส่วนหนึ่งของการออมเพื่อพิชิตเป้าหมายการดาวน์สินค้าที่คุณต้องการได้เลย\n\n**คำเตือน:** \nเงินโบนัสนี้สามารถนำมาแลกสินค้าเพื่อเริ่มการดาวน์ได้ ไม่สามารถถอนเป็นเงินสดได้`,
  };

  const firstDepositOfferNotification = {
    userId: userId,
    type: NotificationType.SYSTEM,
    title: "💵 พิเศษ! ออมครั้งแรก รับโบนัส 2 เท่า",
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
    throw new Error("Could not create welcome notifications.");
  }
};

/**
 * แก้ไขข้อมูลการแจ้งเตือน (สำหรับ Admin)
 * @description ใช้หลัก "Whitelist" เพื่ออนุญาตให้อัปเดตเฉพาะฟิลด์ที่กำหนด (title, body, type, isRead)
 * @async
 * @param {string} notificationId - ID ของการแจ้งเตือนที่ต้องการแก้ไข
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์การแจ้งเตือนที่อัปเดตแล้ว
 * @throws {ApiError} หากไม่พบการแจ้งเตือน หรือข้อมูลนำเข้าไม่ถูกต้อง
 */
const editNotification = async (notificationId: string, payload: Prisma.NotificationUpdateInput) => {
  // 1. ตรวจสอบ Input ที่จำเป็น
  if (!notificationId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Notification ID is required.");
  }
  if (!payload || Object.keys(payload).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Update payload cannot be empty.");
  }

  // 2. ตรวจสอบว่า Notification ที่ต้องการแก้ไขมีอยู่จริงหรือไม่ เพื่อให้ Error Message ชัดเจน
  const existingNotification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existingNotification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found.");
  }

  // 3. ดึงเฉพาะฟิลด์ที่อนุญาตให้แก้ไขได้จาก payload เพื่อความปลอดภัย
  // ป้องกันการแก้ไขฟิลด์ที่ไม่ควรเปลี่ยน เช่น userId หรือ transactionId
  const { title, body, type, isRead } = payload;
  const dataToUpdate = {
    title,
    body,
    type,
    isRead,
  };

  // 4. ทำการอัปเดตข้อมูลในฐานข้อมูล
  const updatedNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: dataToUpdate,
  });

  return updatedNotification;
};

/**
 * ลบการแจ้งเตือน
 * @async
 * @param {string} notificationId - ID ของการแจ้งเตือนที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของการแจ้งเตือนที่ถูกลบไป
 * @throws {ApiError} หากไม่พบการแจ้งเตือน
 */
const deleteNotification = async (notificationId: string) => {
  // 1. ตรวจสอบ Input ที่จำเป็น
  if (!notificationId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Notification ID is required for deletion.");
  }

  // 2. ตรวจสอบว่ามี Notification นี้อยู่จริงหรือไม่ก่อนที่จะพยายามลบ
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found.");
  }

  // 3. ทำการลบข้อมูลออกจากฐานข้อมูล
  const deletedNotification = await prisma.notification.delete({
    where: { id: notificationId },
  });

  return deletedNotification;
};

/**
อัปเดตสถานะการแจ้งเตือนเป็น "อ่านแล้ว"
@async
@param {string} notificationId - ID ของการแจ้งเตือน
@returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์การแจ้งเตือนที่อัปเดตแล้ว
*/
const markNotificationAsRead = async (notificationId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");

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

/**
 * ลบการแจ้งเตือนทั้งหมดของผู้ใช้ตามประเภทที่ระบุ
 * @description ฟังก์ชันนี้ใช้ `deleteMany` เพื่อลบการแจ้งเตือนหลายรายการพร้อมกันในครั้งเดียว
 * ซึ่งมีประสิทธิภาพสูง เหมาะสำหรับใช้ในกรณีที่ผู้ใช้ต้องการ "ล้าง" การแจ้งเตือนประเภทใดประเภทหนึ่ง
 * เช่น ลบการแจ้งเตือนเกี่ยวกับ Wallet ทั้งหมด
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการล้างการแจ้งเตือน
 * @param {NotificationType} type - ประเภทของการแจ้งเตือนที่ต้องการลบ (จาก Prisma Enum)
 * @returns {Promise<{count: number}>} Promise ที่ resolve เป็นอ็อบเจกต์ซึ่งมี property `count`
 * ที่ระบุจำนวนการแจ้งเตือนที่ถูกลบไป
 */
const clearNotificationsByType = async (userId: string, type: NotificationType) => {
  const deleteResult = await prisma.notification.deleteMany({
    where: {
      userId: userId,
      type: type,
    },
  });

  return deleteResult; // `deleteResult` จะเป็น object ที่มี property `count`
};

/**
 * ส่งการแจ้งเตือนเมื่อการฝากเงินสำเร็จ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {number} amount - จำนวนเงิน
 * @param {string} transactionId - ID ธุรกรรม
 * @returns {Promise<object|undefined>}
 */
const sendDepositSuccess = async (userId: string, amount: number, transactionId: string) => {
  return createUserNotification(userId, {
    title: "✅ ฝากเงินสำเร็จ",
    body: `ยอดเงินจำนวน ${amount.toFixed(2)} บาทเข้าสู่บัญชีของคุณแล้ว`,
    type: "WALLET",
    transactionId: transactionId,
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อรายการฝากเงินถูกปฏิเสธ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {string} reason - เหตุผลที่รายการถูกปฏิเสธ (มักจะมาจาก description ของ transaction)
 * @param {string} transactionId - ID ธุรกรรมที่เกี่ยวข้อง
 * @returns {Promise<object|undefined>}
 */
const sendDepositRejected = async (userId: string, reason: string, transactionId: string) => {
  return createUserNotification(userId, {
    title: "❌ รายการถูกปฏิเสธ",
    body: reason, // ใช้เหตุผลจาก description ของ transaction ได้เลย
    type: "WALLET",
    transactionId: transactionId,
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้ทำภารกิจสำเร็จ (สถานะเปลี่ยนเป็น AWAITING_CLAIM)
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {string} missionTitle - ชื่อของภารกิจที่ทำสำเร็จ
 * @returns {Promise<object|undefined>}
 */
const sendMissionCompleted = async (userId: string, missionTitle: string) => {
  return createUserNotification(userId, {
    title: "🎉 ภารกิจสำเร็จ!",
    body: `ยินดีด้วย! คุณทำภารกิจ "${missionTitle}" สำเร็จแล้ว กดเพื่อรับรางวัลเลย!`,
    type: "REWARD",
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้กดรับรางวัลจากภารกิจสำเร็จ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {number} rewardAmount - จำนวนเงินรางวัลที่ได้รับ
 * @param {string} transactionId - ID ธุรกรรมของรางวัลที่ถูกสร้างขึ้น
 * @returns {Promise<object|undefined>}
 */
const sendRewardClaimed = async (userId: string, rewardAmount: number, transactionId: string) => {
  return createUserNotification(userId, {
    title: "💰 ได้รับรางวัลแล้ว",
    body: `คุณได้รับโบนัส ${rewardAmount.toFixed(2)} บาทเข้าสู่กระเป๋าเงินโบนัสเรียบร้อยแล้ว`,
    type: "REWARD",
    transactionId: transactionId,
  });
};

/**
 * ส่งการแจ้งเตือนต้อนรับผู้ใช้ใหม่ (เวอร์ชันย่อ)
 * @async
 * @param {string} userId - ID ของผู้ใช้ใหม่
 * @returns {Promise<object|undefined>}
 */
const sendWelcomeNotification = async (userId: string) => {
  return createUserNotification(userId, {
    title: "ยินดีต้อนรับสู่ NO1Money+ 👋",
    body: "เริ่มต้นเส้นทางการออมดาวน์เพื่อคว้าโทรศัพท์ในฝันของคุณได้เลย!",
    type: "SYSTEM",
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อรายการถอนเงินสำเร็จ
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {number} amount - จำนวนเงินที่ถอน
 * @param {string} transactionId - ID ธุรกรรมที่เกี่ยวข้อง
 * @returns {Promise<object|undefined>}
 */
const sendWithdrawSuccessNotification = async (userId: string, amount: number, transactionId: string) => {
  return createUserNotification(userId, {
    title: "✅ ถอนเงินสำเร็จ",
    body: `ยอดเงินจำนวน ${amount.toFixed(2)} บาท ได้ถูกโอนออกจากบัญชีของคุณเรียบร้อยแล้ว`,
    type: "WALLET",
    transactionId: transactionId,
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อได้รับเงินโอน
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดการโอน
 * @param {number} details.amount - จำนวนเงิน
 * @param {string} [details.fromName] - ชื่อผู้ส่ง
 * @param {string} [details.transactionId] - ID ธุรกรรม
 * @returns {Promise<object|undefined>}
 */
const sendTransferReceived = async (
  userId: string,
  {
    amount,
    fromName,
    fromPhone,
    note,
    transactionId,
  }: { amount: number; fromName?: string; fromPhone?: string; note?: string; transactionId?: string },
) => {
  const sender = fromName?.trim() || (fromPhone ? `ผู้ใช้ (${maskPhone(fromPhone)})` : "ผู้ใช้ไม่ระบุชื่อ");

  const pieces = [`ได้รับเงิน ${formatBaht(amount)} จาก ${sender}`, note ? `โน้ต: ${note}` : null].filter(Boolean);

  return createUserNotification(userId, {
    title: "📥 เงินเข้าแล้ว",
    body: pieces.join("\n"),
    type: "WALLET",
    transactionId,
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อทำการโอนเงินสำเร็จ (ส่งให้ฝั่งผู้โอน)
 * @async
 * @param {string} userId - ID ผู้ส่ง
 * @param {object} details - รายละเอียดการโอน
 * @param {number} details.amount - จำนวนเงิน
 * @param {string} [details.toName] - ชื่อผู้รับ
 * @param {string} [details.transactionId] - ID ธุรกรรม
 * @returns {Promise<object|undefined>}
 */
const sendTransferSent = async (
  userId: string,
  {
    amount,
    toName,
    toPhone,
    note,
    transactionId,
  }: { amount: number; toName?: string; toPhone?: string; note?: string; transactionId?: string },
) => {
  const receiver = toName?.trim() || (toPhone ? `ผู้ใช้ (${maskPhone(toPhone)})` : "ผู้ใช้ไม่ระบุชื่อ");

  const pieces = [`โอนเงิน ${formatBaht(amount)} ไปยัง ${receiver} สำเร็จ`, note ? `โน้ต: ${note}` : null].filter(
    Boolean,
  );

  return createUserNotification(userId, {
    title: "✅ โอนเงินสำเร็จ",
    body: pieces.join("\n"),
    type: "WALLET",
    transactionId,
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้สร้างเป้าหมายการออมใหม่
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดของเป้าหมายที่สร้างขึ้น
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @param {number} details.targetAmount - ยอดเงินเป้าหมาย
 * @param {string|Date} [details.deadline] - วันครบกำหนดเป้าหมาย (ถ้ามี)
 * @returns {Promise<object|undefined>}
 */
const sendGoalCreated = async (
  userId: string,
  { goalTitle, targetAmount, deadline }: { goalTitle: string; targetAmount: number; deadline?: string | Date },
) => {
  const lines = [
    `ตั้งเป้าหมาย "${goalTitle}" เรียบร้อย`,
    `ยอดเป้าหมายรวม ${formatBaht(targetAmount)}`,
    deadline ? `กำหนดเสร็จภายใน: ${new Date(deadline).toLocaleDateString("th-TH")}` : null,
  ].filter(Boolean);

  return createUserNotification(userId, {
    title: "🎯 เริ่มออมดาวน์แล้ว!",
    body: lines.join("\n"),
    type: "SYSTEM",
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้ออมเงินถึงจุดสำคัญ (Milestone)
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดความคืบหน้า
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @param {number} details.percent - เปอร์เซ็นต์ความสำเร็จ
 * @param {number} [details.currentAmount] - ยอดออมปัจจุบัน
 * @param {number} [details.targetAmount] - ยอดเป้าหมายรวม
 * @returns {Promise<object|undefined>}
 */
const sendGoalMilestone = async (
  userId: string,
  {
    goalTitle,
    percent,
    currentAmount,
    targetAmount,
  }: { goalTitle: string; percent: number; currentAmount?: number; targetAmount?: number },
) => {
  const lines = [
    `ออมครบ ${Math.round(percent)}% ของ "${goalTitle}" แล้ว`,
    currentAmount != null && targetAmount != null
      ? `ยอดสะสม ${formatBaht(currentAmount)} / ${formatBaht(targetAmount)}`
      : null,
  ].filter(Boolean);

  return createUserNotification(userId, {
    title: "📈 ความคืบหน้าการออม",
    body: lines.join("\n"),
    type: "SYSTEM",
  });
};

/**
 * ส่งการแจ้งเตือนเพื่อเตือนให้ผู้ใช้ออมเงินตามแผน
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดการแจ้งเตือน
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @param {number} details.amountDue - ยอดเงินที่ควรออม
 * @param {number} details.daysLeft - จำนวนวันที่เหลือก่อนถึงกำหนด
 * @returns {Promise<object|undefined>}
 */
const sendGoalDueReminder = async (
  userId: string,
  { goalTitle, amountDue, daysLeft }: { goalTitle: string; amountDue: number; daysLeft: number },
) => {
  const when = daysLeft <= 0 ? "วันนี้" : `อีก ${daysLeft} วัน`;
  return createUserNotification(userId, {
    title: "⏰ ถึงเวลาฝากออมแล้ว",
    body: `${when}ควรออม ${formatBaht(amountDue)} สำหรับ "${goalTitle}"\nกดเพื่อฝากตอนนี้เลย`,
    type: "SYSTEM",
  });
};

/**
 * ส่งการแจ้งเตือนเมื่อผู้ใช้ออมเงินบรรลุเป้าหมาย
 * @async
 * @param {string} userId - ID ผู้รับ
 * @param {object} details - รายละเอียดเป้าหมาย
 * @param {string} details.goalTitle - ชื่อเป้าหมาย
 * @returns {Promise<object|undefined>}
 */
const sendGoalAchieved = async (userId: string, { goalTitle }: { goalTitle: string }) => {
  return createUserNotification(userId, {
    title: "🏁 บรรลุเป้าหมายแล้ว!",
    body: `ยินดีด้วย คุณออมครบตามเป้าหมาย "${goalTitle}" แล้ว\nดำเนินการสั่งซื้อ/รับสิทธิ์ได้ทันที`,
    type: "SYSTEM",
  });
};

/**
 * แจ้งเตือนเมื่อไม่มีการออมมาระยะหนึ่ง (ป้องกันหลุดแผน)
 * @param {string} userId
 * @param {object} data
 * @param {number} data.days - เว้นไปกี่วันแล้วที่ไม่ได้ออม
 * @param {string} [data.goalTitle]
 */
const sendInactivityReminder = async (userId: string, { days, goalTitle }: { days: number; goalTitle?: string }) => {
  const goal = goalTitle ? ` สำหรับ "${goalTitle}"` : "";
  return createUserNotification(userId, {
    title: "📌 อย่าลืมออมต่อเนื่อง",
    body: `คุณไม่ได้ออมมา ${days} วันแล้ว${goal}\nการออมสม่ำเสมอช่วยให้ถึงเป้าหมายไวขึ้น`,
    type: "SYSTEM",
  });
};

export default {
  // สร้างการแจ้งเตือนของ userId
  createUserNotification,
  // เรียกการแจ้งเตือนของ userId
  getNotificationsByUserId,
  // เรียกการแจ้งเตือนทั้งหมดของ System (admin dashboard)
  getSystemNotifications,
  // แก้ไขการแจ้งเตือน
  editNotification,
  // ลบการแจ้งเตือน
  deleteNotification,
  // แก้ไขการแจ้งเตือนเป็นอ่านแล้ว
  markNotificationAsRead,
  // ล้างการแจ้งเตือนตามประเภท
  clearNotificationsByType,
  //ส่งการแจ้งเตือนต่างๆตามชื่อ
  sendDepositSuccess,
  sendDepositRejected,
  sendMissionCompleted,
  sendRewardClaimed,
  sendWelcomeNotification,
  sendWithdrawSuccessNotification,
  sendTransferReceived,
  sendTransferSent,
  sendGoalCreated,
  sendGoalMilestone,
  sendGoalDueReminder,
  sendGoalAchieved,
  sendInactivityReminder,
  // สร้างการแจ้งเตือนสำหรับผู้ใช้ใหม่ เขียน title, body ไว้แล้ว
  createWelcomeNotifications,
};
