import prisma from '../libs/prisma.js';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const createTransaction = async (userId, transactionData) => {
  const user = await prisma.user.findUnique({
    where: {
      userId: userId,
    },
    include: {
      wallet: true,
    },
  });

  if (!user.wallet) {
    throw new ApiErrorError(httpStatus.NOT_FOUND, 'Wallet not found for the user.');
  }

  const dataToCreate = {
    ...transactionData,
    walletId: user.wallet.id,
  };

  console.log(dataToCreate);

  const newTransaction = await prisma.transaction.create({
    data: dataToCreate,
  });

  return newTransaction;
};

const getTransactions = async (userId, options = {}) => {
  const user = await prisma.user.findUnique({
    where: { userId: userId },
    include: { wallet: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wallet not found for the user.');
  }

  const whereClause = {
    walletId: user.wallet.id,
  };

  if (options.year && options.month !== undefined) {
    const year = parseInt(options.year, 10);
    const month = parseInt(options.month, 10); // month จาก JS คือ 0-11

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    whereClause.createdAt = {
      gte: startDate,
      lt: endDate,
    };
  }
  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return transactions;
};
export default { createTransaction, getTransactions };
