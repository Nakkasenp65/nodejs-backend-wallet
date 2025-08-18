import { Router } from 'express';
import auth from '../middlewares/auth.js';
import adminController from '../controllers/admin.controller.js';
import adminAuth from '../middlewares/adminAuth.js';

const adminRoute = Router();

adminRoute.get('/', auth, adminAuth, adminController.getDashboardData);

export default adminRoute;
