import prisma from '../libs/prisma.js';
// IMPORTANT: We now need JWT from the library
import { google, Auth } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import { file } from 'googleapis/build/src/apis/file/index.js';
import axios from 'axios';

// In serverless environments (like AWS Lambda, Vercel, etc.), you typically receive uploaded files as Buffers (from multipart/form-data parsing).
// Instead of writing files to disk, you convert the Buffer directly to a Readable stream.
// This approach is memory-efficient and works well in stateless, ephemeral environments where disk access is limited or discouraged.
// The Readable stream is then passed to the Google Drive API for uploading the file.
// Example usage is shown below in createSavingTransaction, where fileFromRequest.buffer is converted to a Readable stream.

// const createSavingTransaction = async (walletId, transactionData, fileFromRequest) => {
//   const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

//   const authClient = new Auth.JWT({
//     email: credentials.client_email,
//     key: credentials.private_key, // Use the key directly
//     scopes: ['https://www.googleapis.com/auth/drive'],
//   });

//   const drive = google.drive({ version: 'v3', auth: authClient });

//   const GDRIVE_FOLDER_ID = '1mgc-THu8KP3U2PFpLRFdI-KX6OOcc8P2';

//   if (!fileFromRequest) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Slip image file is required.');
//   }

//   let driveFileId = null;

//   try {
//     const bufferStream = new Readable();
//     bufferStream.push(fileFromRequest.buffer);
//     bufferStream.push(null);

//     const fileMetadata = {
//       name: `${walletId}_${Date.now()}${path.extname(fileFromRequest.originalname)}`,
//       parents: [GDRIVE_FOLDER_ID],
//     };

//     const media = {
//       mimeType: fileFromRequest.mimetype,
//       body: bufferStream,
//     };

//     const response = await drive.files.create({
//       resource: fileMetadata,
//       media: media,
//       fields: 'id',
//     });

//     driveFileId = response.data.id;
//     console.log('File uploaded to Google Drive. File ID:', driveFileId);

//     const dataToCreate = {
//       ...transactionData,
//       walletId: walletId,
//       slipImageUrl: `https://lh3.googleusercontent.com/d/${driveFileId}`,
//     };

//     const newTransaction = await prisma.transaction.create({
//       data: dataToCreate,
//     });

//     return newTransaction;
//   } catch (error) {
//     console.error('Error during transaction creation:', error);
//     if (driveFileId) {
//       console.log(`Rolling back: Deleting file ${driveFileId} from Google Drive.`);
//       await drive.files.delete({ fileId: driveFileId });
//     }
//     throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create transaction.');
//   }
// };

async function createSavingTransaction(walletId, transactionData, fileFromRequest) {
  // สร้าง transaction ใหม่ ใส่ imageUrl ของ slip ไว้
  try {
    const dataToCreate = {
      ...transactionData,
      walletId: walletId,
    };

    const newTransaction = await prisma.transaction.create({
      data: dataToCreate,
    });

    return newTransaction;
  } catch (error) {
    console.log(error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Create saving transaction failed');
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
