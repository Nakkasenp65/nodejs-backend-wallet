import goalController from "./goal.controller.js";
import { Router } from "express";
import auth from "../../../middlewares/auth.js";

const goalRouter = Router();

goalRouter.post("/:userId", auth, goalController.createGoal);
goalRouter.get("/:line_user_id", auth, goalController.getUserGoal);
goalRouter.patch("/:userId", auth, goalController.updateGoal);

export default goalRouter;
