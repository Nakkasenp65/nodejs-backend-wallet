import slipService from '../services/slip.service.js';
import transactionService from '../services/transaction.service.js';
import notificationService from '../services/notification.service.js';
import userMissionService from '../services/userMission.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';

const slipVerify = catchAsync(async (req, res) => {
  const { userId, slipImageUrl, transactionId } = req.body;

  const verifyResult = await slipService.verfifySlip(slipImageUrl, transactionId);
  const verifiedAmount = verifyResult?.data?.amount;
  const verificationCode = verifyResult.code;

  const updatedTransaction = await transactionService.updateTransaction(
    verificationCode,
    transactionId,
    verifiedAmount,
  );

  if (updatedTransaction.status === 'SUCCESS') {
    await notificationService.sendDepositSuccess(userId, updatedTransaction.verifiedAmount, updatedTransaction.id);
    await userMissionService.checkAndUpdateMissionProgress(userId, 'DEPOSIT_SUCCESS', {
      amount: updatedTransaction.verifiedAmount,
    });
  } else if (updatedTransaction.status === 'REJECTED') {
    // ส่ง Notification "รายการถูกปฏิเสธ"
    await notificationService.sendDepositRejected(
      userId,
      updatedTransaction.description, // ใช้เหตุผลจาก description ที่เราสร้างไว้ใน service
      updatedTransaction.id,
    );
  }

  res.status(httpStatus.OK).json({
    message: `Transaction ${transactionId} processed with status: ${updatedTransaction.status}`,
    data: updatedTransaction,
  });
});

export default { slipVerify };
