/**
 * @file เซอร์วิสสำหรับจัดการการส่งข้อความผ่าน LINE Messaging API
 * @description ไฟล์นี้รวบรวมฟังก์ชันที่ใช้ในการเตรียมข้อมูล, สร้าง Payload ของ Flex Message,
 * และส่งข้อความไปยังผู้ใช้ในสถานการณ์ต่างๆ เช่น การลงทะเบียน, การฝากเงิน, การถอนเงิน, และการโอนเงิน
 * @module services/line
 * @requires utils/axios - Custom Axios instance for LINE Messaging API
 * @requires utils/line - Helper functions for creating Flex Message JSON
 * @requires libs/prisma - Prisma Client instance
 * @requires utils/ApiError - Custom Error class
 */
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";
import { pushMessage } from "../../../utils/axios.js";
import line, { flexMessage } from "../../../utils/line.js";
import prisma from "../../../libs/prisma.js";
import getBankIconUrl from "../../../utils/bankIcon.js";

const FLEX_MODE = {
    SAVE: "save",
    WITHDRAW: "withdraw",
    REGISTER: "register",
    RECEIVER: "receiver",
    SENDER: "sender",
};

const options: Intl.DateTimeFormatOptions = {
    year: "2-digit", // แสดงปีเป็นเลข 2 หลัก
    month: "short", // แสดงเดือนเป็นชื่อย่อ
    day: "numeric", // แสดงวันที่เป็นตัวเลข
    hour: "2-digit", // แสดงชั่วโมงเป็นเลข 2 หลัก
    minute: "2-digit", // แสดงนาทีเป็นเลข 2 หลัก
    timeZone: "Asia/Bangkok",
    // locale: "th-TH", // ใช้รูปแบบของภาษาไทย (Intl.DateTimeFormatOptions doesn't have locale, it's passed to constructor)
};

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", options);

const formatRecipientDisplay = (fullname: string, toString: string) => {
    // --- STAGE 1: การตรวจสอบความสมบูรณ์ของโครงสร้าง (Structural Integrity Check) ---
    // เกราะป้องกัน: ตรวจสอบว่าข้อมูลนำเข้าพื้นฐานมีอยู่จริงและอยู่ในรูปแบบที่คาดหวังหรือไม่
    if (!fullname || !toString || !toString.includes(" - ")) {
        console.warn(
            `Warning: Invalid input provided. Fullname: '${fullname}', To: '${toString}'. Returning fullname as fallback.`
        );
        return fullname;
    }

    // --- STAGE 2: การสกัดข้อมูล (Data Extraction) ---
    // แยกส่วนข้อความอย่างแม่นยำ
    const parts = toString.split(" - ");
    if (parts.length < 2) {
        console.warn(`Warning: Malformed 'toString': '${toString}'. Returning fullname as fallback.`);
        return fullname;
    }
    const accountNumberRaw = parts[1].trim();

    // --- STAGE 3: การชำระล้างและตรวจสอบข้อมูล (Sanitization & Validation) ---
    // เกราะป้องกัน: กรองเอาเฉพาะตัวเลขและตรวจสอบความยาว
    const digitsOnly = accountNumberRaw.replace(/\D/g, "");
    if (digitsOnly.length < 5) {
        console.warn(
            `Warning: Account number '${digitsOnly}' is too short for masking. Returning fullname as fallback.`
        );
        return fullname;
    }

    // --- STAGE 4: การแปลงข้อมูล (Transformation) ---
    const lastFiveDigits = digitsOnly.slice(-5); // ดึง 5 ตัวสุดท้าย (เช่น "93200")
    const middleThree = lastFiveDigits.substring(1, 4); // ดึง 3 ตัวตรงกลาง (เช่น "320")
    const maskedPart = `X${middleThree}X`; // ประกอบสร้างส่วนที่มาสก์ (เช่น "X320X")

    return `${fullname} ${maskedPart}`;
};
// const devId = process.env.DEV_LINE_USER_ID;

/**
 * ส่ง Flex Message ต้อนรับผู้ใช้ใหม่หลังลงทะเบียนสำเร็จ
 * @description ดึงข้อมูลผู้ใช้จากฐานข้อมูล, จัดรูปแบบข้อมูล, สร้าง Flex Message,
 * และส่งไปยังผู้ใช้ผ่าน LINE Messaging API
 * @async
 * @param {string} line_user_id - Line User ID ของผู้ใช้ใหม่
 * @returns {Promise<object>} Promise ที่ resolve เป็นข้อมูลการตอบกลับจาก LINE API
 * @throws {ApiError} หากไม่พบผู้ใช้หรือการส่งข้อความล้มเหลว
 */
const sendRegisterFlexMessage = async (line_user_id: string) => {
    if (!line_user_id) throw new ApiError(httpStatus.BAD_REQUEST, "line user id is required");

    const user = await prisma.user.findUnique({
        where: {
            line_user_id,
        },
        select: {
            phone: true,
            fullname: true,
            wallet: {
                select: {
                    walletUniqueId: true,
                    balance: true,
                },
            },
        },
    });

    if (!user || !user.wallet) throw new ApiError(httpStatus.NOT_FOUND, "user not found");

    const formattedBalance = user.wallet.balance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const payload = {
        walletUniqueId: user.wallet.walletUniqueId,
        fullname: user.fullname,
        phone: user.phone,
        balance: formattedBalance,
    };

    // ส่งไปอีก provider คนละ id กันกับในแอปปัจจุบัน
    const flex = flexMessage(FLEX_MODE.REGISTER, line_user_id, payload);
    const response = await pushMessage(flex);
    console.log(response.data);
    if (response.status !== 200) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send LINE message");
    return response.data;
};

/**
 * ส่ง Flex Message แจ้งเตือนการฝากเงินสำเร็จ
 * @description จัดรูปแบบข้อมูลวันที่, จำนวนเงิน, และข้อมูลธนาคาร, จากนั้นสร้างและส่ง Flex Message
 * @async
 * @param {string} line_user_id - Line User ID ของผู้รับ
 * @param {number} amount - จำนวนเงินที่ฝาก
 * @param {number} balance - ยอดเงินคงเหลือล่าสุด
 * @param {string} walletUniqueId - รหัส Wallet ของผู้ใช้
 * @param {string} senderName - ชื่อผู้โอน
 * @param {string} senderBankNumber - เลขบัญชีผู้โอน
 * @param {string} senderBankName - ชื่อธนาคารผู้โอน
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @returns {Promise<object>} Promise ที่ resolve เป็นข้อมูลการตอบกลับจาก LINE API
 */
const sendDepositFlexMessage = async (
    line_user_id: string,
    amount: number,
    balance: number,
    walletUniqueId: string,
    senderName: string,
    senderBankNumber: string,
    senderBankName: string,
    updatedDate: Date
) => {
    const formattedDate = thaiDateFormatter.format(updatedDate);
    const bankNumber = "X" + senderBankNumber.slice(-4);
    const formattedBankName = senderBankName.replace("ธนาคาร", "");
    const bankImageUrl = getBankIconUrl(senderBankName);

    const formattedAmount = amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const formattedBalance = balance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const payload = {
        amount: formattedAmount,
        fullnameWithBankNumber: senderName + " " + bankNumber,
        walletUniqueId,
        date: formattedDate,
        balance: formattedBalance,
        bankName: formattedBankName,
        bankImageUrl,
        liffHistoryUrl: `${process.env.LIFF_URL}/history`,
    };

    // ON PRODUCTION DELETE line_user_id AND USE line_user_id
    // (RULE) MESSAGING API && LIFF (SAME PROVIDER!!)
    const flex = line.flexMessage(FLEX_MODE.SAVE, line_user_id, payload);
    const response = await pushMessage(flex);
    // console.log(response.data);
    if (!response.data) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "SEND_LINE_FAIL");
    return response.data;
};

/**
 * ส่ง Flex Message แจ้งเตือนการถอนเงินสำเร็จ
 * @description จัดรูปแบบข้อมูลวันที่, จำนวนเงิน, และข้อมูลผู้รับ, จากนั้นสร้างและส่ง Flex Message
 * @async
 * @param {string} line_user_id - Line User ID ของผู้รับ
 * @param {number} amount - จำนวนเงินที่ถอน
 * @param {number} balance - ยอดเงินคงเหลือล่าสุด
 * @param {string} walletUniqueId - รหัส Wallet ของผู้ใช้
 * @param {string} fullname - ชื่อเต็มของผู้ใช้
 * @param {string} to - ข้อมูลบัญชีผู้รับ (เช่น 'ธนาคารไทยพาณิชย์ - 1234567890')
 * @param {string} bank - ชื่อธนาคารผู้รับ
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @returns {Promise<object>} Promise ที่ resolve เป็นข้อมูลการตอบกลับจาก LINE API
 */
const sendWithdrawSuccessFlex = async (
    line_user_id: string,
    amount: number,
    balance: number,
    walletUniqueId: string,
    fullname: string,
    to: string,
    bank: string,
    updatedDate: Date
) => {
    // ถอนเงินน่าจะมาจาก dashboard
    // userId, senderName, senderBankNumber, senderBankName, amount, updatedDate, to
    // const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", options); // Already defined globally
    const formattedDate = thaiDateFormatter.format(updatedDate);
    const formattedAmount = amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const formattedBalance = balance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const toDisplay = formatRecipientDisplay(fullname, to);
    const bankLogoUrl = getBankIconUrl(bank);
    const formattedBankName = bank.replace("ธนาคาร", "");

    const payload = {
        amount: formattedAmount,
        walletUniqueId,
        toDisplay,
        bankImageUrl: bankLogoUrl,
        bankName: formattedBankName,
        date: formattedDate,
        balance: formattedBalance,
        liffHistoryUrl: `${process.env.LIFF_URL}/history`,
    };
    // case จริงจะใช้ line_user_id
    // line_user_id ต้องอยู่ใน provider เดียวกับ messaging api
    const flex = line.flexMessage(FLEX_MODE.WITHDRAW, line_user_id, payload);
    const response = await pushMessage(flex);
    if (response.status !== 200) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send LINE message");
    return response.data;
};

/**
 * ส่ง Flex Message สรุปรายการให้ "ผู้ส่ง" ในการโอนเงินภายในระบบ
 * @async
 * @param {string} senderLineId - Line User ID ของผู้ส่ง
 * @param {number} sendingAmount - จำนวนเงินที่โอน
 * @param {string} senderWalletUniqueId - รหัส Wallet ของผู้ส่ง
 * @param {string} receiverWalletUniqueId - รหัส Wallet ของผู้รับ
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @param {number} senderBalance - ยอดเงินคงเหลือล่าสุดของผู้ส่ง
 * @param {string} liffUrlHistory - URL ไปยังหน้าประวัติการทำรายการใน LIFF
 * @returns {Promise<void>}
 */
const sendSenderFlex = async (
    senderLineId: string,
    sendingAmount: number,
    senderWalletUniqueId: string,
    receiverWalletUniqueId: string,
    updatedDate: Date,
    senderBalance: number,
    liffUrlHistory: string
) => {
    const formattedAmount = sendingAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const formattedDate = thaiDateFormatter.format(updatedDate);
    const formattedBalance = senderBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const flex = line.sendSender(
        senderLineId,
        senderWalletUniqueId,
        receiverWalletUniqueId,
        liffUrlHistory,
        formattedAmount,
        formattedDate,
        formattedBalance
    );

    await pushMessage(flex);
};

/**
 * ส่ง Flex Message แจ้งเตือนการได้รับเงินให้ "ผู้รับ" ในการโอนเงินภายในระบบ
 * @async
 * @param {string} receiverLineId - Line User ID ของผู้รับ
 * @param {number} receivingAmount - จำนวนเงินที่ได้รับ
 * @param {string} senderWalletUniqueId - รหัส Wallet ของผู้ส่ง
 * @param {string} receiverWalletUniqueId - รหัส Wallet ของผู้รับ
 * @param {Date} updatedDate - วันที่และเวลาที่ทำรายการ
 * @param {number} receiverBalance - ยอดเงินคงเหลือล่าสุดของผู้รับ
 * @param {string} liffUrlHistory - URL ไปยังหน้าประวัติการทำรายการใน LIFF
 * @returns {Promise<void>}
 */
const sendReceiverFlex = async (
    receiverLineId: string,
    receivingAmount: number,
    senderWalletUniqueId: string,
    receiverWalletUniqueId: string,
    updatedDate: Date,
    receiverBalance: number,
    liffUrlHistory: string
) => {
    const formattedAmount = receivingAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const formattedDate = thaiDateFormatter.format(updatedDate);
    const formattedBalance = receiverBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const flex = line.sendReceiver(
        receiverLineId,
        senderWalletUniqueId,
        receiverWalletUniqueId,
        liffUrlHistory,
        formattedAmount,
        formattedDate,
        formattedBalance
    );

    await pushMessage(flex);
};

export default {
    sendRegisterFlexMessage,
    sendDepositFlexMessage,
    sendWithdrawSuccessFlex,
    sendSenderFlex,
    sendReceiverFlex,
};
