// In broadcast.service.js (หรือ notification.service.js)

import prisma from '../../../libs/prisma.js';
import ApiError from '../../../utils/ApiError.js';
import httpStatus from 'http-status';

/**
 * (Admin) สร้าง Broadcast ฉบับร่าง (Draft)
 */
const createBroadcast = async (payload) => {
  const { title, body } = payload;
  if (!title) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Title is required.');
  }
  const broadcast = await prisma.broadcast.create({
    data: { title, body, status: 'DRAFT' },
  });
  return broadcast;
};

/**
 * (Admin) ดึงข้อมูล Broadcast ทั้งหมดสำหรับหน้าจัดการ
 */
const getBroadcasts = async (options = {}) => {
  const { page = 1, pageSize = 10, search } = options;
  const take = parseInt(pageSize, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  const where = {};
  if (search) {
    where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { body: { contains: search, mode: 'insensitive' } }];
  }

  const [broadcasts, total] = await prisma.$transaction([prisma.broadcast.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }), prisma.broadcast.count({ where })]);

  const paging = { page: parseInt(page, 10), pageSize: take, total, totalPages: Math.ceil(total / take) };
  return { data: broadcasts, paging };
};

/**
 * (Admin) แก้ไข Broadcast
 */
const updateBroadcast = async (broadcastId, payload) => {
  const { title, body } = payload;
  const broadcast = await prisma.broadcast.update({
    where: { id: broadcastId },
    data: { title, body },
  });
  return broadcast;
};

/**
 * (Admin) ลบ Broadcast
 */
const deleteBroadcast = async (broadcastId) => {
  const broadcast = await prisma.broadcast.delete({ where: { id: broadcastId } });
  return broadcast;
};

/**
 * (Admin) **ฟังก์ชันสำคัญ:** ส่ง Broadcast ไปยังผู้ใช้ทุกคน
 * @param {string} broadcastId - ID ของ Broadcast ที่จะส่ง
 */
const sendBroadcastToAllUsers = async (broadcastId) => {
  // 1. ใช้ transaction เพื่อให้แน่ใจว่าทุกอย่างสำเร็จพร้อมกัน
  return prisma.$transaction(async (tx) => {
    // 2. ดึงข้อมูล Broadcast ต้นฉบับ
    const broadcast = await tx.broadcast.findUnique({ where: { id: broadcastId } });
    if (!broadcast || broadcast.status === 'SENT') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Broadcast not found or already sent.');
    }

    // 3. ดึง ID ของผู้ใช้ทั้งหมดในระบบ
    const users = await tx.user.findMany({
      select: { id: true }, // ดึงแค่ ID เพื่อประสิทธิภาพ
    });
    if (users.length === 0) {
      return { message: 'No users to send to.' };
    }

    // 4. เตรียมข้อมูล Notification ที่จะสร้างสำหรับผู้ใช้ทุกคน
    const notificationsToCreate = users.map((user) => ({
      title: broadcast.title,
      body: broadcast.body,
      type: 'SYSTEM', // กำหนดให้เป็น SYSTEM
      userId: user.id,
    }));

    // 5. ใช้ `createMany` เพื่อสร้าง Notification ทั้งหมดในคำสั่งเดียว (เร็วมาก)
    const result = await tx.notification.createMany({
      data: notificationsToCreate,
    });

    // 6. อัปเดตสถานะของ Broadcast ต้นฉบับ
    await tx.broadcast.update({
      where: { id: broadcastId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentToUserCount: result.count, // `result.count` คือจำนวนที่สร้างสำเร็จ
      },
    });

    return { message: `Broadcast sent to ${result.count} users.` };
  });
};

export default {
  createBroadcast,
  getBroadcasts,
  updateBroadcast,
  deleteBroadcast,
  sendBroadcastToAllUsers,
};
