import express from 'express';
import notificationController from './notification.controller.js';

const notificationRouter = express.Router();

notificationRouter.get('/:userId', notificationController.getNotifications);
notificationRouter.patch('/:notificationId/read', notificationController.markAsRead);
notificationRouter.delete('/clear/:userId', notificationController.clearNotifications);

export default notificationRouter;
