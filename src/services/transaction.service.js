import prisma from '../libs/prisma.js';
// IMPORTANT: We now need JWT from the library
import { google, Auth } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import { TransactionStatus } from '../generated/prisma/index.js';
import { file } from 'googleapis/build/src/apis/file/index.js';
import axios from 'axios';

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

  try {
    const dataToSave = {
      name: name,
      type: type,
      status: status,
      from: from,
      to: to,
      slipImageUrl: imageUrl,
      wallet: {
        connect: { id: walletId },
      },
      // Fields ที่ Backend ควรจัดการเอง ไม่ใช่จาก Frontend:
      amount: null, // จะถูกอัปเดตโดย Admin/System หลังการตรวจสอบ
      verified: false,
      verifiedAmount: null,
    };

    console.log('Attempting to create transaction with data:', dataToSave);

    const newTransaction = await prisma.transaction.create({
      data: dataToSave,
    });

    console.log('Transaction created successfully:', newTransaction.id);

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

/**
 * อัปเดตสถานะ Transaction ตามผลการตรวจสอบสลิป
 * @param {string} transactionVerificationCode - โค้ดผลการตรวจสอบ ('200000', '403001', '200001')
 * @param {string} transactionId - ID ของ Transaction ที่จะอัปเดต
 * @param {number} [verifyAmount=0] - จำนวนเงินที่ตรวจสอบได้ (จำเป็นสำหรับเคส Success)
 * @returns {Promise<object>} - Transaction ที่อัปเดตแล้ว
 */
const updateTransaction = async (transactionVerificationCode, transactionId, verifyAmount = 0) => {
  // --- 1. ค้นหา Transaction ที่ต้องการอัปเดตก่อน ---
  console.log('Updating slip', transactionVerificationCode, transactionId, verifyAmount);
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found.');
  }

  // --- 2. (สำคัญ) ป้องกันการอัปเดตซ้ำซ้อน ---
  // ไม่ว่าผลจะเป็นอะไร, ถ้าสถานะไม่ใช่ PENDING แสดงว่าเคยถูกประมวลผลไปแล้ว
  if (transaction.status !== 'PENDING') {
    console.warn(
      `Attempted to update an already processed transaction (ID: ${transactionId}, Status: ${transaction.status})`,
    );
    // คืนค่า transaction เดิมกลับไป เพื่อไม่ให้ QStash retry โดยไม่จำเป็น
    return transaction;
  }

  // --- 3. จัดการตามแต่ละ Case ---
  switch (transactionVerificationCode) {
    // --- CASE 3: SUCCESS ---
    case '200000': {
      const floatAmount = parseFloat(verifyAmount);
      if (isNaN(floatAmount) || floatAmount <= 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid amount provided for SUCCESS case: ${verifyAmount}`);
      }

      // ใช้ Transaction ของฐานข้อมูลเพื่อความปลอดภัย (Atomicity)
      const updatedTransaction = await prisma.$transaction(async (tx) => {
        // 3.1 อัปเดต Wallet ของผู้ใช้
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { increment: floatAmount } },
        });

        // 3.2 อัปเดต Transaction
        return tx.transaction.update({
          where: { id: transactionId },
          data: {
            amount: floatAmount,
            verified: true,
            verifiedAmount: floatAmount,
            status: 'SUCCESS',
            description: `รายการได้รับการตรวจสอบและยืนยันยอดเงินจำนวน: ${floatAmount} บาท`,
          },
          include: {
            wallet: true,
          },
        });
      });

      // (Optional) Trigger event อื่นๆ หลังสำเร็จ เช่น อัปเดต Mission
      // await missionService.checkAndUpdateProgress(transaction.wallet.userId, floatAmount);

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
      console.error(`Unknown transaction verification code: ${transactionVerificationCode}`);
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          description: `รายการถูกปฏิเสธ: สลิปไม่ถูกต้องกรุณาลองใหม่อีกครั้ง ERROR:${transactionVerificationCode}`,
          amount: 0,
          verified: true,
          verifiedAmount: 0,
        },
        include: true,
      });
      // อาจจะอัปเดตเป็นสถานะพิเศษ หรือแค่โยน Error
      throw new ApiError(httpStatus.BAD_REQUEST, `Unknown verification code: ${transactionVerificationCode}`);
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

  // --- 2. กำหนดค่าธรรมเนียม (ดึงจาก .env คือ Best Practice) ---
  const WITHDRAWAL_FEE = parseFloat(process.env.WITHDRAWAL_FEE) || 15.0; // ตัวอย่าง: 15 บาท
  const totalDeduction = floatAmount + WITHDRAWAL_FEE;

  // --- 3. ใช้ Transaction ของฐานข้อมูลเพื่อความปลอดภัยสูงสุด ---
  const newWithdrawalTransaction = await prisma.$transaction(async (tx) => {
    // 3.1 ค้นหา Wallet ของผู้ใช้
    const wallet = await tx.wallet.findUnique({
      where: { userId: userId },
    });

    if (!wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบ Wallet ของผู้ใช้');
    }

    // 3.2 (สำคัญที่สุด) ตรวจสอบยอดเงินคงเหลือ
    if (wallet.balance < totalDeduction) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `ยอดเงินคงเหลือไม่เพียงพอ (ต้องมีอย่างน้อย ${totalDeduction.toFixed(2)} บาท)`,
      );
    }

    // 3.3 หักเงินออกจาก Wallet (ยอดเงิน + ค่าธรรมเนียม)
    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: totalDeduction,
        },
      },
    });

    // 3.4 สร้าง Transaction record ใหม่ในสถานะ PENDING
    const createdTransaction = await tx.transaction.create({
      data: {
        name: 'ถอนเงิน',
        type: 'OUTCOME',
        status: 'PENDING', // สถานะเริ่มต้นคือ "รอเจ้าหน้าที่ดำเนินการ"
        amount: floatAmount, // 'amount' คือยอดที่ผู้ใช้จะได้รับ
        from: `Wallet ของ ${userId}`, // หรือชื่อผู้ใช้
        to: `${withdrawalDetails.bank} - ${withdrawalDetails.accountNumber}`,
        description: `ถอนเงิน ${floatAmount.toFixed(2)} บาท, ค่าธรรมเนียม ${WITHDRAWAL_FEE.toFixed(2)} บาท`,
        bank: withdrawalDetails.bank,
        wallet: {
          connect: { id: wallet.id },
        },
      },
    });

    return createdTransaction;
  });

  // (Optional) ส่ง Notification แจ้งเตือนผู้ใช้ว่า "ได้รับคำขอถอนเงินของคุณแล้ว"
  // await notificationService.sendWithdrawalRequestReceived(userId, floatAmount);

  return newWithdrawalTransaction;
};

/**
 * โอนเงินระหว่าง Wallet ของผู้ใช้ภายในแอปพลิเคชัน
 * ฟังก์ชันนี้จะจัดการทุกอย่างภายใน Database Transaction เพื่อรับประกันความถูกต้องของข้อมูล
 * @param {string} senderUserId - ID ของผู้ใช้ที่ "ส่ง" เงิน
 * @param {object} transferData - ข้อมูลการโอน
 * @param {string} transferData.recipientUserId - ID ของผู้ใช้ที่ "รับ" เงิน
 * @param {number} transferData.amount - จำนวนเงินที่ต้องการโอน
 * @param {string} transferData.pin - รหัส PIN 6 หลักของผู้ส่งเพื่อยืนยันตัวตน
 * @returns {Promise<object>} - Transaction object ของฝั่งผู้ส่ง (OUTCOME)
 * @throws {ApiError} - โยน ApiError หากเกิดข้อผิดพลาดต่างๆ เช่น PIN ไม่ถูกต้อง, ยอดเงินไม่พอ
 */
const createInternalTransfer = async (senderUserId, transferData) => {
  const { recipientUserId, amount, pin } = transferData;

  // --- 1. ตรวจสอบข้อมูลนำเข้าพื้นฐาน ---
  const floatAmount = parseFloat(amount);
  if (!recipientUserId || !pin) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ข้อมูลผู้รับและ PIN เป็นสิ่งจำเป็น');
  }
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'จำนวนเงินไม่ถูกต้อง');
  }
  if (senderUserId === recipientUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'ไม่สามารถโอนเงินให้ตัวเองได้');
  }

  // --- 2. ใช้ Database Transaction เพื่อความปลอดภัยสูงสุด ---
  const outcomeTransaction = await prisma.$transaction(async (tx) => {
    // 2.1 ดึงข้อมูลที่จำเป็นทั้งหมดในครั้งเดียว (Sender และ Recipient)
    const [sender, recipient] = await Promise.all([
      tx.user.findUnique({
        where: { id: senderUserId },
        include: { wallet: true }, // ดึง wallet ของผู้ส่งมาด้วย
      }),
      tx.user.findUnique({
        where: { id: recipientUserId },
        include: { wallet: true }, // ดึง wallet ของผู้รับมาด้วย
      }),
    ]);

    // 2.2 ตรวจสอบเงื่อนไขสำคัญ
    if (!sender || !sender.wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบข้อมูลผู้ส่ง');
    }
    if (!recipient || !recipient.wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, 'ไม่พบข้อมูลผู้รับ');
    }
    if (!sender.pin) {
      throw new ApiError(httpStatus.FORBIDDEN, 'ผู้ส่งยังไม่ได้ตั้งค่า PIN');
    }
    if (sender.wallet.balance < floatAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'ยอดเงินคงเหลือไม่เพียงพอ');
    }

    // 2.3 (สำคัญ) ตรวจสอบความถูกต้องของ PIN
    // สมมติว่าคุณใช้ bcryptjs ในการ hash PIN ตอนที่ผู้ใช้ตั้งค่า
    const isPinValid = await bcrypt.compare(pin, sender.pin);
    if (!isPinValid) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'รหัส PIN ไม่ถูกต้อง');
    }

    // 2.4 ดำเนินการทางการเงิน: หักเงินผู้ส่ง, เพิ่มเงินผู้รับ
    await Promise.all([
      // หักเงินออกจาก balance ของผู้ส่ง
      tx.wallet.update({
        where: { id: sender.wallet.id },
        data: { balance: { decrement: floatAmount } },
      }),
      // เพิ่มเงินเข้า balance ของผู้รับ
      tx.wallet.update({
        where: { id: recipient.wallet.id },
        data: { balance: { increment: floatAmount } },
      }),
    ]);

    // 2.5 สร้าง Transaction records 2 รายการ (OUTCOME และ INCOME)
    const [senderTransaction] = await Promise.all([
      // สร้างรายการ "โอนออก" สำหรับผู้ส่ง
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
      // สร้างรายการ "รับเงิน" สำหรับผู้รับ
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

    // คืนค่า Transaction ของฝั่งผู้ส่งกลับไป
    return senderTransaction;
  });

  // (Optional) ส่ง Notification ให้ทั้งผู้ส่งและผู้รับ
  // await notificationService.sendTransferSuccessSender(senderUserId, recipient.line_display_name, floatAmount);
  // await notificationService.sendTransferSuccessRecipient(recipientUserId, sender.line_display_name, floatAmount);

  return outcomeTransaction;
};

const getTransactions = async (walletId, options = {}) => {
  const whereClause = {
    walletId: walletId,
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

export default {
  getTransactions,
  createInternalTransfer,
  getTransactionsWithThaiStatus,
  createSavingTransaction,
  createWithdrawTransaction,
  getSuccessTransaction,
  updateTransaction,
};
