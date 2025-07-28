import notificationService from '../services/notification.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

export const notificationController = {
  // GET /api/notifications/:userId
  getNotifications: catchAsync(async (req, res) => {
    const notifications = await notificationService.getNotificationsByUserId(req.params.userId);
    res.status(httpStatus.OK).json({ success: true, data: notifications });
  }),

  // PATCH /api/notifications/:notificationId/read
  markAsRead: catchAsync(async (req, res) => {
    // สมมติว่า userId มาจาก auth middleware (req.user.id) เพื่อความปลอดภัย
    // const userId = req.user.id;
    const { notificationId, userId } = req.params;
    const updatedNotification = await notificationService.markNotificationAsRead(notificationId, userId);
    console.log('Done!');
    res.status(httpStatus.OK).json({ success: true, data: updatedNotification });
  }),

  // DELETE /api/notifications/clear
  clearNotifications: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const type = req.query.type;
    const result = await notificationService.clearNotificationsByType(userId, type);
    res.status(httpStatus.OK).json({ success: true, message: `${result.count} notifications cleared.`, data: result });
  }),
};
