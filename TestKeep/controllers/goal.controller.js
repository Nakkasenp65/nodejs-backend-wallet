import goalService from '../services/goal.service.js'; // 1. Import goalService
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

const createGoal = catchAsync(async (req, res, next) => {
  console.log('Log Check: ', req.params.userId, ' Body: ', req.body);
  const { userId } = req.params;
  const newGoal = await goalService.createGoalForUser(userId, req.body);
  res.status(httpStatus.CREATED).json(newGoal);
});

const getUserGoal = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const goal = await goalService.getUserGoal(userId);
  res.status(httpStatus.OK).json(goal);
});

const updateGoal = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const { planId, productId } = req.body;
  const updatedGoal = await goalService.updateGoalForUser(userId, { planId, productId });
  res.status(httpStatus.OK).json(updatedGoal);
});

export default {
  createGoal,
  updateGoal,
  getUserGoal,
};
