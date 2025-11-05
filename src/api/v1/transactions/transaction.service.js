/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับธุรกรรม (Transaction) ทั้งหมด
 * @description ไฟล์นี้เป็นศูนย์กลางการจัดการข้อมูลธุรกรรม ครอบคลุมการสร้าง, การประมวลผล (อนุมัติ/ปฏิเสธ),
 * การโอน, การถอน, และการส่งออกข้อมูล โดยเน้นความถูกต้องของข้อมูลทางการเงินผ่าน Atomic Operations
 * @module services/transaction
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 * @requires utils/ApiError - Custom Error class สำหรับจัดการข้อผิดพลาด
 * @requires services/user-mission.service - Service สำหรับอัปเดตความคืบหน้าภารกิจ
 * @requires services/notification.service - Service สำหรับส่งการแจ้งเตือน
 * @requires services/line.service - Service สำหรับส่ง Flex Messages ผ่าน LINE
 */
import prisma from "../../../libs/prisma.js";
// IMPORTANT: We now need JWT from the library
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";
import { TransactionStatus, TransactionType } from "../../../generated/prisma/index.js";
import axios from "axios";
import sendEmail from "../../../utils/email.js";
import crypto from "crypto";
import userMissionService from "../user-missions/user-mission.service.js";
import buildStatementPdf from "../../../utils/statementPdf.js";
import slipService from "../slips/slip.service.js";
import notificationService from "../notifications/notification.service.js";
import lineService from "../lines/line.service.js";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

/**
 * สร้างธุรกรรมการออมเงิน (ฝากเงิน) ใหม่ในสถานะ 'รอตรวจสอบ' (PENDING)
 * @description ฟังก์ชันนี้ใช้สำหรับบันทึกรายการฝากเงินเริ่มต้นที่ผู้ใช้แจ้งเข้ามา โดยจะแนบ URL ของรูปสลิปไปด้วย
 * @async
 * @param {object} transactionBody - อ็อบเจกต์ข้อมูลธุรกรรมจากผู้ใช้
 * @param {string} imageUrl - URL ของรูปสลิปที่อัปโหลดแล้ว
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Transaction ที่ถูกสร้างขึ้นใหม่
 * @throws {ApiError} หากไม่ได้ระบุ `walletId` หรือไม่พบ Wallet ดังกล่าวในระบบ
 */
const createSavingTransaction = async (transactionBody, imageUrl) => {
  // รับข้อมูลเท่าที่จำเป็นจาก Front-end
  const { walletId, userId } = transactionBody;

  if (!walletId || !userId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Wallet ID and User ID are required.");
  }

  // Back-end ค้นหาข้อมูลที่เหลือเอง
  const [wallet, user] = await Promise.all([
    prisma.wallet.findUnique({ where: { id: walletId }, select: { walletUniqueId: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { line_display_name: true } }),
  ]);

  if (!wallet || !user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Wallet or User not found.");
  }

  const newTransaction = await prisma.transaction.create({
    data: {
      // --- Back-end กำหนดค่าเองทั้งหมด ---
      name: "ฝากเงินออม",
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      from: user.line_display_name, // ดึงจากฐานข้อมูล ปลอดภัยกว่า
      to: wallet.walletUniqueId,
      // --- ข้อมูลที่ได้รับมา ---
      slipImageUrl: imageUrl,
      toWallet: { connect: { id: walletId } },
      amount: null,
      verified: false,
      verifiedAmount: null,
    },
  });

  return newTransaction;
};

/**
 * (Helper) สร้างธุรกรรมประเภท REWARD ที่มีสถานะเป็น SUCCESS ทันที
 * @description ใช้สำหรับสร้างรายการธุรกรรมที่เป็นผลสำเร็จโดยสมบูรณ์แล้ว เช่น การให้โบนัส
 * @async
 * @param {string} name - ชื่อธุรกรรม
 * @param {number} amount - จำนวนเงิน
 * @param {string} status - สถานะ (ปกติคือ 'SUCCESS')
 * @param {string} from - แหล่งที่มาของเงิน (เช่น 'SYSTEM_BONUS')
 * @param {string} to - ชื่อผู้รับ
 * @param {string} description - คำอธิบายธุรกรรม
 * @param {string} walletId - ID ของ Wallet ผู้รับ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ Transaction ที่ถูกสร้างขึ้น
 */
const createSuccessedTransaction = async (name, amount, status, from, to, description, walletId) => {
  if (!name || !amount || !from || !to || !description || !walletId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Information required.");
  }

  const successedTransaction = await prisma.transaction.create({
    data: {
      name,
      amount,
      type: TransactionType.REWARD,
      status: TransactionStatus.SUCCESS,
      from,
      to,
      description,
      toWallet: {
        connect: {
          id: walletId,
        },
      },
    },
    include: true,
  });

  return successedTransaction;
};

const updateTransaction = async (code, transactionId, verifyAmount = 0, senderName = "", sendBankName = "") => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      walletId: true,
      status: true,
      toWallet: {
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
    throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found.");
  }

  // สถานะที่ไม่ใช่ PENDING แสดงว่าเคยถูกประมวลผลไปแล้ว
  if (transaction.status !== "PENDING") {
    console.warn(
      `Attempted to update an already processed transaction (ID: ${transactionId}, Status: ${transaction.status})`,
    );
    return transaction;
  }

  // อัพเดทตามสถานะจากการตรวจสอบ
  switch (code) {
    // --- CASE 3: SUCCESS ---
    case "200000": {
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

          // Add the calculated bonus to the update payload
          walletUpdateData.bonusBalance = { increment: bonusAmount };

          // Update the transaction description to reflect the actual bonus given
          description += `\nคุณได้รับโบนัสเงินฝากครั้งแรก ${bonusAmount} บาท!`;

          // สร้างรายการสำหรับโบนัส
          await createSuccessedTransaction(
            `คุณได้รับโบนัสเงินฝากครั้งแรก ${bonusAmount} บาท!`,
            bonusAmount,
            TransactionStatus.SUCCESS,
            "One Wallet",
            transaction.toWallet.user.line_display_name,
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
            from: senderName + " " + sendBankName,
            amount: floatAmount,
            verified: true,
            verifiedAmount: floatAmount,
            status: "SUCCESS",
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
            status: "SUCCESS",
            type: "INCOME",
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
              "NEWCOMER_FIRST_DEPOSIT",
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
    case "403001": {
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          description: "รายการถูกปฏิเสธ: ไม่พบชื่อบัญชีผู้รับที่ตรงกับที่ระบุไว้",
          amount: 0,
          verified: true,
          verifiedAmount: 0,
        },
      });
    }

    // --- CASE 2: DUPLICATE ---
    case "200001": {
      return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.REJECTED,
          description: "รายการถูกปฏิเสธ: สลิปนี้เคยถูกใช้งานในระบบแล้ว",
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
 * สร้างคำขอถอนเงินใหม่ในสถานะ 'รอเจ้าหน้าที่ดำเนินการ' (PENDING)
 * @description ดำเนินการภายใน Database Transaction เพื่อความปลอดภัย แม้จะเป็นการสร้างรายการเดียวก็ตาม
 * @async
 * @param {string} userId - ID ของผู้ใช้ที่ต้องการถอนเงิน
 * @param {number|string} amount - จำนวนเงินที่ต้องการถอน
 * @param {object} withdrawalDetails - อ็อบเจกต์ข้อมูลบัญชีธนาคารสำหรับรับเงิน
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมการถอนเงินที่สร้างขึ้นใหม่
 * @throws {ApiError} หากข้อมูลนำเข้าไม่ถูกต้อง หรือไม่พบ Wallet ของผู้ใช้
 */
const createWithdrawTransaction = async (userId, amount, withdrawalDetails) => {
  // --- 1. ตรวจสอบและแปลงข้อมูลนำเข้า ---
  const floatAmount = parseFloat(amount);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "จำนวนเงินที่ต้องการถอนไม่ถูกต้อง");
  }
  if (
    !withdrawalDetails ||
    !withdrawalDetails.bank ||
    !withdrawalDetails.accountNumber ||
    !withdrawalDetails.accountName
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "กรุณาระบุข้อมูลบัญชีธนาคารให้ครบถ้วน");
  }

  // --- 3. ใช้ Transaction ของฐานข้อมูลเพื่อความปลอดภัยสูงสุด ---
  const newWithdrawalTransaction = await prisma.$transaction(async (tx) => {
    // 3.1 ค้นหา Wallet ของผู้ใช้
    const wallet = await tx.wallet.findUnique({
      where: { userId: userId },
    });

    if (!wallet) {
      throw new ApiError(httpStatus.NOT_FOUND, "ไม่พบ Wallet ของผู้ใช้");
    }

    const createdTransaction = await tx.transaction.create({
      data: {
        name: "ถอนเงิน",
        type: TransactionType.WITHDRAW,
        status: TransactionStatus.PENDING, // สถานะเริ่มต้นคือ "รอเจ้าหน้าที่ดำเนินการ"
        amount: floatAmount, // 'amount' คือยอดที่ผู้ใช้จะได้รับ
        from: `${wallet.walletUniqueId}`, // หรือชื่อผู้ใช้
        to: `${withdrawalDetails.bank} - ${withdrawalDetails.accountNumber}`,
        description: `ถอนเงิน ${floatAmount.toFixed(2)} บาท`,
        bank: withdrawalDetails.bank,
        fromWallet: {
          connect: { id: wallet.id },
        },
      },
    });
    console.log(
      `Withdraw successfully: on process to withdraw ${createdTransaction.amount}฿ - ${withdrawalDetails.bank}`,
    );
    return createdTransaction;
  });

  return newWithdrawalTransaction;
};

/**
 * ดำเนินการโอนเงินระหว่างผู้ใช้สองคนภายในระบบแบบ Atomic Operation
 * @description เป็นกระบวนการที่สำคัญซึ่งมีการตรวจสอบ PIN, อัปเดตยอดเงินของผู้ส่งและผู้รับ,
 * สร้างบันทึกธุรกรรม, และส่งการแจ้งเตือน (Notification และ LINE Flex Message) ทั้งหมดพร้อมกัน
 * @async
 * @param {string} senderUserId - ID ของผู้ส่ง
 * @param {object} transferData - อ็อบเจกต์ข้อมูลการโอน (recipientUserId, amount, pin)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมการโอนที่สร้างขึ้น
 * @throws {ApiError} หากข้อมูลไม่ถูกต้อง, ยอดเงินไม่เพียงพอ, ไม่พบผู้ใช้, หรือ PIN ไม่ถูกต้อง
 */
const createInternalTransfer = async (senderUserId, transferData) => {
  const { line_user_id, recipientUserId, amount, pin } = transferData;
  const floatAmount = parseFloat(amount);

  // --- Input Validation ---
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "จำนวนเงินไม่ถูกต้อง");
  }
  if (senderUserId === recipientUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "ไม่สามารถโอนเงินให้ตัวเองได้");
  }

  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: senderUserId },
      include: { wallet: true },
    }),
    prisma.user.findUnique({
      where: { id: recipientUserId },
      include: { wallet: true },
    }),
  ]);

  if (!sender || !sender.wallet) {
    // This check will now work correctly.
    throw new ApiError(httpStatus.NOT_FOUND, "ไม่พบข้อมูลผู้ส่ง");
  }
  if (!recipient || !recipient.wallet) {
    throw new ApiError(httpStatus.NOT_FOUND, "ไม่พบข้อมูลผู้รับ");
  }
  if (sender.wallet.balance < floatAmount) {
    throw new ApiError(httpStatus.BAD_REQUEST, "ยอดเงินคงเหลือไม่เพียงพอ");
  }

  let serverPin;
  try {
    const response = await axios.get(`https://checkuserdb.vercel.app/api/get-pin/${line_user_id}`);
    serverPin = response.data.pin;
  } catch (error) {
    console.error("[PIN_FETCH_ERROR]", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "ไม่สามารถตรวจสอบข้อมูล PIN ได้ในขณะนี้");
  }

  const userPinBuffer = Buffer.from(String(pin));
  const serverPinBuffer = Buffer.from(String(serverPin));
  const pinsMatch = crypto.timingSafeEqual(userPinBuffer, serverPinBuffer);
  if (!pinsMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "รหัส PIN ไม่ถูกต้อง");
  }

  const { transaction: outcomeTransaction, flexData: flexData } = await prisma.$transaction(async (tx) => {
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

    const transaction = await tx.transaction.create({
      data: {
        name: "โอนเงินภายในระบบ",
        type: TransactionType.TRANSFER,
        status: TransactionStatus.SUCCESS,
        amount: floatAmount,
        from: sender.line_display_name || sender.fullname,
        to: recipient.line_display_name || recipient.fullname,
        fromWalletId: sender.wallet.id,
        toWalletId: recipient.wallet.id,
      },
      include: {
        toWallet: {
          include: {
            user: true,
          },
        },
        fromWallet: {
          include: {
            user: true,
          },
        },
      },
    });

    try {
      await notificationService.sendTransferReceived(recipient.id, {
        amount: transaction.amount,
        fromName: transaction.fromWallet.user.line_display_name,
        fromPhone: transaction.toWallet.user.phone,
      });

      await notificationService.sendTransferSent(sender.id, {
        amount: transaction.amount,
        toName: transaction.toWallet.user.line_display_name,
        toPhone: transaction.toWallet.user.phone,
      });
    } catch (error) {
      console.error("[CREATE_NOTIFICATION_FAIL]", error);
    }

    const flexData = {
      sendingAmount: transaction.amount,
      senderWalletUniqueId: transaction.fromWallet.walletUniqueId,
      senderBalance: transaction.fromWallet.balance,
      senderLineId: transaction.fromWallet.user.line_user_id,
      receiverWalletUniqueId: transaction.toWallet.walletUniqueId,
      receiverBalance: transaction.toWallet.balance,
      receiverLineId: transaction.toWallet.user.line_user_id,
      updatedDate: transaction.updatedAt,
      liffUrlHistory: `${process.env.LIFF_URL}/history`,
    };

    return { transaction, flexData };
  });

  await lineService.sendSenderFlex(
    flexData.senderLineId,
    flexData.sendingAmount,
    flexData.senderWalletUniqueId,
    flexData.receiverWalletUniqueId,
    flexData.updatedDate,
    flexData.senderBalance,
    flexData.liffUrlHistory,
  );

  await lineService.sendReceiverFlex(
    flexData.receiverLineId,
    flexData.sendingAmount,
    flexData.senderWalletUniqueId,
    flexData.receiverWalletUniqueId,
    flexData.updatedDate,
    flexData.receiverBalance,
    flexData.liffUrlHistory,
  );

  return outcomeTransaction;
};

/**
 * ดึงประวัติธุรกรรมทั้งหมดที่เกี่ยวข้องกับ Wallet ที่ระบุ พร้อมตัวเลือกในการกรองตามเดือนและปี
 * @async
 * @param {string} walletId - ID ของ Wallet ที่ต้องการดูประวัติ
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือกเพิ่มเติม
 * @param {number|string} [options.year] - ปีที่ต้องการกรองข้อมูล (ค.ศ.)
 * @param {number|string} [options.month] - เดือนที่ต้องการกรองข้อมูล (0-11)
 * @returns {Promise<Array<object>>} Promise ที่ resolve เป็นอาร์เรย์ของธุรกรรม
 */
const getWalletTransaction = async (walletId, options = {}) => {
  const whereClause = {
    OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
  };

  if (options.year && options.month !== undefined) {
    const year = parseInt(options.year, 10);
    const month = parseInt(options.month, 10);

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
      createdAt: "desc",
    },
    include: {
      fromWallet: {
        select: { user: { select: { line_display_name: true } } },
      },
      toWallet: {
        select: { user: { select: { line_display_name: true } } },
      },
    },
  });

  return transactions;
};

const getSuccessTransaction = async (walletId, options = {}) => {
  const whereClause = {
    status: "SUCCESS",
    OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
  };

  if (options.year && options.month !== undefined) {
    const year = parseInt(options.year, 10);
    const month = parseInt(options.month, 10);

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    whereClause.createdAt = {
      gte: startDate,
      lt: endDate,
    };
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      fromWallet: {
        select: { user: { select: { line_display_name: true } } },
      },
      toWallet: {
        select: { user: { select: { line_display_name: true } } },
      },
    },
  });

  return transactions;
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
                case: { $eq: ["$status", "SUCCESS"] }, // ถ้า status เท่ากับ 'SUCCESS'
                then: "สำเร็จ",
              },
              {
                case: { $eq: ["$status", "PENDING"] }, // ถ้า status เท่ากับ 'PENDING'
                then: "กำลังตรวจสอบ",
              },
            ],
            default: "ยกเลิก", // นอกจากนั้นทั้งหมด (CANCELLED หรือ REJECTED)
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
    console.error("Error running aggregation pipeline:", error);
    throw new Error("Failed to get transactions with Thai status.");
  }
};

/**
 * สร้างไฟล์ PDF รายการเดินบัญชีสำหรับ Wallet ที่ระบุ และส่งไปยังอีเมลของผู้ใช้
 * @async
 * @param {string} email - อีเมลของผู้รับ
 * @param {string} walletId - ID ของ Wallet ที่ต้องการสร้างรายการ
 * @param {string} [startDate] - วันที่เริ่มต้น (ISO format)
 * @param {string} [endDate] - วันที่สิ้นสุด (ISO format)
 * @returns {Promise<{count: number, emailId: string|null}>} Promise ที่ resolve เป็นอ็อบเจกต์สรุปผลการส่ง
 * @throws {Error} หากไม่พบ Wallet
 */
const exportToPdf = async (email, walletId, startDate, endDate) => {
  if (!walletId) throw new Error("walletId is required");
  if (!email) throw new Error("email is required");

  const dateFilter =
    startDate || endDate
      ? {
          gte: startDate ? new Date(startDate) : new Date(0), // Default to earliest possible date if no start
          lte: endDate ? new Date(endDate) : new Date(), // Default to now if no end
        }
      : undefined;

  // 1. ดึงข้อมูล Wallet, User, และ Transactions จากฐานข้อมูล (เหมือนเดิม)
  const [wallet, transactions] = await Promise.all([
    prisma.wallet.findUnique({
      where: { id: walletId },
      include: { user: { select: { fullname: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
        status: "SUCCESS",
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: "asc" },
      include: {
        fromWallet: { include: { user: { select: { line_display_name: true } } } },
        toWallet: { include: { user: { select: { line_display_name: true } } } },
      },
    }),
  ]);

  if (!wallet) throw new Error("Wallet not found");

  // 2. ⭐️ เรียกใช้ฟังก์ชันใหม่เพื่อสร้าง PDF Buffer
  const pdfBuffer = await buildStatementPdf({
    currentWalletId: walletId,
    wallet,
    transactions,
    startDate: dateFilter?.gte,
    endDate: dateFilter?.lte,
  });

  // 3. ส่งอีเมลพร้อมไฟล์ PDF ที่แนบไป (เหมือนเดิม)
  const result = await sendEmail({
    to: email,
    subject: `ใบแจ้งยอดบัญชีสำหรับ ${wallet.user.fullname}`,
    text: `เรียนคุณ ${wallet.user.fullname},\n\nเอกสารใบแจ้งยอดบัญชีของคุณสำหรับช่วงวันที่ ${formatDate(dateFilter.gte)} ถึง ${formatDate(dateFilter.lte)} อยู่ในไฟล์แนบแล้วค่ะ\n\nขอแสดงความนับถือ,\nNUMBER 1 MONEY PLUS`,
    attachments: [
      {
        filename: `statement_${wallet.walletUniqueId}_${Date.now()}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  console.log("Statement PDF email sent successfully:", result?.data?.id);

  return { count: transactions.length, emailId: result?.data?.id ?? null };
};

/**
 * ดึงรายการธุรกรรมทั้งหมด (สำหรับ Admin) พร้อมระบบแบ่งหน้า, จัดเรียง, และกรองตามสถานะ
 * @async
 * @param {object} [options={}] - อ็อบเจกต์ตัวเลือก
 * @param {number} [options.page=1] - เลขหน้า
 * @param {number} [options.pageSize=10] - จำนวนรายการต่อหน้า
 * @param {string} [options.status] - สถานะที่ต้องการกรอง (เช่น 'PENDING', 'SUCCESS')
 * @returns {Promise<{data: Array<object>, paging: object}>} Promise ที่ resolve เป็นอ็อบเจกต์ข้อมูลและสถานะการแบ่งหน้า
 */
const getTransactions = async (options = {}) => {
  const { page = 1, pageSize = 10, sort = "createdAt", order = "desc", status } = options;

  const orderBy = sort === "amount" ? { amount: order } : { createdAt: order };
  const ps = Math.min(Number(pageSize) || 20, 100);
  const p = Math.max(Number(page) || 1, 1);
  const skip = (p - 1) * ps;

  // [MODIFIED] สร้าง where clause แบบไดนามิก
  const whereClause = {};
  if (status && status !== "ALL") {
    whereClause.status = status;
  }

  // [MODIFIED] ใช้ whereClause ทั้งใน findMany และ count
  const [data, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: ps,
      include: { toWallet: true, fromWallet: true },
    }),
    prisma.transaction.count({
      where: whereClause,
    }),
  ]);

  return {
    data,
    paging: {
      mode: "offset",
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
      hasNextPage: skip + data.length < total,
      hasPrevPage: p > 1,
    },
  };
};

/**
 * (Helper) จัดการตรรกะการอนุมัติธุรกรรมแบบ Atomic สำหรับ `editTransaction`
 * @description ฟังก์ชันภายในที่รับผิดชอบการอัปเดต Wallet และ Transaction พร้อมกันใน `$transaction`
 * และเรียกใช้ Service อื่นๆ ที่เกี่ยวข้อง (Notification, LINE) หลังการอนุมัติสำเร็จ
 * @async
 * @param {string} transactionId - ID ธุรกรรม
 * @param {object} existingTransaction - อ็อบเจกต์ธุรกรรมเดิมที่ดึงมาจากฐานข้อมูล
 * @param {object} dataToUpdate - Payload ที่ผ่านการกรองและเตรียมข้อมูลแล้ว
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่อัปเดตแล้ว
 */
const handleApproval = async (transactionId, existingTransaction, dataToUpdate) => {
  const floatAmount = dataToUpdate.amount;

  // กำหนดเป้าหมาย Wallet และประเภทปฏิบัติการ
  let targetWalletId;
  let walletOperation;

  switch (existingTransaction.type) {
    case "INCOME":
    case "REWARD":
      targetWalletId = existingTransaction.toWalletId;
      walletOperation = { balance: { increment: floatAmount } };
      break;
    case "OUTCOME":
    case "WITHDRAW":
      targetWalletId = existingTransaction.fromWalletId;
      walletOperation = { balance: { decrement: floatAmount } };
      break;
    default:
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Approval logic not implemented for type: ${existingTransaction.type}`,
      );
  }

  if (!targetWalletId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Transaction type ${existingTransaction.type} is missing the required wallet association.`,
    );
  }

  // ปฏิบัติการเชิงปรมาณู: รวมทุกอย่างไว้ในที่เดียว
  const updatedTransaction = await prisma.$transaction(async (tx) => {
    // 1. อัปเดต Wallet
    const updatedWallet = await tx.wallet.update({
      where: { id: targetWalletId },
      data: walletOperation,
      include: { user: true },
    });

    // 2. อัปเดต Transaction
    const mainUpdatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        ...dataToUpdate,
        verified: true,
        verifiedAmount: floatAmount,
      },
    });

    // 3. ปฏิบัติการหลังเกิดเหตุ (อยู่ภายใต้การคุ้มครอง)
    // เราจะสร้าง payload สำหรับ service อื่นๆ ที่นี่
    const notificationPayload = {
      userId: updatedWallet.user.id,
      amount: mainUpdatedTransaction.verifiedAmount,
      transactionId: mainUpdatedTransaction.id,
    };

    // ตัวอย่างการเรียก service อื่นๆ (ควรถูกออกแบบให้รับ payload)
    await notificationService.sendWithdrawSuccessNotification(
      updatedWallet.user.id,
      mainUpdatedTransaction.verifiedAmount,
      mainUpdatedTransaction.id,
    );
    // userId, senderName, senderBankNumber, senderBankName, amount, updatedDate, to, line_user_id
    await lineService.sendWithdrawSuccessFlex(
      updatedWallet.user.line_user_id,
      mainUpdatedTransaction.verifiedAmount,
      updatedWallet.balance,
      updatedWallet.walletUniqueId,
      updatedWallet.user.fullname,
      mainUpdatedTransaction.to,
      mainUpdatedTransaction.bank,
      mainUpdatedTransaction.updatedAt,
    );

    return mainUpdatedTransaction;
  });

  console.log(`Transaction ${transactionId} approved. Wallet ${targetWalletId} balance updated.`);
  return updatedTransaction;
};

/**
 * ฟังก์ชันหลักสำหรับแก้ไขธุรกรรมโดย Admin ทำหน้าที่เป็นตัวกระจายงาน (Dispatcher)
 * @description ทำหน้าที่เตรียมและกรองข้อมูล จากนั้นจะวิเคราะห์เจตนาของการแก้ไข หากเป็นการอนุมัติ
 * (เปลี่ยนสถานะเป็น SUCCESS) จะส่งต่อไปให้ `handleApproval` เพื่อจัดการแบบ Atomic
 * หากเป็นการแก้ไขทั่วไป จะส่งต่อไปให้ `handleGenericUpdate`
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการแก้ไข
 * @param {object} [file] - ไฟล์รูปภาพสลิป (ถ้ามี)
 * @param {object} payload - อ็อบเจกต์ข้อมูลที่ต้องการอัปเดต
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่อัปเดตแล้ว
 */
const editTransaction = async (transactionId, file, payload) => {
  if (!transactionId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Transaction ID is required.");
  }
  if ((!payload || Object.keys(payload).length === 0) && !file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Update payload or a slip image file is required.");
  }

  const dataToUpdate = { ...payload };
  if (dataToUpdate.amount) {
    dataToUpdate.amount = parseFloat(dataToUpdate.amount);
    if (isNaN(dataToUpdate.amount)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid amount format.");
    }
  }
  if (file) {
    const imageInfo = await slipService.uploadSlip(file, transactionId);
    dataToUpdate.slipImageUrl = imageInfo.url;
  }

  const existingTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!existingTransaction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found.");
  }

  const isApproving = dataToUpdate.status === "SUCCESS" && existingTransaction.status !== "SUCCESS";

  if (isApproving) {
    return handleApproval(transactionId, existingTransaction, dataToUpdate);
  } else {
    return await prisma.transaction.update({
      where: { id: transactionId },
      data: dataToUpdate,
    });
  }
};

/**
 * ลบธุรกรรมออกจากระบบอย่างถาวร (สำหรับ Admin)
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการลบ
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่ถูกลบไป
 * @throws {ApiError} หากไม่ได้ระบุ `transactionId`
 */
const deleteTransaction = async (transactionId) => {
  if (!transactionId) throw new ApiError(httpStatus.BAD_REQUEST, "transaction id is required");

  const deletedTransaction = await prisma.transaction.delete({
    where: {
      id: transactionId,
    },
  });

  return deletedTransaction;
};

/**
 * อนุมัติรายการฝากเงินที่รอดำเนินการ (PENDING) แบบ Atomic Operation
 * @description กระบวนการที่สมบูรณ์ซึ่งประกอบด้วย 3 ขั้นตอน:
 * 1. Pre-condition Validation: ตรวจสอบสถานะและสิทธิ์ก่อนดำเนินการ
 * 2. Atomic Operation: อัปเดต Wallet, จัดการโบนัสฝากครั้งแรก, อัปเดต Transaction, และกระตุ้นระบบ Referral ทั้งหมดพร้อมกัน
 * 3. Post-Commit Operations: ส่งการแจ้งเตือนและอัปเดตภารกิจหลังจากที่ Transaction สำเร็จแล้วเท่านั้น
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการอนุมัติ
 * @param {object} approvalData - ข้อมูลการอนุมัติ (userId, amount, sender)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่อนุมัติแล้ว
 * @throws {ApiError} หากไม่พบธุรกรรม, สถานะไม่ถูกต้อง, หรือสิทธิ์ไม่ตรงกัน
 */
const approveDeposit = async (transactionId, approvalData) => {
  const { userId, amount, sender } = approvalData;
  const floatAmount = parseFloat(amount);

  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid amount provided for approval: ${amount}`);
  }

  const { mainUpdatedTransaction: updatedTransaction, flexData: flexData } = await prisma.$transaction(async (tx) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        status: true,
        toWallet: {
          select: {
            id: true,
            userId: true,
            user: { select: { firstTime: true, line_display_name: true } },
          },
        },
      },
    });

    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found.");
    }
    if (!transaction.toWallet) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Transaction is not a valid deposit (missing recipient wallet).");
    }
    if (transaction.toWallet.userId !== userId) {
      throw new ApiError(httpStatus.FORBIDDEN, "User ID does not match the transaction's recipient.");
    }
    if (transaction.status !== TransactionStatus.PENDING) {
      console.warn(`Attempted to approve an already processed transaction (ID: ${transactionId})`);
      return prisma.transaction.findUnique({ where: { id: transactionId } });
    }

    const walletId = transaction.toWallet.id;
    const isFirstTimeDeposit = transaction.toWallet.user.firstTime;

    const walletUpdateData = { balance: { increment: floatAmount } };
    let description = `รายการได้รับการตรวจสอบและยืนยันยอดเงินจำนวน: ${floatAmount.toFixed(2)} บาท\nชื่อผู้โอน: ${sender.account.name}\nธนาคาร: ${sender.bank.name}`;

    // 2.1 ตรรกะโบนัสเงินฝากครั้งแรก
    if (isFirstTimeDeposit) {
      const maxBonus = 100;
      const bonusAmount = Math.min(floatAmount, maxBonus);
      walletUpdateData.bonusBalance = { increment: bonusAmount };
      description += `\nคุณได้รับโบนัสเงินฝากครั้งแรก ${bonusAmount} บาท!`;

      await createSuccessedTransaction(
        `โบนัสเงินฝากครั้งแรก`,
        bonusAmount,
        TransactionStatus.SUCCESS,
        "SYSTEM_BONUS",
        transaction.toWallet.user.line_display_name,
        `โบนัสเงินฝากครั้งแรก ${bonusAmount} บาท`,
        walletId,
      );
    }

    // 2.2 อัปเดต Wallet หลัก
    await tx.wallet.update({
      where: { id: walletId },
      data: walletUpdateData,
    });

    // 2.3 อัปเดต Transaction หลัก
    const mainUpdatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        from: `${sender.bank.name} - ${sender.account.bank.account}`,
        externalSource: `${sender.account.name} (${sender.bank.name})`,
        amount: floatAmount,
        verified: true,
        verifiedAmount: floatAmount,
        status: "SUCCESS",
        description: description,
      },
      include: { toWallet: { include: { user: true } } }, // include wallet เพื่อส่งข้อมูลกลับ
    });

    const flexData = {
      line_user_id: mainUpdatedTransaction.toWallet.user.line_user_id,
      amount: mainUpdatedTransaction.verifiedAmount,
      balance: mainUpdatedTransaction.toWallet.balance,
      walletUniqueId: mainUpdatedTransaction.toWallet.walletUniqueId,
      accountName: sender.account.name,
      accountNumber: sender.account.bank.account,
      bankName: sender.bank.name,
      updatedDate: mainUpdatedTransaction.updatedAt,
    };

    // 2.4 ตรรกะ Referral (อยู่ภายใต้การคุ้มครองของ Transaction)
    if (isFirstTimeDeposit) {
      await tx.user.update({
        where: { id: userId },
        data: { firstTime: false },
      });
      const referralRecord = await tx.referral.findUnique({
        where: { newcomerId: userId },
      });
      if (referralRecord) {
        console.log(`[Referral Trigger] Updating mission for referrer ${referralRecord.referrerId}`);
        await userMissionService.checkAndUpdateMissionProgress(referralRecord.referrerId, "NEWCOMER_FIRST_DEPOSIT", {
          newcomerId: userId,
        });
      }
    }

    return { mainUpdatedTransaction, flexData };
  });

  // --- STAGE 3: ปฏิบัติการหลังการยืนยันข้อมูล (Post-Commit Operations) ---
  // ส่วนนี้จะทำงานก็ต่อเมื่อ STAGE 2 สำเร็จทั้งหมดแล้วเท่านั้น
  try {
    // ส่งแจ้งเตือนการอัพเดท
    await notificationService.sendDepositSuccess(
      updatedTransaction.toWallet.userId,
      updatedTransaction.verifiedAmount,
      updatedTransaction.id,
    );

    // ตรวจสอบภารกิจ
    await userMissionService.checkAndUpdateMissionProgress(userId, "DEPOSIT_SUCCESS", {
      amount: updatedTransaction.verifiedAmount,
    });

    // ส่ง Flex message รายการสำเร็จ
    await lineService.sendDepositFlexMessage(
      flexData.line_user_id,
      flexData.amount,
      flexData.balance,
      flexData.walletUniqueId,
      flexData.accountName,
      flexData.accountNumber,
      flexData.bankName,
      flexData.updatedDate,
    );
  } catch (error) {
    console.error(`[POST_APPROVAL_FAILURE] Failed to execute post-approval tasks for TxID ${transactionId}:`, error);
  }

  return updatedTransaction;
};

/**
 * ปฏิเสธรายการฝากเงินที่รอดำเนินการ (PENDING)
 * @description ตรวจสอบสถานะก่อนดำเนินการ จากนั้นอัปเดตสถานะเป็น 'REJECTED' พร้อมบันทึกเหตุผล
 * @async
 * @param {string} transactionId - ID ของธุรกรรมที่ต้องการปฏิเสธ
 * @param {object} rejectionData - ข้อมูลการปฏิเสธ (code, reason)
 * @returns {Promise<object>} Promise ที่ resolve เป็นอ็อบเจกต์ธุรกรรมที่ปฏิเสธแล้ว
 */
const rejectDeposit = async (transactionId, rejectionData) => {
  const { code, reason } = rejectionData;

  const existingTransaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { status: true },
  });

  if (!existingTransaction) {
    throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found.");
  }

  if (existingTransaction.status !== "PENDING") {
    console.warn(
      `Attempted to reject an already processed transaction (ID: ${transactionId}, Status: ${existingTransaction.status})`,
    );
    return prisma.transaction.findUnique({ where: { id: transactionId } });
  }

  let description;
  switch (code) {
    case "403001":
      description = "รายการถูกปฏิเสธ: ไม่พบชื่อบัญชีผู้รับที่ตรงกับที่ระบุไว้";
      break;
    case "200001":
      description = "รายการถูกปฏิเสธ: สลิปนี้เคยถูกใช้งานในระบบแล้ว";
      break;
    default:
      description = `รายการถูกปฏิเสธ: ${reason} (Code: ${code})`;
      break;
  }

  return await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: "REJECTED",
      description: description,
      verified: true,
      verifiedAmount: 0,
    },
  });
};

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
  // ดึงข้อมูลรายการตาม query (สำหรับ admin ไม่มี walletId)
  getTransactions,
  // แก้ไข หรือ อัพเดทรายการสำหรับ admin
  editTransaction,
  // ลบรายการสำหรับแอดมิน
  deleteTransaction,
  // อนุมัติการเติมเงิน
  approveDeposit,
  // ปิเสธการเติมเงิน
  rejectDeposit,
};
