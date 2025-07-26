import planController from '../controllers/plan.controller.js';
import { Router } from 'express';

const planRouter = Router();

planRouter.get('/', planController.getPlans);

export default planRouter;
