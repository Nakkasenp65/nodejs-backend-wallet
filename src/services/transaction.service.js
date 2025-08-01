import prisma from '../libs/prisma.js';
import multer from 'multer';
import google from 'googleapis';
import fs from 'fs';
import path from 'path';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import dotenv from 'dotenv';

dotenv.config();

const createSavingTransaction = async (walletId, transactionData, fileFromRequest) => {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  console.log(credentialsJson);
  console.log(process.env.TEST_VAR);
  if (!credentialsJson) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Google credentials are not configured.');
  }

  const credentials = await JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const drive = google.drive({ version: 'v3', auth });
  const GDRIVE_FOLDER_ID = '1mgc-THu8KP3U2PFpLRFdI-KX6OOcc8P2';

  if (!fileFromRequest) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Slip image file is required.');
  }

  let driveFileId = null;

  try {
    // --- ขั้นตอนที่ 1: อัปโหลดไฟล์ไป Google Drive ---
    const fileMetadata = {
      name: `${walletId}_${Date.now()}_${path.extname(fileFromRequest.originalname)}`,
      parents: [GDRIVE_FOLDER_ID],
    };

    const media = {
      mimeType: fileFromRequest.mimetype,
      body: fs.createReadStream(fileFromRequest.path),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    driveFileId = response.data.id;
    console.log('File uploaded to Google Drive. File ID:', driveFileId);

    // --- ขั้นตอนที่ 2: สร้างข้อมูลใน Database พร้อมกับ Drive File ID ---
    const dataToCreate = {
      ...transactionData,
      walletId: walletId,
      slipImageUrl: `https://lh3.googleusercontent.com/d/${driveFileId}`, // สมมติว่าใน schema มี field นี้
    };

    const newTransaction = await prisma.transaction.create({
      data: dataToCreate,
    });

    return newTransaction;
  } catch (error) {
    console.error('Error during transaction creation:', error);

    if (driveFileId) {
      console.log(`Rolling back: Deleting file ${driveFileId} from Google Drive.`);
      await drive.files.delete({ fileId: driveFileId });
    }

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create transaction.');
  } finally {
    console.log(`Cleaning up temporary file: ${fileFromRequest.path}`);
    await fs.unlink(fileFromRequest.path);
  }
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

export default { getTransactions, getTransactionsWithThaiStatus, createSavingTransaction };
