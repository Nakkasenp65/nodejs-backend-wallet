import prisma from '../libs/prisma.js';

const confirmWalletAmount = async (amount, transactionId) => {
  const floatAmount = parseFloat(amount);
  const updatedTransaction = await prisma.transaction.update({
    where: {
      id: transactionId,
    },
    data: {
      amount: floatAmount,
      verified: true,
      verifiedAmount: floatAmount,
      status: 'SUCCESS',
      description: `รายการได้รับการตรวจสอบแล้ว ยอด: ${floatAmount}`,
      wallet: {
        update: {
          balance: {
            increment: floatAmount,
          },
        },
      },
    },
    include: {
      wallet: true,
    },
  });
  return updatedTransaction;
};

export default { confirmWalletAmount };
