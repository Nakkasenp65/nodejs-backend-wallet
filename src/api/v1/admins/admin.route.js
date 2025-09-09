import { Router } from 'express';
import auth from '../../../middlewares/auth.js';
import adminController from './admin.controller.js';
import adminAuth from '../../../middlewares/adminAuth.js';
import userMissionController from '../user-missions/user-mission.controller.js';
import missionController from '../missions/mission.controller.js';
import broadcastController from '../broadcasts/broadcast.controller.js';
import productController from '../products/product.controller.js';
import lineController from '../lines/line.controller.js';
import userController from '../users/user.controller.js';

import multer from 'multer';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const adminRoute = Router();

// ผู้ใช้
adminRoute.get('/users', userController.getUsers);
adminRoute.get('/users/:line_user_id', userController.getUser);
adminRoute.patch('users/:userId', adminController.editUser);

//รายการการเงิน
adminRoute.get('/', adminController.getDashboardData);
adminRoute.get('/transactions', adminController.getTransactions);
adminRoute.patch('/transactions/:transactionId', upload.single('slipImage'), adminController.editTransaction);
adminRoute.delete('/transactions/:transactionId', adminController.deleteTransaction);

//ภารกิจ
adminRoute.get('/missions', adminController.getMissions);
adminRoute.get('/missions/:missionId', missionController.getMissionDetails);
adminRoute.post('/missions', missionController.createMission);
adminRoute.patch('/missions', missionController.editMission);
adminRoute.delete('/missions/:missionId', missionController.deleteMission);

//การแจ้งเตือน เป็น broadcast แทน notification (notification คือส่วนตัวมี userId อยู่)
adminRoute.get('/broadcasts', broadcastController.getBroadcasts);
adminRoute.post('/broadcasts', broadcastController.createBroadcast);
adminRoute.post('/broadcasts/:broadcastId/send', broadcastController.sendBroadcast);
adminRoute.patch('/broadcasts/:broadcastId', broadcastController.updateBroadcast);
adminRoute.delete('/broadcasts/:broadcastId', broadcastController.deleteBroadcast);

//จัดการแก้ไข เพิ่มลบ รุ่นโทรศัพท์
adminRoute.post('/products', productController.createProduct);
adminRoute.get('/products/filters', productController.getProductFilters);
adminRoute.get('/products', productController.getProducts);
adminRoute.patch('/products/:productId', productController.editProduct);
adminRoute.delete('/products/:productId', productController.deleteProduct);

adminRoute.post('/line/test/:line_user_id', lineController.sendFlexMessage);

export default adminRoute;
