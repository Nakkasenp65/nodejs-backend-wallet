import ApiError from '../../src/utils/ApiError.js';
import httpStatus from 'http-status';
import { lineAxios } from '../../src/utils/axios.js';
import line, { flexMessage } from '../../src/utils/line.js';
import prisma from '../../src/libs/prisma.js';
import getBankIconUrl from '../../src/utils/bankIcon.js';

const FLEX_MODE = {
  SAVE: 'save',
  WITHDRAW: 'withdraw',
  REGISTER: 'register',
};

const devId = process.env.DEV_LINE_USER_ID;

const sendRegisterFlexMessage = async (line_user_id) => {
  if (!line_user_id) throw new ApiError(httpStatus.BAD_REQUEST, 'line user id is required');

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

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'user not found');

  const payload = {
    walletUniqueId: user.wallet.walletUniqueId,
    fullname: user.fullname,
    phone: user.phone,
    balance: user.wallet.balance,
  };

  // ส่งไปอีก provider คนละ id กันกับในแอปปัจจุบัน
  const flexData = flexMessage(FLEX_MODE.WITHDRAW, devId, payload);
  const response = await lineAxios('https://api.line.me/v2/bot/message/push', flexData);
  console.log(response.data);
  if (!response.status === 200) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
  return response.data;
};

const sendDepositFlexMessage = async (userId, senderName, senderBankNumber, senderBankName, amount, updatedDate) => {
  if ((!userId, !senderName, !senderBankNumber, !senderBankName, !amount)) throw new ApiError(httpStatus.BAD_REQUEST);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      wallet: {
        select: {
          balance: true,
          walletUniqueId: true,
        },
      },
    },
  });

  const options = {
    year: '2-digit', // แสดงปีเป็นเลข 2 หลัก
    month: 'short', // แสดงเดือนเป็นชื่อย่อ
    day: 'numeric', // แสดงวันที่เป็นตัวเลข
    hour: '2-digit', // แสดงชั่วโมงเป็นเลข 2 หลัก
    minute: '2-digit', // แสดงนาทีเป็นเลข 2 หลัก
    timeZone: 'Asia/Bangkok',
    locale: 'th-TH', // ใช้รูปแบบของภาษาไทย
  };

  const thaiDateFormatter = new Intl.DateTimeFormat('th-TH', options);
  const formattedDate = thaiDateFormatter.format(updatedDate);
  const bankNumber = 'X' + senderBankNumber.slice(-4);
  const formattedBankName = senderBankName.replace('ธนาคาร', '');
  const bankImageUrl = getBankIconUrl(senderBankName);

  const payload = {
    amount: amount,
    fullnameWithBankNumber: senderName + ' ' + bankNumber,
    walletUniqueId: user.wallet.walletUniqueId,
    date: formattedDate,
    balance: user.wallet.balance,
    bankName: formattedBankName,
    bankIcon: bankImageUrl,
  };

  const flex = line.flexMessage(FLEX_MODE.SAVE, devId, payload);
  const response = await lineAxios('https://api.line.me/v2/bot/message/push', flexData);
  console.log(response.data);
  if (!response.status === 200) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
  return response.data;
};

const sendWithdrawSuccessFlex = async (userId, senderName, senderBankNumber, senderBankName, amount, updatedDate) => {
  // ถอนเงินน่าจะมาจาก dashboard
  const flex = line.flexMessage(FLEX_MODE.WITHDRAW, devId);
  const response = await lineAxios('https://api.line.me/v2/bot/message/push', flex);
  if (!response.status === 200) throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR);
  return response.data;
};

export default {
  sendRegisterFlexMessage,
  sendDepositFlexMessage,
  sendWithdrawSuccessFlex,
};
