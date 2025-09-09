import { Router } from 'express';
import userController from './user.controller.js';
import auth from '../../../middlewares/auth.js';
import adminAuth from '../../../middlewares/adminAuth.js';

const userRouter = Router();

// API/v1/user/userRouter
// ดึงข้อมูลมาพร้อม relation
userRouter.get('/:line_user_id', auth, userController.getUser);
userRouter.post('/', userController.createUser);
userRouter.post('/refer', userController.createReferral);
userRouter.patch('/:userId', auth, adminAuth, userController.updateUser);
userRouter.get('/status/:line_user_id', userController.checkStatus);
userRouter.get('/by-phone/:phoneNumber', userController.findUserByPhone);
userRouter.get('/referral/:line_user_id', userController.getReferralHistory);
userRouter.get('/lock/:line_user_id', userController.getLockStatus);
userRouter.post('/lock/:line_user_id', userController.setLocked);
userRouter.post('/unlock', userController.unlock);

export default userRouter;
