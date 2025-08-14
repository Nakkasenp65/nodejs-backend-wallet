import { Router } from 'express';
import userController from '../controllers/user.controller.js';

const userRouter = Router();

// API/v1/user/userRouter
userRouter.post('/', userController.createUser);
userRouter.post('/refer', userController.createReferral);
userRouter.patch('/:userId', userController.updateUser);
userRouter.get('/:line_user_id', userController.getUser);
userRouter.get('/status/:line_user_id', userController.checkStatus);
userRouter.get('/by-phone/:phoneNumber', userController.findUserByPhone);
userRouter.get('/referral/:line_user_id', userController.getReferralHistory);
userRouter.get('/lock/:line_user_id', userController.getLockStatus);
userRouter.post('/lock/:line_user_id', userController.setLocked);
userRouter.post('/unlock', userController.unlock);

export default userRouter;
