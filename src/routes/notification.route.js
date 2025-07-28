import express from 'express';
import { notificationController } from '../controllers/notification.controller.js';

const notificationRouter = express.Router();

notificationRouter.get('/:userId', notificationController.getNotifications);
notificationRouter.patch('/:notificationId/:userId/read', notificationController.markAsRead);
notificationRouter.delete('/clear', notificationController.clearNotifications);

export default notificationRouter;
