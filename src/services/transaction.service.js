import prisma from '../libs/prisma.js';
// IMPORTANT: We now need JWT from the library
import path from 'path';
import ApiError from '../utils/ApiError.js';
import httpStatus from 'http-status';
import { TransactionStatus } from '../generated/prisma/index.js';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import sendEmail from '../utils/email.js';

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
  const { line_user_id, recipientUserId, amount } = transferData;

  const { data } = await axios.get(`https://checkuserdb.vercel.app/api/get-pin/${line_user_id}`);
  console.log('PIN RESPONSE:', data.pin);
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

    const isPinValid = data.pin === sender.pin;
    if (!isPinValid) {
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
    const [senderTransaction] = await Promise.all([
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

    return senderTransaction;
  });

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

/* ---------------- PDF builder ---------------- */

// --- Theme and Layout Constants ---
const COLOR_PRIMARY = '#7C3AED';
const COLOR_LIGHT_PURPLE = '#F5F3FF';
const COLOR_TEXT_HEADER = '#FFFFFF';
const COLOR_TEXT_BODY = '#1F2937';
const COLOR_TEXT_MUTED = '#6B7280';
const PAGE_MARGIN = 50;

// --- Formatting and Translation Helpers ---
function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

function fmtTHB(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  });
}

/**
 * Translates specific transaction terms into Thai.
 * @param {string} term The term to translate (e.g., 'SUCCESS', 'INCOME').
 * @returns {string} The translated Thai term or the original term if no translation exists.
 */
function translateTerm(term) {
  switch (term) {
    case 'SUCCESS':
      return 'สำเร็จ';
    case 'INCOME':
      return 'รายรับ';
    case 'OUTCOME':
      return 'รายจ่าย';
    default:
      return term;
  }
}

// --- PDF Generation Logic ---
const buildTransactionsPdf = async ({ wallet, transactions, startDate, endDate }) => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });

  const chunks = [];
  const streamDone = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve());
    doc.on('error', reject);
  });

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansThai-Regular.ttf');
  doc.registerFont('thai', fontPath);
  doc.font('thai');

  // --- Document Sections ---
  drawHeader(doc, { wallet, startDate, endDate });

  const tableTop = 190;
  doc.y = tableTop;

  const tableCols = [
    { key: 'date', label: 'วันที่', width: 90 },
    { key: 'name', label: 'ชื่อรายการ', width: 185 },
    { key: 'type', label: 'ประเภท', width: 70 },
    { key: 'status', label: 'สถานะ', width: 70 },
    { key: 'amount', label: 'จำนวนเงิน', width: 80, align: 'right' },
  ];

  drawTableHeader(doc, tableCols);

  if (!transactions.length) {
    drawEmptyState(doc);
  } else {
    transactions.forEach((t) => drawTxnRow(doc, t, tableCols));
  }

  drawFooter(doc, transactions);

  doc.end();
  await streamDone;
  return Buffer.concat(chunks);
};

function drawHeader(doc, { wallet, startDate, endDate }) {
  doc.rect(0, 0, doc.page.width, 120).fill(COLOR_PRIMARY);
  doc.fontSize(22).fillColor(COLOR_TEXT_HEADER).text('รายการเดินบัญชี', PAGE_MARGIN, 45);
  doc.fontSize(14).text('(Statement)', { continued: false });

  doc.y = 140;
  doc.fontSize(10).fillColor(COLOR_TEXT_BODY);
  const owner = wallet?.user?.fullname ?? wallet?.user?.line_display_name ?? `User ${wallet?.userId ?? ''}`;
  doc.text(`กระเป๋า: ${wallet.id}`, PAGE_MARGIN, doc.y);
  doc.text(`ชื่อผู้ใช้: ${owner}`, { align: 'right' });

  const dateText =
    startDate || endDate
      ? `ช่วงเวลา: ${new Date(startDate).toLocaleDateString('th-TH')} ถึง ${new Date(endDate).toLocaleDateString('th-TH')}`
      : 'ช่วงเวลา: ทั้งหมด';
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor(COLOR_TEXT_MUTED).text(dateText);
}

function drawTableHeader(doc, cols) {
  const y = doc.y;
  let x = PAGE_MARGIN;
  const cellPadding = 5;

  doc.rect(x, y, doc.page.width - PAGE_MARGIN * 2, 25).fill(COLOR_LIGHT_PURPLE);
  doc.fillColor(COLOR_TEXT_BODY).fontSize(10);

  cols.forEach((col) => {
    doc.text(col.label, x + cellPadding, y + 8, {
      width: col.width - cellPadding * 2,
      align: col.align || 'left',
    });
    x += col.width;
  });

  doc.y += 25;
}

function drawTxnRow(doc, txn, cols) {
  const rowY = doc.y;
  let cellX = PAGE_MARGIN;
  const rowHeight = 35;
  const cellPadding = 5;

  doc
    .moveTo(PAGE_MARGIN, rowY + rowHeight)
    .lineTo(doc.page.width - PAGE_MARGIN, rowY + rowHeight)
    .lineWidth(0.5)
    .strokeColor('#E5E7EB')
    .stroke();

  const date = new Date(txn.createdAt).toLocaleString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const amountText = fmtTHB(txn.amount ?? 0);
  const amountColor = txn.type === 'INCOME' ? '#16A34A' : '#DC2626';

  // **CHANGE: Use the translateTerm function to convert data to Thai.**
  const rowData = {
    date,
    name: txn.name || '-',
    type: translateTerm(txn.type),
    status: translateTerm(txn.status),
    amount: amountText,
  };

  doc.fillColor(COLOR_TEXT_BODY).fontSize(9);

  cols.forEach((col) => {
    if (col.key === 'amount') doc.fillColor(amountColor);

    doc.text(rowData[col.key], cellX + cellPadding, rowY + 12, {
      width: col.width - cellPadding * 2,
      align: col.align || 'left',
    });

    if (col.key === 'amount') doc.fillColor(COLOR_TEXT_BODY);
    cellX += col.width;
  });

  doc.y = rowY + rowHeight;
}

function drawFooter(doc, transactions) {
  const totalIn = sum(transactions.filter((t) => t.type === 'INCOME').map((t) => t.amount));
  const totalOut = sum(transactions.filter((t) => t.type === 'OUTCOME').map((t) => t.amount));
  const net = totalIn - totalOut;

  let y = doc.page.height - 150;
  if (doc.y > y) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  doc.y = y;

  const summaryBoxWidth = 300;
  const summaryBoxX = doc.page.width - PAGE_MARGIN - summaryBoxWidth;

  doc.fontSize(11).fillColor(COLOR_TEXT_BODY);
  doc.text('รวมเงินเข้า:', summaryBoxX, doc.y, { width: summaryBoxWidth, align: 'left' });
  doc.text(fmtTHB(totalIn), summaryBoxX, doc.y, { width: summaryBoxWidth, align: 'right' });
  doc.moveDown(0.75);

  doc.text('รวมเงินออก:', summaryBoxX, doc.y, { width: summaryBoxWidth, align: 'left' });
  doc.text(fmtTHB(totalOut), summaryBoxX, doc.y, { width: summaryBoxWidth, align: 'right' });
  doc.moveDown(0.5);

  doc
    .moveTo(summaryBoxX, doc.y)
    .lineTo(summaryBoxX + summaryBoxWidth, doc.y)
    .lineWidth(1)
    .strokeColor(COLOR_TEXT_BODY)
    .stroke();
  doc.moveDown(0.5);

  doc.fontSize(12);
  doc.text('สุทธิ:', summaryBoxX, doc.y, { width: summaryBoxWidth, align: 'left' });
  doc.text(fmtTHB(net), summaryBoxX, doc.y, { width: summaryBoxWidth, align: 'right' });
}

function drawEmptyState(doc) {
  doc
    .fontSize(11)
    .fillColor(COLOR_TEXT_MUTED)
    .text('ไม่มีรายการที่จะแสดง', PAGE_MARGIN, doc.y + 20, {
      align: 'center',
      width: doc.page.width - PAGE_MARGIN * 2,
    });
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

export default {
  getTransactions,
  createInternalTransfer,
  getTransactionsWithThaiStatus,
  createSavingTransaction,
  createWithdrawTransaction,
  getSuccessTransaction,
  updateTransaction,
  exportToPdf,
};
