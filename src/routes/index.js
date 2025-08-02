import express from 'express';
import userRouter from './user.route.js';
import goalRouter from './goal.route.js';
import transactionRouter from './transaction.route.js';
import planRouter from './plan.route.js';
import notificationRouter from './notification.route.js';
import productRouter from './product.route.js';
import missionRouter from './mission.route.js';
import walletRouter from './wallet.route.js';

const router = express.Router();

//BASE_URL/v1 + /user

const defaultRoutes = [
  {
    path: '/user',
    route: userRouter,
  },
  {
    path: '/goal',
    route: goalRouter,
  },
  {
    path: '/transaction',
    route: transactionRouter,
  },
  {
    path: '/plan',
    route: planRouter,
  },
  {
    path: '/notification',
    route: notificationRouter,
  },
  { path: '/product', route: productRouter },
  { path: '/mission', route: missionRouter },
  { path: '/wallet', route: walletRouter },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
