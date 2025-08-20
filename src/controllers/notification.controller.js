import notificationService from '../services/notification.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

// GET /api/notifications/:userId
const getNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.getNotificationsByUserId(req.params.userId);
  res.status(httpStatus.OK).json({ success: true, data: notifications });
});

// PATCH /api/notifications/:notificationId/read
const markAsRead = catchAsync(async (req, res) => {
  // สมมติว่า userId มาจาก auth middleware (req.user.id) เพื่อความปลอดภัย
  // const userId = req.user.id;
  const { notificationId } = req.params;
  const updatedNotification = await notificationService.markNotificationAsRead(notificationId);
  console.log(`update transaction successfully: ${updatedNotification.title} : is Read: ${updatedNotification.isRead}`);
  res.status(httpStatus.OK).json({ success: true, data: updatedNotification });
});

// DELETE /api/notifications/clear/:userId
const clearNotifications = catchAsync(async (req, res) => {
  const userId = req.params.userId;
  const type = req.query.type;
  const result = await notificationService.clearNotificationsByType(userId, type);
  console.log('Delete notifications successfully!');
  res.status(httpStatus.OK).json({ success: true, message: `${result.count} notifications cleared.`, data: result });
});

const getSystemNotifications = catchAsync(async (req, res) => {
  const notifications = await notificationService.getSystemNotifications(req.query);
  res.status(httpStatus.OK).json(notifications);
});

const createSystemNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createSystemNotification(req.body);
  res.status(httpStatus.CREATED).json(notification);
});

const editNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.editNotification(req.params.notificationId, payload);
  res.status(httpStatus.OK).json(notification);
});

const deleteNotification = catchAsync(async (req, res) => {
  const deletedNotification = await notificationService.deleteNotification(req.params.notificationId);
  res.status(httpStatus.OK).json(deletedNotification);
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
