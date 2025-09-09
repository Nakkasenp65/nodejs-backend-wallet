import { Router } from 'express';
import auth from '../middlewares/auth.js';
import adminController from '../controllers/admin.controller.js';
import adminAuth from '../middlewares/adminAuth.js';
import userController from '../controllers/user.controller.js';
import missionController from '../controllers/mission.controller.js';
import broadcastController from '../controllers/broadcast.controller.js';
import productController from '../controllers/product.controller.js';
import lineController from '../controllers/line.controller.js';

const adminRoute = Router();

// ผู้ใช้
adminRoute.get('/users', auth, adminAuth, userController.getUsers);
adminRoute.get('/users/:line_user_id', auth, adminAuth, userController.getUser);
adminRoute.patch('users/:userId', auth, adminAuth, adminController.editUser);

//รายการการเงิน
adminRoute.get('/', auth, adminAuth, adminController.getDashboardData);
adminRoute.get('/transactions', auth, adminAuth, adminController.getTransactions);
adminRoute.patch('/transactions/:transactionId', auth, adminAuth, adminController.editTransaction);

//ภารกิจ
adminRoute.get('/missions', auth, adminAuth, adminController.getMissions);
adminRoute.get('/missions/:missionId', auth, adminAuth, missionController.getMissionDetails);
adminRoute.post('/missions', auth, adminAuth, missionController.createMission);
adminRoute.patch('/missions', auth, adminAuth, missionController.editMission);
adminRoute.delete('/missions/:missionId', auth, adminAuth, missionController.deleteMission);

//การแจ้งเตือน เป็น broadcast แทน notification (notification คือส่วนตัวมี userId อยู่)
adminRoute.get('/broadcasts', auth, adminAuth, broadcastController.getBroadcasts);
adminRoute.post('/broadcasts', auth, adminAuth, broadcastController.createBroadcast);
adminRoute.post('/broadcasts/:broadcastId/send', auth, adminAuth, broadcastController.sendBroadcast);
adminRoute.patch('/broadcasts/:broadcastId', auth, adminAuth, broadcastController.updateBroadcast);
adminRoute.delete('/broadcasts/:broadcastId', auth, adminAuth, broadcastController.deleteBroadcast);

//จัดการแก้ไข เพิ่มลบ รุ่นโทรศัพท์
adminRoute.post('/products', auth, adminAuth, productController.createProduct);
adminRoute.get('/products/filters', auth, adminAuth, productController.getProductFilters);
adminRoute.get('/products', auth, adminAuth, productController.getProducts);
adminRoute.patch('/products/:productId', auth, adminAuth, productController.editProduct);
adminRoute.delete('/products/:productId', auth, adminAuth, productController.deleteProduct);

adminRoute.post('/line/test/:line_user_id', auth, adminAuth, lineController.sendFlexMessage);

export default adminRoute;
