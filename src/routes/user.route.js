import { Router } from 'express';
import userController from '../controllers/user.controller.js';

const userRouter = Router();

// URL/v1/user
userRouter.post('/', userController.createUser);
userRouter.patch('/:mongoId', userController.updateUser);
userRouter.get('/:userId', userController.getUserWithLineUserId);
userRouter.get('/status/:userId', userController.checkStatus);
userRouter.get('/by-phone/:phoneNumber', userController.findUserByPhone);

export default userRouter;
