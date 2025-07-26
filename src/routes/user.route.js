import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import validate from '../middlewares/validate.js';
import userValidation from '../validations/user.validation.js';

const userRouter = Router();

// URL/v1/user
userRouter.post('/', validate(userValidation.createUser), userController.createUser);
userRouter.get('/:userId', userController.getCurrentUser);

export default userRouter;
