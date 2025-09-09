import goalController from '../controllers/goal.controller.js';
import { Router } from 'express';
import validate from '../middlewares/validate.js';
import goalValidation from '../validations/goal.validation.js';
import auth from '../middlewares/auth.js';

const goalRouter = Router();

goalRouter.post('/:userId', auth, goalController.createGoal);
goalRouter.get('/:userId', auth, goalController.getUserGoal);
goalRouter.patch('/:userId', auth, goalController.updateGoal);

export default goalRouter;
