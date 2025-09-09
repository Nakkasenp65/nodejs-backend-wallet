import { Router } from 'express';
import cronController from './cron.controller.js';

const cronRouter = Router();

cronRouter.post('/expire-missions', cronController.handleExpireMissions);

export default cronRouter;
