import { Router } from 'express';
import userMissionController from '../controllers/userMission.controller.js';
// import auth from '../middlewares/auth.js';

const userMissionRouter = Router();

// ทุก Route ในนี้ควรต้องผ่านการยืนยันตัวตน
// userMissionRouter.use(auth);

userMissionRouter.post('/enroll', userMissionController.enrollInMission);
userMissionRouter.post('/claim', userMissionController.claimMissionReward);
userMissionRouter.get('/:userId', userMissionController.getMyMissions);
userMissionRouter.get('/:userMissionId', userMissionController.getMyMissionDetails);

export default userMissionRouter;
