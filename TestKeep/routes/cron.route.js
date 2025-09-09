import { Router } from 'express';
import cronController from '../controllers/cron.controller.js';

const cronRouter = Router();

cronRouter.post('/expire-missions', cronController.handleExpireMissions);

export default cronRouter;
