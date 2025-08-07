import slipService from '../services/slip.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

const slipVerify = catchAsync(async (req, res) => {
  console.log('slip qStash', req.body);
  const { slipImageUrl, transactionId } = req.body;
  const verifyresult = await slipService.verfifySlip(slipImageUrl, transactionId);
  res.status(httpStatus.OK).json(verifyresult);
});

export default { slipVerify };
