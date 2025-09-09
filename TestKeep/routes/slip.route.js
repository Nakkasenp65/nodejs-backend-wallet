import slipController from '../controllers/slip.controller.js';
import { Router } from 'express';

const slipRouter = Router();

slipRouter.post('/verify', slipController.slipVerify);

export default slipRouter;
