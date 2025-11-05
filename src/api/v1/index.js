import express from "express";
import adminRoute from "./admins/admin.route.js";
import userRouter from "./users/user.route.js";
import transactionRouter from "./transactions/transaction.route.js";
import missionRouter from "./missions/mission.route.js";
import userMissionRouter from "./user-missions/user-mission.route.js";
import goalRouter from "./goals/goal.route.js";
import planRouter from "./plans/plan.route.js";
import notificationRouter from "./notifications/notification.route.js";
import productRouter from "./products/product.route.js";
import walletRouter from "./wallets/wallet.route.js";
import slipRouter from "./slips/slip.route.js";
import cronRouter from "./cron/cron.route.js";
import healthRouter from "./health/health.route.js";

const v1Router = express.Router();

v1Router.use("/health", healthRouter);
v1Router.use("/admin", adminRoute);
v1Router.use("/user", userRouter);
v1Router.use("/transaction", transactionRouter);
v1Router.use("/mission", missionRouter);
v1Router.use("/user-mission", userMissionRouter);
v1Router.use("/goal", goalRouter);
v1Router.use("/plan", planRouter);
v1Router.use("/notification", notificationRouter);
v1Router.use("/product", productRouter);
v1Router.use("/wallet", walletRouter);
v1Router.use("/slip", slipRouter);
v1Router.use("/cron", cronRouter);

export default v1Router;
