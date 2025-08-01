import missionController from '../controllers/mission.controller.js';
import { Router } from 'express';
import validate from '../middlewares/validate.js';

const missionRouter = Router();

missionRouter.get('/', missionController.getActiveMissions);
missionRouter.post('/', missionController.createMission);

export default missionRouter;
