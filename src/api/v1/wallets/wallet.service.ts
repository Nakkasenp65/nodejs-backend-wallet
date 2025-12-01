/**
 * @file เซอร์วิสสำหรับจัดการตรรกะทางธุรกิจ (Business Logic) ที่เกี่ยวข้องกับกระเป๋าเงิน (Wallet)
 * @description ไฟล์นี้รวบรวมฟังก์ชันทั้งหมดที่ใช้ในการจัดการข้อมูล Wallet โดยตรงกับฐานข้อมูล
 * ผ่าน Prisma Client ซึ่งครอบคลุมการสร้าง, การอ่าน, การอัปเดต, และการดำเนินการที่ซับซ้อน
 * เช่น การยืนยันยอดเงินในธุรกรรม
 * @module services/wallet
 * @requires libs/prisma - Prisma Client instance สำหรับการเชื่อมต่อฐานข้อมูล
 */
import { Prisma } from "@prisma/client";
import prisma from "../../../libs/prisma.js";
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";

interface WalletFilters {
  search?: string;
  page?: number | string;
  pageSize?: number | string;
}

interface WalletUpdateBody {
  balance?: number | string;
  bonusBalance?: number | string;
}

/**
 * ยืนยันยอดเงินของธุรกรรม, อัปเดตสถานะ, และปรับปรุงยอดเงินในกระเป๋าเงินที่เกี่ยวข้อง
 * @description ฟังก์ชันนี้เป็นกระบวนการสำคัญในการยืนยันธุรกรรมที่รอดำเนินการ (PENDING)
 * โดยจะทำงานภายใน Database Transaction (Atomicity) เพื่อรับประกันว่าการอัปเดตสถ านะธุรกรรม
 * และการเพิ่มยอดเงินใน Wallet จะต้องสำเร็จทั้งหมดหรือไม่ก็ล้มเหลวทั้งหมด
 * มีการป้องกันการยืนยันซ้ำซ้อนโดยตรวจสอบสถานะของธุรกรรมก่อนดำเนินการเสมอ
 * @async
 * @param {any} transactionVerification - (ยังไม่ได้ใช้งานในปัจจุบัน) พารามิเตอร์ที่อาจใช้สำหรับการตรวจสอบเพิ่มเติมในอนาคต
 * @param {string} transactionId - รหัสเฉพาะ (ID) ของ Transaction ที่ต้องการยืนยัน
 * @param {number|string} amount - ยอดเงินที่ได้รับการตรวจสอบและยืนยันแล้ว (ต้องเป็นค่าบวก)
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Transaction ที่อัปเดตแล้ว ซึ่งมีข้อมูล Wallet ล่าสุดแนบมาด้วย
 * @throws {ApiError} ในกรณีที่ข้อมูล `amount` ไม่ถูกต้อง, ไม่พบ Transaction, หรือ Transaction ไม่อยู่ในสถานะ 'PENDING' ที่สามารถดำเนินการต่อได้
 */
const confirmWalletAmount = async (transactionVerification: any, transactionId: string, amount: number | string) => {
  // --- Best Practice 1: ตรวจสอบและแปลงข้อมูลนำเข้าอย่างเข้มงวด ---
  const floatAmount = parseFloat(amount as string);
  if (isNaN(floatAmount) || floatAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid amount provided. Amount must be a positive number.");
  }

  // --- Best Practice 2: ใช้ Transaction ของฐานข้อมูลเพื่อความปลอดภัย ---
  // การใช้ prisma.$transaction ทำให้แน่ใจว่าการอัปเดต Transaction และ Wallet
  // จะสำเร็จหรือล้มเหลวไปพร้อมกันทั้งหมด (Atomicity)
  // ป้องกันกรณีที่อัปเดต Transaction สำเร็จแต่เพิ่มเงินเข้า Wallet ไม่สำเร็จ
  const updatedTransaction = await prisma.$transaction(async (tx) => {
    // 2.1 ค้นหา Transaction ที่ต้องการอัปเดตก่อน
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    // 2.2 ตรวจสอบเงื่อนไขก่อนการอัปเดต
    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, "Transaction not found.");
    }
    // (สำคัญ) ป้องกันการอัปเดตซ้ำซ้อน
    if (transaction.status !== "PENDING") {
      throw new ApiError(httpStatus.CONFLICT, `Transaction is already processed with status: ${transaction.status}`);
    }

    // 2.3 อัปเดต Wallet ก่อน (หรือพร้อมกัน)
    // เราจะใช้ walletId ที่ผูกอยู่กับ transaction ที่ดึงมา เพื่อความปลอดภัย
    await tx.wallet.update({
      where: {
        id: transaction.toWalletId!,
      },
      data: {
        balance: {
          increment: floatAmount,
        },
      },
    });

    // 2.4 อัปเดต Transaction
    const confirmedTransaction = await tx.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        amount: floatAmount,
        verified: true,
        verifiedAmount: floatAmount,
        status: "SUCCESS",
        description: `รายการได้รับการตรวจสอบและยืนยันยอดเงินจำนวน: ${floatAmount} บาท`,
      },
      include: {
        toWallet: true, // include wallet เพื่อให้ได้ข้อมูลล่าสุดกลับไป
      },
    });

    return confirmedTransaction;
  });

  // (Optional) ณ จุดนี้ คุณสามารถส่ง Notification หรือ Trigger event อื่นๆ ได้
  // await notificationService.sendDepositSuccess(updatedTransaction.wallet.userId, floatAmount);
  // await missionService.checkAndUpdateProgress(updatedTransaction.wallet.userId, floatAmount);

  return updatedTransaction;
};

/**
 * ดึงข้อมูลกระเป๋าเงิน (Wallet) ของผู้ใช้ LINE ที่ระบุ
 * @description ฟังก์ชันนี้ทำหน้าที่ค้นหาและดึงข้อมูล Wallet ที่เชื่อมโยงกับ `line_user_id` ที่ได้รับ
 * โดยจะคืนค่า Wallet อ็อบเจกต์แรกที่พบ หากมีหลาย Wallet ที่เชื่อมโยงกับ ID นั้น
 * @async
 * @param {string} line_user_id - รหัสผู้ใช้ LINE (Line User ID) ของผู้ใช้ที่ต้องการดึง Wallet
 * @returns {Promise<object|null>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Wallet หากพบ หรือ `null` หากไม่พบ Wallet ที่เชื่อมโยง
 * @throws {ApiError} ในกรณีที่ไม่ได้ระบุ `line_user_id`
 */
const getUserWallet = async (line_user_id: string) => {
  if (!line_user_id) throw new ApiError(httpStatus.BAD_REQUEST, "Line user ID is required");
  const wallet = await prisma.wallet.findFirst({
    where: {
      user: {
        line_user_id,
      },
    },
  });
  return wallet;
};

/**
 * ดึงรายการกระเป๋าเงิน (Wallets) ทั้งหมดพร้อมระบบแบ่งหน้า (Pagination) และการกรองข้อมูล
 * @description ฟังก์ชันนี้ทำหน้าที่ค้นหาและดึงรายการ Wallets จากฐานข้อมูลตามเงื่อนไขที่กำหนดใน `filters`
 * รองรับการค้นหาจาก ID ของ Wallet, ชื่อไลน์, หรือเบอร์โทรศัพท์ของผู้ใช้
 * และคืนค่าข้อมูลในรูปแบบที่มีการแบ่งหน้าเรียบร้อยแล้ว
 * @async
 * @param {object} [filters={}] - อ็อบเจกต์สำหรับกำหนดเงื่อนไขการค้นหาและการแบ่งหน้า
 * @param {string} [filters.search] - คำค้นหา (search term) สำหรับกรองข้อมูลจาก `walletUniqueId`, `line_display_name`, หรือ `phone`
 * @param {number|string} [filters.page=1] - เลขหน้าปัจจุบันที่ต้องการดึงข้อมูล
 * @param {number|string} [filters.pageSize=10] - จำนวนรายการสูงสุดต่อหนึ่งหน้า
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ซึ่งประกอบด้วย `data` (อาร์เรย์ของ Wallets) และ `paging` (ข้อมูลการแบ่งหน้า)
 */
const getWallets = async (filters: WalletFilters = {}) => {
  const { search, page = 1, pageSize = 10 } = filters;
  const take = parseInt(pageSize as string, 10);
  const skip = (parseInt(page as string, 10) - 1) * take;

  const where: Prisma.WalletWhereInput = {};
  if (search) {
    where.OR = [
      { walletUniqueId: { contains: search, mode: "insensitive" } },
      { user: { line_display_name: { contains: search, mode: "insensitive" } } },
      { user: { phone: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [wallets, total] = await prisma.$transaction([
    prisma.wallet.findMany({
      where,
      include: {
        user: {
          select: { line_display_name: true, line_profile_url: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.wallet.count({ where }),
  ]);

  const paging = {
    page: parseInt(page as string, 10),
    pageSize: take,
    total,
    totalPages: Math.ceil(total / take),
  };

  return { data: wallets, paging };
};

/**
 * ดึงข้อมูลรายละเอียดของกระเป๋าเงิน (Wallet) พร้อมข้อมูลที่เกี่ยวข้อง
 * @description ฟังก์ชันนี้ทำหน้าที่ค้นหาและดึงข้อมูลของ Wallet จากรหัสเฉพาะ (ID) ที่ระบุ
 * โดยจะแนบข้อมูลที่เกี่ยวข้องมาด้วย ได้แก่ ข้อมูลผู้ใช้ที่เป็นเจ้าของ (user)
 * และประวัติธุรกรรมการส่ง (sentTransaction) และการรับ (receieveTransaction) 10 รายการล่าสุด
 * @async
 * @param {string} walletId - รหัสเฉพาะ (ID) ของ Wallet ที่ต้องการดึงข้อมูล
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Wallet พร้อมข้อมูลผู้ใช้และประวัติธุรกรรมล่าสุด
 * @throws {ApiError} ในกรณีที่ไม่พบ Wallet ตาม `walletId` ที่ระบุ
 */
const getWalletDetails = async (walletId: string) => {
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: {
      user: true, // ดึงข้อมูล User ทั้งหมด
      // ดึงประวัติธุรกรรม 10 รายการล่าสุด
      sentTransaction: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      receieveTransaction: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!wallet) {
    throw new ApiError(httpStatus.NOT_FOUND, "Wallet not found");
  }
  return wallet;
};

/**
 * อัปเดตข้อมูลยอดเงินในกระเป๋าเงิน (Wallet) ที่ระบุ
 * @description ฟังก์ชันนี้ทำหน้าที่อัปเดตเฉพาะฟิลด์ `balance` และ/หรือ `bonusBalance` ของ Wallet ที่มีอยู่แล้วในระบบ
 * โดยจะค้นหา Wallet จาก `walletId` ที่ได้รับ และจะอัปเดตเฉพาะฟิลด์ที่มีการส่งค่ามาใน `updateBody` เท่านั้น
 * @async
 * @param {string} walletId - รหัสเฉพาะ (ID) ของ Wallet ที่ต้องการอัปเดต
 * @param {object} updateBody - อ็อบเจกต์ที่บรรจุข้อมูลสำหรับอัปเดต
 * @param {number} [updateBody.balance] - ยอดเงินคงเหลือใหม่ (ถ้ามี)
 * @param {number} [updateBody.bonusBalance] - ยอดโบนัสคงเหลือใหม่ (ถ้ามี)
 * @returns {Promise<object>} Promise ที่จะ resolve เป็นอ็อบเจกต์ Wallet ที่ได้รับการอัปเดตข้อมูลล่าสุดแล้ว
 * @throws {ApiError} ในกรณีที่ไม่พบ Wallet หรือข้อมูลที่ส่งมาไม่ถูกต้อง (เช่น balance ไม่ใช่ตัวเลข, หรือไม่ได้ส่งฟิลด์ใดๆ มาเลย)
 */
const updateWallet = async (walletId: string, updateBody: WalletUpdateBody) => {
  const { balance, bonusBalance } = updateBody;

  // Structural Safeguard: ตรวจสอบว่ามีข้อมูลที่อนุญาตให้อัปเดตส่งมาหรือไม่
  if (balance === undefined && bonusBalance === undefined) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No valid fields to update. Only balance and bonusBalance are allowed.");
  }

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
  });

  if (!wallet) {
    throw new ApiError(httpStatus.NOT_FOUND, "Wallet not found");
  }

  // สร้าง data object เฉพาะฟิลด์ที่มีการส่งค่ามา
  const dataToUpdate: Prisma.WalletUpdateInput = {};
  if (balance !== undefined) {
    const floatBalance = parseFloat(balance as string);
    if (isNaN(floatBalance)) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid balance amount.");
    dataToUpdate.balance = floatBalance;
  }
  if (bonusBalance !== undefined) {
    const floatBonus = parseFloat(bonusBalance as string);
    if (isNaN(floatBonus)) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid bonusBalance amount.");
    dataToUpdate.bonusBalance = floatBonus;
  }

  // TODO: พิจารณาการสร้าง Transaction log สำหรับการแก้ไขโดย Admin เพื่อการตรวจสอบย้อนหลัง
  // await prisma.adminLog.create({ data: { action: 'UPDATE_WALLET', targetId: walletId, changes: dataToUpdate } });

  return await prisma.wallet.update({
    where: { id: walletId },
    data: dataToUpdate,
  });
};

export default {
  confirmWalletAmount,
  getUserWallet,
  getWallets,
  getWalletDetails,
  updateWallet,
};
