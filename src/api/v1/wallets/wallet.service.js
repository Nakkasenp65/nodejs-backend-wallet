import prisma from '../../../libs/prisma.js';

/**
 * ยืนยันยอดเงินของ Transaction, อัปเดตสถานะ, และเพิ่มเงินเข้า Wallet
 * @param {number | string} amount - จำนวนเงินที่ตรวจสอบได้
 * @param {string} transactionId - ID ของ Transaction ที่จะอัปเดต
 * @returns {Promise<object>} - Transaction ที่อัปเดตแล้ว
 * @throws {ApiError} - หาก Transaction ไม่พบ, ไม่ได้อยู่ในสถานะที่ถูกต้อง, หรือการอัปเดตล้มเหลว
 */
const confirmWalletAmount = async (transactionVerification, transactionId, amount) => {
  // --- Best Practice 1: ตรวจสอบและแปลงข้อมูลนำเข้าอย่างเข้มงวด ---
  const floatAmount = parseFloat(amount);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid amount provided. Amount must be a positive number.');
  }

  // --- Best Practice 2: ใช้ Transaction ของฐานข้อมูลเพื่อความปลอดภัย ---
  // การใช้ prisma.$transaction ทำให้แน่ใจว่าการอัปเดต Transaction และ Wallet
  // จะสำเร็จหรือล้มเหลวไปพร้อมกันทั้งหมด (Atomicity)
  // ป้องกันกรณีที่อัปเดต Transaction สำเร็จแต่เพิ่มเงินเข้า Wallet ไม่สำเร็จ
  const updatedTransaction = await prisma.$transaction(async (tx) => {
    // 2.1 ค้นหา Transaction ที่ต้องการอัปเดตก่อน
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    // 2.2 ตรวจสอบเงื่อนไขก่อนการอัปเดต
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found.');
    }
    // (สำคัญ) ป้องกันการอัปเดตซ้ำซ้อน
    if (transaction.status !== 'PENDING') {
      throw new ApiError(httpStatus.CONFLICT, `Transaction is already processed with status: ${transaction.status}`);
    }

    // 2.3 อัปเดต Wallet ก่อน (หรือพร้อมกัน)
    // เราจะใช้ walletId ที่ผูกอยู่กับ transaction ที่ดึงมา เพื่อความปลอดภัย
    await tx.wallet.update({
      where: {
        id: transaction.walletId,
      },
      data: {
        balance: {
          increment: floatAmount,
        },
      },
    });

    // 2.4 อัปเดต Transaction
    const confirmedTransaction = await tx.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        amount: floatAmount,
        verified: true,
        verifiedAmount: floatAmount,
        status: 'SUCCESS',
        description: `รายการได้รับการตรวจสอบและยืนยันยอดเงินจำนวน: ${floatAmount} บาท`,
      },
      include: {
        wallet: true, // include wallet เพื่อให้ได้ข้อมูลล่าสุดกลับไป
      },
    });

    return confirmedTransaction;
  });

  // (Optional) ณ จุดนี้ คุณสามารถส่ง Notification หรือ Trigger event อื่นๆ ได้
  // await notificationService.sendDepositSuccess(updatedTransaction.wallet.userId, floatAmount);
  // await missionService.checkAndUpdateProgress(updatedTransaction.wallet.userId, floatAmount);

  return updatedTransaction;
};

const getUserWallet = async (userId) => {
  if (!userId) throw new ApiError(httpStatus.BAD_REQUEST);
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
  });
  return wallet;
};
export default { confirmWalletAmount, getUserWallet };
