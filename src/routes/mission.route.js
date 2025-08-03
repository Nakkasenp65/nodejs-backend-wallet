// src/routes/mission.route.js

import { Router } from 'express';
import missionController from '../controllers/mission.controller.js';
import validate from '../middlewares/validate.js';
import missionValidation from '../validations/mission.validation.js';
// import auth from '../middlewares/auth.js'; // <-- **สำคัญ** คุณจะต้องมี middleware นี้

const missionRouter = Router();

// === หมายเหตุสำคัญ ===
// ทุก Route ข้างล่างนี้ควรจะถูกป้องกันด้วย Middleware Authentication (auth)
// เพื่อให้เราสามารถเข้าถึง req.user.id ได้อย่างปลอดภัย
// missionRouter.use(auth);

// POST /v1/mission/enroll - เข้าร่วมภารกิจ
missionRouter.post('/enroll', missionController.enrollInMission);
missionRouter.post('/', missionController.createNewMission);

// GET /v1/mission/available - ภารกิจที่สามารถเข้าร่วมได้
missionRouter.get('/available/:userId', missionController.getAvailableMissions);

// GET /v1/mission/my-missions - ภารกิจทั้งหมดของฉัน
missionRouter.get('/my-missions/:userId', missionController.getAllUserMissions);

// GET /v1/mission/:userMissionId - รายละเอียดภารกิจของฉัน
missionRouter.get(
  '/:userMissionId',
  validate(missionValidation.getUserMissionDetails),
  missionController.getUserMissionDetails,
);

export default missionRouter;
