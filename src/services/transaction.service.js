import prisma from '../libs/prisma.js';
// const multer = require('multer');
// const { google } = require('googleapis');
// const fs = require('fs');
// const path = require('path');
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';

const createTransaction = async (walletId, transactionData) => {
  // const auth = new google.auth.GoogleAuth({
  //   keyFile: process.env.GOOGLE_API_KEY_FILE, // Path to your service account JSON key from .env
  //   scopes: ['https://www.googleapis.com/auth/drive'],
  // });

  // const drive = google.drive({ version: 'v3', auth });

  // const fileMetadata = {
  //   name: `${walletId}_${Date.now()}_${fileFromRequest.originalname}`, // Create a unique filename
  //   parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // The ID of the folder you shared
  // };

  const dataToCreate = {
    ...transactionData,
    walletId: walletId,
  };

  // const media = {
  //   mimeType: fileFromRequest.mimetype,
  //   body: fs.createReadStream(fileFromRequest.path), // Create a readable stream from the uploaded file
  // };

  // let driveFileId = null;

  // try {
  //       const response = await drive.files.create({
  //           resource: fileMetadata,
  //           media: media,
  //           fields: "id", // Ask Google to return the new file's ID
  //       });
  //       driveFileId = response.data.id;
  //       console.log("File uploaded successfully. File ID:", driveFileId);

  //       // Clean up the locally stored file from multer
  //       fs.unlinkSync(fileFromRequest.path);

  //   } catch (error) {
  //       console.error("Error uploading to Google Drive:", error);
  //       // Clean up the file even if upload fails
  //       fs.unlinkSync(fileFromRequest.path);
  //       throw new Error("Failed to upload slip image.");
  //   }

  const newTransaction = await prisma.transaction.create({
    data: dataToCreate,
  });

  return newTransaction;
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
export default { createTransaction, getTransactions };
