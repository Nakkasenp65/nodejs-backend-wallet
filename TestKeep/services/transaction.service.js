import prisma from '../libs/prisma.js';
// IMPORTANT: We now need JWT from the library
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import { TransactionStatus, TransactionType } from '../generated/prisma/index.js';
import axios from 'axios';
import sendEmail from '../utils/email.js';
import crypto from 'crypto';
import userMissionService from './userMission.service.js';
import notificationService from './notification.service.js';
import buildTransactionsPdf from '../utils/pdf.js';

/**
 * สร้าง Saving Transaction ใหม่ในฐานข้อมูลหลังจากอัปโหลดสลิปสำเร็จ
 * @param {object} transactionBody - ข้อมูล transaction ที่ได้จาก req.body
 * @param {string} imageUrl - URL ของรูปภาพสลิปที่ได้จากการอัปโหลด
 * @returns {Promise<object>} - Transaction object ที่สร้างเสร็จแล้ว
 */
const createSavingTransaction = async (transactionBody, imageUrl) => {
  // 1. ดึงข้อมูลที่จำเป็นออกมาจาก transactionBody
  const { name, type, status, from, to, walletId } = transactionBody;

  // 2. ตรวจสอบว่ามี walletId ที่จำเป็นหรือไม่
  if (!walletId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Wallet ID is required to create a transaction.');
  }

  const walletUniqueId = prisma.wallet.findUnique({ where: { id: walletId }, select: { walletUniqueId: true } });

  try {
    const dataToSave = {
      name: name,
      type: type,
      status: status,
      from: from,
      to: 'WalletId: ' + walletUniqueId,
      slipImageUrl: imageUrl,
      wallet: {
        connect: { id: walletId },
      },
      amount: null,
      verified: false,
      verifiedAmount: null,
    };

    const newTransaction = await prisma.transaction.create({
      data: dataToSave,
    });

    // 5. คืนค่า Transaction ที่สร้างเสร็จแล้ว
    return newTransaction;
  } catch (error) {
    // จัดการกับ Error ที่อาจเกิดขึ้นจาก Prisma (เช่น walletId ไม่ถูกต้อง)
    console.error('Prisma error creating transaction:', error);

    if (error.code === 'P2025') {
      // Prisma error code for "Record to connect not found"
      throw new ApiError(httpStatus.NOT_FOUND, `Wallet with ID ${walletId} not found.`);
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create saving transaction in database.');
  }
};

const createSuccessedTransaction = async (name, amount, status, from, to, description, walletId) => {
  if (!name || !amount || !status || !from || !to || !description || !walletId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Information required.');
  }

  const successedTransaction = await prisma.transaction.create({
    data: {
      name,
      amount,
      type: TransactionType.REWARD,
      status,
      from,
      to,
      description,
      wallet: {
        connect: {
          id: walletId,
        },
      },
    },
    include: true,
  });

  return successedTransaction;
};

/**
 * อัปเดตสถานะ Transaction ตามผลการตรวจสอบสลิป
 * @param {string} code - โค้ดผลการตรวจสอบ ('200000', '403001', '200001')
 * @param {string} transactionId - ID ของ Transaction ที่จะอัปเดต
 * @param {number} [verifyAmount=0] - จำนวนเงินที่ตรวจสอบได้ (จำเป็นสำหรับเคส Success)
 * @returns {Promise<object>} - Transaction ที่อัปเดตแล้ว
 */
const updateTransaction = async (code, transactionId, verifyAmount = 0, senderName = '', sendBankName = '') => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      walletId: true,
      status: true,
      wallet: {
        select: {
          id: true,
          walletUniqueId: true,
          userId: true,
          balance: true,
          user: {
            select: {
              firstTime: true,
              line_display_name: true,
            },
          },
        },
      },
    },
  });

  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found.');
  }

  // สถานะที่ไม่ใช่ PENDING แสดงว่าเคยถูกประมวลผลไปแล้ว
  if (transaction.status !== 'PENDING') {
    console.warn(
      `Attempted to update an already processed transaction (ID: ${transactionId}, Status: ${transaction.status})`,
    );
    return transaction;
  }

  // อัพเดทตามสถานะจากการตรวจสอบ
  switch (code) {
    // --- CASE 3: SUCCESS ---
    case '200000': {
      const floatAmount = parseFloat(verifyAmount);

      if (isNaN(floatAmount) || floatAmount <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid amount provided for SUCCESS case: ${verifyAmount}`);
      }

      const isFirstTimeDeposit = transaction.wallet.user.firstTime;
      const updatedTransaction = await prisma.$transaction(async (tx) => {
        // ข้อมูลที่จะนำไปอัพเดท
        const walletUpdateData = {
          balance: { increment: floatAmount },
        };

        // Initialize description here to be modified later if needed
        let description = `รายการได้รับการตรวจสอบและยืนยันยอดเงินจำนวน: ${floatAmount} บาท\nชื่อผู้โอน: ${senderName}\nเลขบัญชี: ${sendBankName}`;

        // โบนัสเติมเงินครั้งแรก 2 เท่า
        if (isFirstTimeDeposit) {
          const maxBonus = 100; // Define the maximum bonus amount
          const bonusAmount = Math.min(floatAmount, maxBonus); // The bonus is the smaller of the deposit or the cap

          console.log(
            `[First Deposit Bonus] User ${transaction.wallet.userId} is making their first deposit. Adding bonus of ${bonusAmount} baht.`,
          );

          // Add the calculated bonus to the update payload
          walletUpdateData.bonusBalance = { increment: bonusAmount };

          // Update the transaction description to reflect the actual bonus given
          description += `\nคุณได้รับโบนัสเงินฝากครั้งแรก ${bonusAmount} บาท!`;

          // สร้างรายการสำหรับโบนัส
          await createSuccessedTransaction(
            `คุณได้รับโบนัสเงินฝากครั้งแรก ${bonusAmount} บาท!`,
            bonusAmount,
            TransactionStatus.SUCCESS,
            'One Wallet',
            transaction.wallet.user.line_display_name,
            `💵 พิเศษ! ออมครั้งแรก รับโบนัส 2 เท่า\n\nโบนัสเงินฝากครั้งแรก ${bonusAmount} บาท!`,
            transaction.wallet.id,
          );

          // Set firstTime to false so they don't get the bonus again
          await tx.user.update({
            where: { id: transaction.wallet.userId },
            data: { firstTime: false },
          });
        }

        // อัพเดทรายการ
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: walletUpdateData,
        });

        return tx.transaction.update({
          where: { id: transactionId },
          data: {
            from: senderName + ' ' + sendBankName,
            amount: floatAmount,
            verified: true,
            verifiedAmount: floatAmount,
            status: 'SUCCESS',
            description: description, // Use the potentially modified description
          },
          include: {
            wallet: true,
          },
        });
      });

      try {
        const newcomerId = updatedTransaction.wallet.userId;
        const newUserWalletId = updatedTransaction.wallet.id;
        // 1. Check if this is the newcomer's first successful deposit.
        const successfulTxCount = await prisma.transaction.count({
          where: {
            walletId: newUserWalletId,
            status: 'SUCCESS',
            type: 'INCOME',
          },
        });

        // มีแค่รายการเดียว
        if (successfulTxCount === 1) {
          await prisma.user.update({
            where: { id: newcomerId },
            data: { firstTime: false },
          });

          const referralRecord = await prisma.referral.findUnique({
            where: { newcomerId: newcomerId },
          });

          if (referralRecord) {
            const referrerId = referralRecord.referrerId;
            console.log(
              `[Referral Trigger] Newcomer was referred by ${referrerId}. Triggering mission update for referrer.`,
            );

            await userMissionService.checkAndUpdateMissionProgress(
              referrerId,
              'NEWCOMER_FIRST_DEPOSIT',
              { newcomerId: newcomerId }, // Pass extra data in case it's needed
            );
          } else {
            console.log(
              `[Referral Trigger] Newcomer ${newcomerId} was not referred. No referral mission update needed.`,
            );
          }
        }
      } catch (error) {
        console.error(
          `[Referral Trigger] Failed to process post-deposit referral check for TxID ${transactionId}:`,
          error,
        );
      }
      return updatedTransaction;
    }

    // --- CASE 1: UNAUTHORIZED ---
    case '403001': {
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          description: 'รายการถูกปฏิเสธ: ไม่พบชื่อบัญชีผู้รับที่ตรงกับที่ระบุไว้',
          amount: 0,
          verified: true,
          verifiedAmount: 0,
        },
      });
    }

    // --- CASE 2: DUPLICATE ---
    case '200001': {
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          description: 'รายการถูกปฏิเสธ: สลิปนี้เคยถูกใช้งานในระบบแล้ว',
          amount: 0,
          verified: true,
          verifiedAmount: 0,
        },
        include: true,
      });
    }

    // --- DEFAULT: กรณีที่ Code ไม่ตรงกับที่คาดไว้ ---
    default: {
      console.error(`Unknown transaction verification code: ${code}`);
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          description: `รายการถูกปฏิเสธ: สลิปไม่ถูกต้องกรุณาลองใหม่อีกครั้ง ERROR:${code}`,
          amount: 0,
          verified: true,
          verifiedAmount: 0,
        },
        include: true,
      });
    }
  }
};

/**
 * สร้างรายการ "ถอนเงิน" ใหม่ในระบบ
 * @param {string} userId - ID ของผู้ใช้ที่ทำการถอนเงิน
 * @param {number} amount - จำนวนเงินที่ผู้ใช้ต้องการ "ได้รับ"
 * @param {object} withdrawalDetails - รายละเอียดบัญชีปลายทาง
 * @param {string} withdrawalDetails.bank - ชื่อธนาคาร
 * @param {string} withdrawalDetails.accountNumber - เลขที่บัญชี
 * @param {string} withdrawalDetails.accountName - ชื่อบัญชี
 * @returns {Promise<object>} - Transaction ที่สร้างขึ้นใหม่ในสถานะ PENDING
 */
const createWithdrawTransaction = async (userId, amount, withdrawalDetails) => {
  // --- 1. ตรวจสอบและแปลงข้อมูลนำเข้า ---
  const floatAmount = parseFloat(amount);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'จำนวนเงินที่ต้องการถอนไม่ถูกต้อง');
  }
  if (
    !withdrawalDetails ||
    !withdrawalDetails.bank ||
    !withdrawalDetails.accountNumber ||
    !withdrawalDetails.accountName
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'กรุณาระบุข้อมูลบัญชีธนาคารให้ครบถ้วน');
  }

  // --- 3. ใช้ Transaction ของฐานข้อมูลเพื่อความปลอดภัยสูงสุด ---
  const newWithdrawalTransaction = await prisma.$transaction(async (tx) => {
    // 3.1 ค้นหา Wallet ของผู้ใช้
    const wallet = await tx.wallet.findUnique({
      where: { userId: userId },
    });

    if (!wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบ Wallet ของผู้ใช้');
    }

    // 3.4 สร้าง Transaction record ใหม่ในสถานะ PENDING
    const createdTransaction = await tx.transaction.create({
      data: {
        name: 'ถอนเงิน',
        type: 'OUTCOME',
        status: 'PENDING', // สถานะเริ่มต้นคือ "รอเจ้าหน้าที่ดำเนินการ"
        amount: floatAmount, // 'amount' คือยอดที่ผู้ใช้จะได้รับ
        from: `Wallet ของ ${userId}`, // หรือชื่อผู้ใช้
        to: `${withdrawalDetails.bank} - ${withdrawalDetails.accountNumber}`,
        description: `ถอนเงิน ${floatAmount.toFixed(2)} บาท,`,
        bank: withdrawalDetails.bank,
        wallet: {
          connect: { id: wallet.id },
        },
      },
    });
    console.log(
      `Withdraw successfully: on process to withdraw ${createdTransaction.amount}฿ - ${withdrawalDetails.bank}`,
    );
    return createdTransaction;
  });

  // (Optional) ส่ง Notification แจ้งเตือนผู้ใช้ว่า "ได้รับคำขอถอนเงินของคุณแล้ว"
  return newWithdrawalTransaction;
};

/**
 * โอนเงินระหว่าง Wallet ของผู้ใช้ภายในแอปพลิเคชัน
 * @param {string} senderUserId - ID ของผู้ใช้ที่ "ส่ง" เงิน (from auth middleware)
 * @param {object} transferData - ข้อมูลการโอน
 * @param {string} transferData.recipientUserId - ID ของผู้ใช้ที่ "รับ" เงิน
 * @param {number} transferData.amount - จำนวนเงินที่ต้องการโอน
 * @param {string} transferData.pin - รหัส PIN 6 หลักของผู้ส่งเพื่อยืนยันตัวตน
 */
const createInternalTransfer = async (senderUserId, transferData) => {
  const { line_user_id, recipientUserId, amount, pin } = transferData;

  const response = await axios.get(`https://checkuserdb.vercel.app/api/get-pin/${line_user_id}`);
  const serverPin = response.data.pin;
  // --- Input Validation ---
  const floatAmount = parseFloat(amount);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'จำนวนเงินไม่ถูกต้อง');
  }
  if (senderUserId === recipientUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ไม่สามารถโอนเงินให้ตัวเองได้');
  }

  console.log(`Initiating transfer from ${senderUserId} to ${recipientUserId}`);

  const outcomeTransaction = await prisma.$transaction(async (tx) => {
    // 1. Fetch the sender using 'tx' and INCLUDE the wallet.
    const sender = await tx.user.findUnique({
      where: { id: senderUserId },
      include: { wallet: true }, // <-- CRITICAL FIX #1: Include the wallet
    });

    // 2. Fetch the recipient using 'tx'.
    const recipient = await tx.user.findUnique({
      where: { id: recipientUserId },
      include: { wallet: true },
    });

    // --- Validation logic ---
    if (!sender || !sender.wallet) {
      // This check will now work correctly.
      throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบข้อมูลผู้ส่ง');
    }
    if (!recipient || !recipient.wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบข้อมูลผู้รับ');
    }
    if (sender.wallet.balance < floatAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'ยอดเงินคงเหลือไม่เพียงพอ');
    }

    const userPinBuffer = Buffer.from(String(pin));
    const serverPinBuffer = Buffer.from(String(serverPin));

    if (userPinBuffer.length !== serverPinBuffer.length) {
      // If lengths don't match, they can't be equal.
      // We still run a dummy comparison on the serverPin to prevent leaking length information.
      crypto.timingSafeEqual(serverPinBuffer, serverPinBuffer);
      throw new ApiError(httpStatus.UNAUTHORIZED, 'รหัสผ่านไม่ถูกต้องกรุณาลองใหม่');
    }

    const pinsMatch = crypto.timingSafeEqual(userPinBuffer, serverPinBuffer);

    if (!pinsMatch) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'รหัส PIN ไม่ถูกต้อง');
    }

    // --- Financial operations (remains the same) ---
    await Promise.all([
      tx.wallet.update({
        where: { id: sender.wallet.id },
        data: { balance: { decrement: floatAmount } },
      }),
      tx.wallet.update({
        where: { id: recipient.wallet.id },
        data: { balance: { increment: floatAmount } },
      }),
    ]);

    // --- Transaction record creation (remains the same) ---
    const [senderTransaction, receiverTransaction] = await Promise.all([
      tx.transaction.create({
        data: {
          name: `โอนเงินไปให้ ${recipient.line_display_name || recipient.fullname}`,
          type: 'OUTCOME',
          status: 'SUCCESS',
          amount: floatAmount,
          from: sender.line_display_name || sender.fullname,
          to: recipient.line_display_name || recipient.fullname,
          walletId: sender.wallet.id,
        },
      }),
      tx.transaction.create({
        data: {
          name: `รับเงินจาก ${sender.line_display_name || sender.fullname}`,
          type: 'INCOME',
          status: 'SUCCESS',
          amount: floatAmount,
          from: sender.line_display_name || sender.fullname,
          to: recipient.line_display_name || recipient.fullname,
          walletId: recipient.wallet.id,
        },
      }),
    ]);

    return { senderTransaction, receiverTransaction };
  });

  return outcomeTransaction;
};

const getWalletTransaction = async (walletId, options = {}) => {
  const whereClause = {
    walletId: walletId,
  };

  if (options.year && options.month !== undefined) {
    const year = parseInt(options.year, 10);
    const month = parseInt(options.month, 10); // month จาก JS คือ 0-11

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    // เติม query วันเวลาลงไปถ้ามี options.year, options.month
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

const getSuccessTransaction = async (walletId, options = {}) => {
  const whereClause = {
    walletId: walletId,
    status: 'SUCCESS',
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

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return transactions;
  }
};

const getTransactionsWithThaiStatus = async (walletId) => {
  // สร้าง Aggregation Pipeline Array
  const pipeline = [
    // ขั้นตอนที่ 1: คัดกรองเอกสารตาม walletId ที่ต้องการ
    {
      $match: {
        walletId: walletId,
      },
    },

    // ขั้นตอนที่ 2: เพิ่ม field ใหม่ชื่อ statusInThai โดยใช้ $switch
    {
      $addFields: {
        statusInThai: {
          $switch: {
            branches: [
              {
                case: { $eq: ['$status', 'SUCCESS'] }, // ถ้า status เท่ากับ 'SUCCESS'
                then: 'สำเร็จ',
              },
              {
                case: { $eq: ['$status', 'PENDING'] }, // ถ้า status เท่ากับ 'PENDING'
                then: 'กำลังตรวจสอบ',
              },
            ],
            default: 'ยกเลิก', // นอกจากนั้นทั้งหมด (CANCELLED หรือ REJECTED)
          },
        },
      },
    },

    // ขั้นตอนที่ 3: เรียงลำดับข้อมูล
    {
      $sort: {
        createdAt: -1,
      },
    },
  ];

  // เรียกใช้ aggregation pipeline ด้วย Prisma aggregateRaw()
  try {
    const transactions = await prisma.transaction.aggregateRaw({ pipeline });
    return transactions;
  } catch (error) {
    console.error('Error running aggregation pipeline:', error);
    throw new Error('Failed to get transactions with Thai status.');
  }
};

/**
 * Generate a PDF statement for a wallet and email it.
 * - Filters: status=SUCCESS, type in [INCOME, OUTCOME]
 *
 * @param {Object} args
 * @param {string} args.walletId
 * @param {string} args.email   - destination email address
 * @param {Date|string} [args.startDate] - optional filter (inclusive)
 * @param {Date|string} [args.endDate]   - optional filter (inclusive)
 * @returns {Promise<{count:number, emailId:string|null}>}
 */
const exportToPdf = async (email, walletId, startDate, endDate) => {
  if (!walletId) throw new Error('walletId is required');
  if (!email) throw new Error('email is required');

  // Optional date filters
  const createdAtFilter =
    startDate || endDate
      ? {
          gte: startDate ? new Date(startDate) : undefined,
          lte: endDate ? new Date(endDate) : undefined,
        }
      : undefined;

  // Fetch wallet + user (for header) and transactions
  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({
      where: { id: walletId },
      include: { user: true },
    }),
    prisma.transaction.findMany({
      where: {
        walletId,
        status: 'SUCCESS',
        type: { in: ['INCOME', 'OUTCOME'] },
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (!wallet) throw new Error('Wallet not found');

  // Build PDF
  const buffer = await buildTransactionsPdf({
    wallet,
    transactions,
    startDate: createdAtFilter?.gte,
    endDate: createdAtFilter?.lte,
  });

  // Email via Resend
  const result = await sendEmail({
    to: email,
    subject: 'รายการเดินบัญชี (PDF)',
    text: 'แนบไฟล์รายการเดินบัญชีของคุณในรูปแบบ PDF',
    attachments: [
      {
        filename: `statement_${walletId}.pdf`,
        content: buffer, // Buffer from pdfkit/pdf-lib
        contentType: 'application/pdf',
      },
    ],
  });
  console.log('Email sent: ', result);

  return { count: transactions.length, emailId: result?.data?.id ?? null };
};

const createTransaction = async ({ payload }) => {
  const newTransaction = await prisma.transaction.create({ payload });
  return newTransaction;
};

const getTransactions = async (options = {}) => {
  const {
    // pagination
    page = 1,
    pageSize = 10,
    // sort
    sort = 'createdAt',
    order = 'desc',
    // [MODIFIED] รับค่า status มาจาก options
    status,
  } = options;

  const orderBy = sort === 'amount' ? { amount: order } : { createdAt: order };
  const ps = Math.min(Number(pageSize) || 20, 100);
  const p = Math.max(Number(page) || 1, 1);
  const skip = (p - 1) * ps;

  // [MODIFIED] สร้าง where clause แบบไดนามิก
  const whereClause = {};
  if (status && status !== 'ALL') {
    whereClause.status = status;
  }

  // [MODIFIED] ใช้ whereClause ทั้งใน findMany และ count
  const [data, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where: whereClause, // <--- เพิ่มตรงนี้
      orderBy,
      skip,
      take: ps,
      include: { wallet: true },
    }),
    prisma.transaction.count({
      where: whereClause, // <--- และเพิ่มตรงนี้เพื่อให้ Pagination ถูกต้อง
    }),
  ]);

  return {
    data,
    paging: {
      mode: 'offset',
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
      hasNextPage: skip + data.length < total,
      hasPrevPage: p > 1,
    },
  };
};

const editTransaction = async (transactionId, payload) => {
  if (!transactionId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction ID is required.');
  }
  if (!payload || Object.keys(payload).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Update payload cannot be empty.');
  }

  const existingTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!existingTransaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found.');
  }

  // --- LOGIC ENHANCEMENT ---
  // ตรวจสอบว่านี่คือการ "อนุมัติ" รายการที่ยังไม่สำเร็จหรือไม่
  const isApproving = payload.status === 'SUCCESS' && existingTransaction.status !== 'SUCCESS';

  if (isApproving) {
    // กรณีอนุมัติ: ต้องอัปเดตทั้ง Transaction และ Wallet พร้อมกัน
    const floatAmount = parseFloat(payload.amount);
    if (isNaN(floatAmount) || floatAmount <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'A valid amount is required to approve a transaction.');
    }
    if (!existingTransaction.walletId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction is not associated with a wallet.');
    }

    // ใช้ prisma.$transaction เพื่อให้แน่ใจว่าการดำเนินการทั้งสองอย่างสำเร็จพร้อมกัน
    const [updatedWallet, updatedTransaction] = await prisma.$transaction([
      // 1. เพิ่มยอดเงินใน Wallet
      prisma.wallet.update({
        where: { id: existingTransaction.walletId },
        data: {
          balance: { increment: floatAmount },
        },
      }),
      // 2. อัปเดต Transaction
      prisma.transaction.update({
        where: { id: transactionId },
        data: {
          ...payload, // ใช้ข้อมูลทั้งหมดจาก payload (status, amount, etc.)
          verified: true,
          verifiedAmount: floatAmount,
        },
      }),
    ]);

    console.log(`Transaction ${transactionId} approved. Wallet ${updatedWallet.id} balance updated.`);
    return updatedTransaction;
  } else {
    // กรณีอัปเดตอื่นๆ (เช่น แก้ไข description, ปฏิเสธ, หรือแก้ไขข้อมูลเฉยๆ)
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: payload,
    });
    console.log(`Transaction ${transactionId} updated successfully.`);
    return updatedTransaction;
  }
};

const deleteTransaction = async (transactionId, permanently = true) => {};

export default {
  // ดึงข้อมูลรายการตาม query (สำหรับผู้ใช้)
  getWalletTransaction,
  // สร้างรายการโอนเงินภายใน
  createInternalTransfer,
  // ดึงข้อมูลเป็นภาษาไทย
  getTransactionsWithThaiStatus,
  // สร้างรายการสำหรับออมเงิน
  createSavingTransaction,
  // สร้างรายการที่มีสถานะเป็นสำเร็จ
  createSuccessedTransaction,
  // สร้างรายการสำหรับถอนเงิน
  createWithdrawTransaction,
  // ดึงข้อมูลรายการที่มีสถานะสำเร็จ
  getSuccessTransaction,
  // อัพเดทรายการ หลังตรวจสลิป
  updateTransaction,
  // ส่ง Statement ให้ผู้ใช้
  exportToPdf,
  // สร้างรายการสำหรับ admin
  createTransaction,
  // ดึงข้อมูลรายการตาม query (สำหรับ admin ไม่มี walletId)
  getTransactions,
  // แก้ไข หรือ อัพเดทรายการสำหรับ admin
  editTransaction,
  // ลบรายการสำหรับแอดมิน
  deleteTransaction,
};
