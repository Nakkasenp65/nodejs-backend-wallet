import ApiError from "../../../utils/ApiError.js";
import httpStatus from "http-status";
import { pushMessage } from "../../../utils/axios.js";
import line, { flexMessage } from "../../../utils/line.js";
import prisma from "../../../libs/prisma.js";
import getBankIconUrl from "../../../utils/bankIcon.js";
import { BANK_DATA } from "../../../utils/bankData.js";
import { Receiver } from "@upstash/qstash";

const FLEX_MODE = {
  SAVE: "save",
  WITHDRAW: "withdraw",
  REGISTER: "register",
  RECEIVER: "receiver",
  SENDER: "sender",
};

const options = {
  year: "2-digit", // แสดงปีเป็นเลข 2 หลัก
  month: "short", // แสดงเดือนเป็นชื่อย่อ
  day: "numeric", // แสดงวันที่เป็นตัวเลข
  hour: "2-digit", // แสดงชั่วโมงเป็นเลข 2 หลัก
  minute: "2-digit", // แสดงนาทีเป็นเลข 2 หลัก
  timeZone: "Asia/Bangkok",
  locale: "th-TH", // ใช้รูปแบบของภาษาไทย
};

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", options);

const formatRecipientDisplay = (fullname, toString) => {
  // --- STAGE 1: การตรวจสอบความสมบูรณ์ของโครงสร้าง (Structural Integrity Check) ---
  // เกราะป้องกัน: ตรวจสอบว่าข้อมูลนำเข้าพื้นฐานมีอยู่จริงและอยู่ในรูปแบบที่คาดหวังหรือไม่
  if (!fullname || !toString || !toString.includes(" - ")) {
    console.warn(
      `Warning: Invalid input provided. Fullname: '${fullname}', To: '${toString}'. Returning fullname as fallback.`,
    );
    return fullname;
  }

  // --- STAGE 2: การสกัดข้อมูล (Data Extraction) ---
  // แยกส่วนข้อความอย่างแม่นยำ
  const parts = toString.split(" - ");
  if (parts.length < 2) {
    console.warn(
      `Warning: Malformed 'toString': '${toString}'. Returning fullname as fallback.`,
    );
    return fullname;
  }
  const accountNumberRaw = parts[1].trim();

  // --- STAGE 3: การชำระล้างและตรวจสอบข้อมูล (Sanitization & Validation) ---
  // เกราะป้องกัน: กรองเอาเฉพาะตัวเลขและตรวจสอบความยาว
  const digitsOnly = accountNumberRaw.replace(/\D/g, "");
  if (digitsOnly.length < 5) {
    console.warn(
      `Warning: Account number '${digitsOnly}' is too short for masking. Returning fullname as fallback.`,
    );
    return fullname;
  }

  // --- STAGE 4: การแปลงข้อมูล (Transformation) ---
  const lastFiveDigits = digitsOnly.slice(-5); // ดึง 5 ตัวสุดท้าย (เช่น "93200")
  const middleThree = lastFiveDigits.substring(1, 4); // ดึง 3 ตัวตรงกลาง (เช่น "320")
  const maskedPart = `X${middleThree}X`; // ประกอบสร้างส่วนที่มาสก์ (เช่น "X320X")

  return `${fullname} ${maskedPart}`;
};

const devId = process.env.DEV_LINE_USER_ID;

const sendRegisterFlexMessage = async (line_user_id) => {
  if (!line_user_id)
    throw new ApiError(httpStatus.BAD_REQUEST, "line user id is required");

  const user = await prisma.user.findUnique({
    where: {
      line_user_id: line_user_id,
    },
    select: {
      phone: true,
      fullname: true,
      wallet: {
        select: {
          balance: true,
          walletUniqueId: true,
        },
      },
    },
  });

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "user not found");

  const payload = {
    walletUniqueId: user.wallet.walletUniqueId,
    fullname: user.fullname,
    phone: user.phone,
    balance: user.wallet.balance,
  };

  // ส่งไปอีก provider คนละ id กันกับในแอปปัจจุบัน
  const flex = flexMessage(FLEX_MODE.WITHDRAW, devId, payload);
  const response = await pushMessage(flex);
  console.log(response.data);
  if (!response.status === 200)
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
  return response.data;
};

const sendDepositFlexMessage = async (
  line_user_id,
  amount,
  balance,
  walletUniqueId,
  senderName,
  senderBankNumber,
  senderBankName,
  updatedDate,
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

  // ON PRODUCTION DELETE DEVID AND USE line_user_id
  // (RULE) MESSAGING API && LIFF (SAME PROVIDER!!)
  const flex = line.flexMessage(FLEX_MODE.SAVE, devId, payload);
  const { data } = await pushMessage(flex);
  console.log(response.data);
  if (!data)
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "SEND_LINE_FAIL");
  return response.data;
};

const sendWithdrawSuccessFlex = async (
  line_user_id,
  amount,
  balance,
  walletUniqueId,
  fullname,
  to,
  bank,
  updatedDate,
) => {
  // ถอนเงินน่าจะมาจาก dashboard
  // userId, senderName, senderBankNumber, senderBankName, amount, updatedDate, to
  const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", options);
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
  const formattedBankName = senderBankName.replace("ธนาคาร", "");

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
  const flex = line.flexMessage(FLEX_MODE.WITHDRAW, devId, payload);
  const response = await pushMessage(flex);
  if (!response.status === 200)
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
  return response.data;
};

const sendSenderFlex = async (
  senderLineId,
  sendingAmount,
  senderWalletUniqueId,
  receiverWalletUniqueId,
  updatedDate,
  senderBalance,
  liffUrlHistory,
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

  const flex = line.flexMessage(FLEX_MODE.SENDER, devId, {
    senderWalletUniqueId,
    receiverWalletUniqueId,
    liffUrlHistory,
    formattedAmount,
    formattedDate,
    formattedBalance,
  });

  await pushMessage(flex);
};

const sendReceiverFlex = async (
  receiverLineId,
  receivingAmount,
  senderWalletUniqueId,
  receiverWalletUniqueId,
  updatedDate,
  receiverBalance,
  liffUrlHistory,
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

  const flex = line.flexMessage(FLEX_MODE.RECEIVER, devId, {
    senderWalletUniqueId,
    receiverWalletUniqueId,
    liffUrlHistory,
    formattedAmount,
    formattedDate,
    formattedBalance,
  });

  await pushMessage(flex);
};

export default {
  sendRegisterFlexMessage,
  sendDepositFlexMessage,
  sendWithdrawSuccessFlex,
  sendSenderFlex,
  sendReceiverFlex,
};
