import { Router } from 'express';
import auth from '../middlewares/auth.js';
import adminController from '../controllers/admin.controller.js';
import adminAuth from '../middlewares/adminAuth.js';
import userController from '../controllers/user.controller.js';
import missionController from '../controllers/mission.controller.js';

const adminRoute = Router();

adminRoute.get('/', auth, adminAuth, adminController.getDashboardData);
adminRoute.get('/transactions', auth, adminAuth, adminController.getTransactions);
adminRoute.patch('/transactions/:transactionId', auth, adminAuth, adminController.editTransaction);
adminRoute.get('/users', auth, adminAuth, userController.getUsers);
adminRoute.get('/users/:line_user_id', auth, adminAuth, userController.getUser);
adminRoute.patch('users/:userId', auth, adminAuth, adminController.editUser);
adminRoute.get('/missions', auth, adminAuth, adminController.getMissions);
adminRoute.post('/missions', auth, adminAuth, missionController.createMission);
adminRoute.patch('/missions/:missionId', auth, adminAuth, missionController.editMission);
adminRoute.delete('/missions/:missionId', auth, adminAuth, missionController.deleteMission);

export default adminRoute;
