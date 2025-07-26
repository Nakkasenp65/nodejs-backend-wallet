import goalService from '../services/goal.service.js'; // 1. Import goalService
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';

const createGoal = catchAsync(async (req, res, next) => {
  console.log('Log Check: ', req.params.userId, ' Body: ', req.body);
  const { userId } = req.params;
  const newGoal = await goalService.createGoalForUser(userId, req.body);
  return res.status(httpStatus.CREATED).json(newGoal);
});

const updateGoal = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const updatedGoal = await goalService.updateGoalForUser(userId, req.body);
  return res.status(httpStatus.OK).json(updatedGoal);
});

export default {
  createGoal,
  updateGoal,
};
