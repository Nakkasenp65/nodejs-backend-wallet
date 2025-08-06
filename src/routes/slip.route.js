import slipController from '../controllers/slip.controller.js';
import { Router } from 'express';

const slipRouter = Router();

slipRouter.post('/', slipController.slipVerify);

export default slipRouter;
