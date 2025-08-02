import walletService from '../services/wallet.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

const confirmWalletAmount = catchAsync(async (req, res) => {
  const updatedTransaction = await walletService.confirmWalletAmount(req.query.amount, req.params.transactionId);
  res.status(httpStatus.OK).json(updatedTransaction);
});

export default { confirmWalletAmount };
