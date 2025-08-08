import { Router } from 'express';
import userController from '../controllers/user.controller.js';

const userRouter = Router();

// URL/v1/user
userRouter.post('/', userController.createUser);
userRouter.get('/:userId', userController.getUserWithLineUserId);
userRouter.get('/status/:userId', userController.checkStatus);

export default userRouter;
