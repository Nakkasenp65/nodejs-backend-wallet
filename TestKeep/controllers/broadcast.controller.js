import broadcastService from '../services/broadcast.service.js'; // ตรวจสอบ path ให้ถูกต้อง
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

/**
 * @description (Admin) ดึงข้อมูล Broadcast ทั้งหมด พร้อม Pagination และ Search
 * @route GET /v1/admin/broadcasts
 */
const getBroadcasts = catchAsync(async (req, res) => {
  // รับ options (page, pageSize, search) จาก query string
  const result = await broadcastService.getBroadcasts(req.query);
  res.status(httpStatus.OK).json(result);
});

/**
 * @description (Admin) สร้าง Broadcast ฉบับร่าง (Draft) ใหม่
 * @route POST /v1/admin/broadcasts
 */
const createBroadcast = catchAsync(async (req, res) => {
  // รับ payload (title, body) จาก request body
  const newBroadcast = await broadcastService.createBroadcast(req.body);
  res.status(httpStatus.CREATED).json(newBroadcast);
});

/**
 * @description (Admin) อัปเดต/แก้ไขข้อมูล Broadcast
 * @route PATCH /v1/admin/broadcasts/:broadcastId
 */
const updateBroadcast = catchAsync(async (req, res) => {
  const { broadcastId } = req.params;
  const updatedBroadcast = await broadcastService.updateBroadcast(broadcastId, req.body);
  res.status(httpStatus.OK).json(updatedBroadcast);
});

/**
 * @description (Admin) ลบ Broadcast
 * @route DELETE /v1/admin/broadcasts/:broadcastId
 */
const deleteBroadcast = catchAsync(async (req, res) => {
  const { broadcastId } = req.params;
  await broadcastService.deleteBroadcast(broadcastId);
  // ส่ง status 204 No Content กลับไปเมื่อลบสำเร็จ
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * @description (Admin) ส่ง Broadcast ไปยังผู้ใช้ทุกคน
 * @route POST /v1/admin/broadcasts/:broadcastId/send
 */
const sendBroadcast = catchAsync(async (req, res) => {
  const { broadcastId } = req.params;
  const result = await broadcastService.sendBroadcastToAllUsers(broadcastId);
  res.status(httpStatus.OK).json(result);
});

export default {
  getBroadcasts,
  createBroadcast,
  updateBroadcast,
  deleteBroadcast,
  sendBroadcast,
};
