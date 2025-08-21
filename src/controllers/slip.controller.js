import slipService from '../services/slip.service.js';
import transactionService from '../services/transaction.service.js';
import notificationService from '../services/notification.service.js';
import userMissionService from '../services/userMission.service.js';
import catchAsync from '../utils/catchAsync.js';
import httpStatus from 'http-status';
import userService from '../services/user.service.js';
import lineService from '../services/line.service.js';

const slipVerify = catchAsync(async (req, res) => {
  const { userId, slipImageUrl, transactionId } = req.body; // mongo id : prisma id fielnd

  // ตรวจสอบสลิปด้วย url รูป
  const verifyResult = await slipService.verfifySlip(slipImageUrl, transactionId);
  console.log('Slip verification success: ');
  console.dir(verifyResult);
  const verifiedAmount = verifyResult.data.amount;
  const verifiedSenderBankNumber = verifyResult.data.sender.account.bank.account;
  const verifiedSenderBankName = verifyResult.data.sender.bank.name;
  const verificationCode = verifyResult.code;
  const verifiedTransferer = verifyResult.data.sender.account.name;

  // อัพเดทรายการตามสถานะการตรวจ
  const updatedTransaction = await transactionService.updateTransaction(
    verificationCode,
    transactionId,
    verifiedAmount,
    verifiedTransferer,
  );
  // เป็นรายการที่สำเร็จหรือไม่
  if (updatedTransaction.status === 'SUCCESS') {
    // ส่งแจ้งเตือนการอัพเดท
    await notificationService.sendDepositSuccess(userId, updatedTransaction.verifiedAmount, updatedTransaction.id);
    // ตรวจสอบภารกิจสำหรับการฝากเงินสำเร็จ (ฝากเงินรายวัน / ฝากเงินสะสม)
    await userMissionService.checkAndUpdateMissionProgress(userId, 'DEPOSIT_SUCCESS', {
      amount: updatedTransaction.verifiedAmount,
    });
    // ส่ง Flex message รายการสำเร็จ
    await lineService.sendDepositFlexMessage(
      userId,
      verifiedTransferer,
      verifiedSenderBankNumber,
      verifiedSenderBankName,
      verifiedAmount,
      updatedTransaction.updatedAt,
    );
  } else if (updatedTransaction.status === 'REJECTED') {
    // ส่งแจ้งเตือน "รายการถูกปฏิเสธ"
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
