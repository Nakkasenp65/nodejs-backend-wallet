import httpStatus from 'http-status';
import adminService from '../services/admin.service.js';
import catchAsync from '../utils/catchAsync.js';

const getDashboardData = catchAsync(async (req, res) => {
  const data = await adminService.getDashboardData();
  res.status(httpStatus.OK).json(data);
});

export default { getDashboardData };
