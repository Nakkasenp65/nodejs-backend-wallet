/**
 * @file คอนโทรลเลอร์สำหรับจัดการคำขอ (HTTP Requests) ที่เกี่ยวข้องกับการแจ้งเตือน (Notification)
 * @description ไฟล์นี้ทำหน้าที่รับคำขอจาก Client ทั้งในฝั่งผู้ใช้ (User) และผู้ดูแลระบบ (Admin),
 * เรียกใช้ Notification Service ที่เหมาะสมเพื่อจัดการตรรกะ, และส่งผลลัพธ์กลับไปเป็น HTTP Response
 * @module controllers/notification
 * @requires services/notification.service - Service สำหรับจัดการตรรกะของ Notification
 * @requires utils/catchAsync - Utility สำหรับดักจับข้อผิดพลาดใน Asynchronous functions
 * @requires http-status - Library สำหรับจัดการ HTTP status codes
 */
import { Request, Response } from "express";
import { NotificationType } from "../../../generated/prisma/index";
import notificationService from "./notification.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import httpStatus from "http-status";

/**
 * คอนโทรลเลอร์สำหรับดึงรายการการแจ้งเตือนทั้งหมดของผู้ใช้
 * @description รับ `userId` จาก URL parameters, เรียกใช้ Service เพื่อดึงข้อมูล,
 * และส่งรายการการแจ้งเตือนกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getNotifications = catchAsync(async (req: Request, res: Response) => {
    const notifications = await notificationService.getNotificationsByUserId(req.params.userId);
    res.status(httpStatus.OK).json({ success: true, data: notifications });
});

/**
 * คอนโทรลเลอร์สำหรับอัปเดตสถานะการแจ้งเตือนเป็น "อ่านแล้ว"
 * @description รับ `notificationId` จาก URL parameters, เรียกใช้ Service เพื่ออัปเดตสถานะ,
 * และส่งข้อมูลการแจ้งเตือนที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.notificationId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const markAsRead = catchAsync(async (req: Request, res: Response) => {
    // สมมติว่า userId มาจาก auth middleware (req.user.id) เพื่อความปลอดภัย
    // const userId = req.user.id;
    const { notificationId } = req.params;
    const updatedNotification = await notificationService.markNotificationAsRead(notificationId);
    console.log(`update transaction successfully: ${updatedNotification.title} : is Read: ${updatedNotification.isRead}`);
    res.status(httpStatus.OK).json({ success: true, data: updatedNotification });
});

/**
 * คอนโทรลเลอร์สำหรับล้างการแจ้งเตือนของผู้ใช้ตามประเภท
 * @description รับ `userId` จาก URL parameters และ `type` จาก Query String,
 * เรียกใช้ Service เพื่อลบการแจ้งเตือน, และส่งผลลัพธ์การดำเนินการกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.userId` และ `req.query.type`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const clearNotifications = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const type = req.query.type as NotificationType;
    const result = await notificationService.clearNotificationsByType(userId, type);
    console.log("Delete notifications successfully!");
    res.status(httpStatus.OK).json({ success: true, message: `${result.count} notifications cleared.`, data: result });
});

/**
 * คอนโทรลเลอร์สำหรับดึงรายการการแจ้งเตือนของระบบ (สำหรับ Admin)
 * @description รับเงื่อนไขการแบ่งหน้าและการค้นหาจาก Query String, เรียกใช้ Service,
 * และส่งรายการการแจ้งเตือนพร้อมข้อมูลการแบ่งหน้ากลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.query` (page, pageSize, search)
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const getSystemNotifications = catchAsync(async (req: Request, res: Response) => {
    const options = req.query;
    const notifications = await notificationService.getSystemNotifications(options);
    res.status(httpStatus.OK).json(notifications);
});

/**
 * คอนโทรลเลอร์สำหรับสร้างการแจ้งเตือนของระบบ (สำหรับ Admin)
 * @description รับข้อมูลการแจ้งเตือนจาก Request Body, เรียกใช้ Service,
 * และส่งข้อมูลการแจ้งเตือนที่สร้างใหม่กลับไปพร้อมสถานะ 201 (Created)
 * @param {object} req - อ็อบเจกต์ Express Request ที่มีข้อมูลใน `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const createSystemNotification = catchAsync(async (req: Request, res: Response) => {
    const notificationPayload = req.body;
    const notification = await notificationService.createSystemNotification(notificationPayload);
    res.status(httpStatus.CREATED).json(notification);
});

/**
 * คอนโทรลเลอร์สำหรับแก้ไขการแจ้งเตือน (สำหรับ Admin)
 * @description รับ `notificationId` จาก URL parameters และข้อมูลสำหรับอัปเดตจาก Request Body,
 * เรียกใช้ Service, และส่งข้อมูลการแจ้งเตือนที่อัปเดตแล้วกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.notificationId` และ `req.body`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const editNotification = catchAsync(async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const notificationPayload = req.body;
    const notification = await notificationService.editNotification(notificationId, notificationPayload);
    res.status(httpStatus.OK).json(notification);
});

/**
 * คอนโทรลเลอร์สำหรับลบการแจ้งเตือนรายการเดียว
 * @description รับ `notificationId` จาก URL parameters, เรียกใช้ Service เพื่อลบ,
 * และส่งข้อมูลการแจ้งเตือนที่ถูกลบกลับไป
 * @param {object} req - อ็อบเจกต์ Express Request ที่มี `req.params.notificationId`
 * @param {object} res - อ็อบเจกต์ Express Response
 */
const deleteNotification = catchAsync(async (req: Request, res: Response) => {
    const { notificationId } = req.params;
    const deletedNotification = await notificationService.deleteNotification(notificationId);
    console.log(`Delete notification successfully: ${notificationId}`);
    res.status(httpStatus.OK).json({ success: true, data: deletedNotification });
});

export default {
    getNotifications,
    markAsRead,
    clearNotifications,
    getSystemNotifications,
    createSystemNotification,
    editNotification,
    deleteNotification,
};
