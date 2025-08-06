import slipService from '../services/slip.service.js';
import catchAsync from '../utils/catchAsync.js';

const slipVerify = catchAsync(async (req, res) => {
  console.log('slip qStash', req.body);
  const { slipImageUrl, transactionId } = req.body;
  const verifyresult = await slipService.verfifySlip(slipImageUrl, transactionId);
  console.log(verifyresult);
});

export default { slipVerify };
