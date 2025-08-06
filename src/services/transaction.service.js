import prisma from '../libs/prisma.js';
// IMPORTANT: We now need JWT from the library
import { google, Auth } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import { file } from 'googleapis/build/src/apis/file/index.js';
import axios from 'axios';

/**
 * สร้าง Saving Transaction ใหม่ในฐานข้อมูลหลังจากอัปโหลดสลิปสำเร็จ
 * @param {object} transactionBody - ข้อมูล transaction ที่ได้จาก req.body
 * @param {string} imageUrl - URL ของรูปภาพสลิปที่ได้จากการอัปโหลด
 * @returns {Promise<object>} - Transaction object ที่สร้างเสร็จแล้ว
 */
async function createSavingTransaction(transactionBody, imageUrl) {
  // 1. ดึงข้อมูลที่จำเป็นออกมาจาก transactionBody
  const { name, type, status, from, to, walletId } = transactionBody;

  // 2. ตรวจสอบว่ามี walletId ที่จำเป็นหรือไม่
  if (!walletId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Wallet ID is required to create a transaction.');
  }

  try {
    // 3. เตรียมข้อมูลที่จะบันทึกลงฐานข้อมูลให้ตรงตาม Schema
    const dataToSave = {
      name: name,
      type: type, // 'INCOME'
      status: status, // 'PENDING'
      from: from,
      to: to,
      slipImageUrl: imageUrl, // <-- ใช้ URL ที่ได้มา
      wallet: {
        connect: { id: walletId }, // <-- วิธีที่ถูกต้องในการเชื่อม Relation
      },
      // Fields ที่ Backend ควรจัดการเอง ไม่ใช่จาก Frontend:
      amount: null, // จะถูกอัปเดตโดย Admin/System หลังการตรวจสอบ
      verified: false,
      verifiedAmount: null,
    };

    console.log('Attempting to create transaction with data:', dataToSave);

    // 4. สร้าง Transaction record ใหม่ด้วย Prisma
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
}

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

export default { getTransactions, getTransactionsWithThaiStatus, createSavingTransaction, getSuccessTransaction };
