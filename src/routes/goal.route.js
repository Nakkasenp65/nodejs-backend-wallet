import goalController from '../controllers/goal.controller.js';
import { Router } from 'express';
import validate from '../middlewares/validate.js';
import goalValidation from '../validations/goal.validation.js';

const goalRouter = Router();

goalRouter.post('/:userId', validate(goalValidation.createGoal), goalController.createGoal);

export default goalRouter;
