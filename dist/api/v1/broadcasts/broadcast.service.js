/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับการส่งข้อความประกาศ (Broadcast)
 * @description ไฟล์นี้รวบรวมฟังก์ชันสำหรับผู้ดูแลระบบในการสร้าง, จัดการ, และส่งข้อความประกาศ
 * ซึ่งจะถูกแปลงไปเป็นการแจ้งเตือน (Notification) ส่วนบุคคลสำหรับผู้ใช้ทุกคนในระบบ
 * @module services/broadcast
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 */
import prisma from "../../../libs/prisma.js";
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";
/**
 * (Admin) สร้างข้อความประกาศฉบับร่าง (Draft) ใหม่
 * @description สร้างบันทึก Broadcast ใหม่ในฐานข้อมูลด้วยสถานะเริ่มต้นเป็น 'DRAFT'
 * @async
 * @param {object} payload - อ็อบเจกต์ข้อมูลสำหรับสร้างข้อความประกาศ
 * @param {string} payload.title - หัวข้อของข้อความประกาศ
 * @param {string} [payload.body] - เนื้อหาของข้อความประกาศ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Broadcast ที่สร้างขึ้นใหม่
 * @throws {ApiError} หากไม่ได้ระบุ `title`
 */
const createBroadcast = async (payload) => {
    const { title, body } = payload;
    if (!title) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Title is required.");
    }
    const broadcast = await prisma.broadcast.create({
        data: { title, body, status: "DRAFT" },
    });
    return broadcast;
};
/**
 * (Admin) ดึงรายการข้อความประกาศทั้งหมดสำหรับหน้าจัดการ
 * @description รองรับการแบ่งหน้า (Pagination) และการค้นหา (Search) จาก title และ body
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกสำหรับ Query
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ที่ประกอบด้วยข้อมูลข้อความประกาศและข้อมูลการแบ่งหน้า
 */
const getBroadcasts = async (options = {}) => {
    const { page = 1, pageSize = 10, search } = options;
    const take = parseInt(pageSize, 10);
    const skip = (parseInt(page, 10) - 1) * take;
    const where = {};
    if (search) {
        where.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { body: { contains: search, mode: "insensitive" } },
        ];
    }
    const [broadcasts, total] = await prisma.$transaction([
        prisma.broadcast.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
        prisma.broadcast.count({ where }),
    ]);
    const paging = { page: parseInt(page, 10), pageSize: take, total, totalPages: Math.ceil(total / take) };
    return { data: broadcasts, paging };
};
/**
 * (Admin) แก้ไขข้อความประกาศ
 * @async
 * @param {string} broadcastId - ID ของข้อความประกาศที่ต้องการแก้ไข
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Broadcast ที่อัปเดตแล้ว
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
 * (Admin) ลบข้อความประกาศ
 * @async
 * @param {string} broadcastId - ID ของข้อความประกาศที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ของ Broadcast ที่ถูกลบไป
 */
const deleteBroadcast = async (broadcastId) => {
    const broadcast = await prisma.broadcast.delete({ where: { id: broadcastId } });
    return broadcast;
};
/**
 * (Admin) **ฟังก์ชันสำคัญ:** ส่งข้อความประกาศไปยังผู้ใช้ทุกคนในระบบแบบ Atomic Operation
 * @description กระบวนการนี้จะทำงานภายใน `prisma.$transaction` เพื่อรับประกันความถูกต้องของข้อมูล:
 * 1. ดึงข้อมูล Broadcast ต้นฉบับและตรวจสอบว่ายังไม่เคยถูกส่ง
 * 2. ดึง ID ของผู้ใช้ทั้งหมดในระบบ
 * 3. ใช้ `prisma.notification.createMany` เพื่อสร้าง Notification ส่วนบุคคลสำหรับผู้ใช้ทุกคนในคำสั่งเดียว
 * 4. อัปเดตสถานะของ Broadcast ต้นฉบับเป็น 'SENT' พร้อมบันทึกเวลาและจำนวนผู้รับ
 * @async
 * @param {string} broadcastId - ID ของ Broadcast ที่ต้องการส่ง
 * @returns {Promise<{message: string}>} Promise ที่ resolve เป็นข้อความสรุปผลการดำเนินการ
 * @throws {ApiError} หากไม่พบ Broadcast หรือเคยถูกส่งไปแล้ว
 */
const sendBroadcastToAllUsers = async (broadcastId) => {
    // 1. ใช้ transaction เพื่อให้แน่ใจว่าทุกอย่างสำเร็จพร้อมกัน
    return prisma.$transaction(async (tx) => {
        // 2. ดึงข้อมูล Broadcast ต้นฉบับ
        const broadcast = await tx.broadcast.findUnique({ where: { id: broadcastId } });
        if (!broadcast || broadcast.status === "SENT") {
            throw new ApiError(httpStatus.BAD_REQUEST, "Broadcast not found or already sent.");
        }
        // 3. ดึง ID ของผู้ใช้ทั้งหมดในระบบ
        const users = await tx.user.findMany({
            select: { id: true }, // ดึงแค่ ID เพื่อประสิทธิภาพ
        });
        if (users.length === 0) {
            return { message: "No users to send to." };
        }
        // 4. เตรียมข้อมูล Notification ที่จะสร้างสำหรับผู้ใช้ทุกคน
        const notificationsToCreate = users.map((user) => ({
            title: broadcast.title,
            body: broadcast.body,
            type: "SYSTEM", // กำหนดให้เป็น SYSTEM
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
                status: "SENT",
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
//# sourceMappingURL=broadcast.service.js.map