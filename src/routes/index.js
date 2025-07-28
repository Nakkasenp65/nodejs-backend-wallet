import express from 'express';
import userRouter from './user.route.js';
import goalRouter from './goal.route.js';
import transactionRouter from './transaction.route.js';
import planRouter from './plan.route.js';
import notificationRouter from './notification.route.js';

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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
