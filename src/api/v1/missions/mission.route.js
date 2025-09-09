import { Router } from 'express';
import missionController from './mission.controller.js';
// import auth from '../middlewares/auth.js';
// import adminAuth from '../middlewares/adminAuth.js';

const missionRouter = Router();

// Public/User routes
missionRouter.get('/available/:userId', missionController.getAvailableMissions);
// Admin routes
missionRouter.post('/', /* adminAuth, */ missionController.createMission);
missionRouter.patch('/:missionId', /* adminAuth, */ missionController.updateMission);
missionRouter.get('/admin', /* adminAuth, */ missionController.getAllMissionsForAdmin);

export default missionRouter;
