import planController from './plan.controller.js';
import { Router } from 'express';
const planRouter = Router();
planRouter.get('/', planController.getPlans);
export default planRouter;
//# sourceMappingURL=plan.route.js.map