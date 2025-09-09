import planService from '../services/plan.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

const getPlans = catchAsync(async (req, res, next) => {
  const plans = await planService.getPlans();
  res.status(httpStatus.OK).json(plans);
});

export default { getPlans };
