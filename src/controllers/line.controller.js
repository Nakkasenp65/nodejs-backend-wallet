import lineService from '../services/line.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

const sendFlexMessage = catchAsync(async (req, res) => {
  const date = new Date('2025-08-21T11:18:33.602Z');
  const response = await lineService.sendDepositFlexMessage(
    '68a05de8beea7095b825bfff',
    'MR. Nakasen P',
    'xxx-x-x9320-x',
    'กสิกรไทย',
    120,
    date,
  );
  res.status(httpStatus.OK).json(response);
});

export default {
  sendFlexMessage,
};
