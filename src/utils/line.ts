import ApiError from "./ApiError.js";
import httpStatus from "http-status";
import { buildRegisterFlex, buildSaveFlex, buildWithdrawFlex, buildReceiverFlex, buildSenderFlex } from "./flex.js";
import {
  LineReceiverPayload,
  LineRegisterPayload,
  LineSavePayload,
  LineSenderPayload,
  LineWithdrawPayload,
} from "../types/line.types.js";

// ========== EXTRACTED STANDALONE FUNCTIONS ==========

/**
 * Send registration success flex message
 * @param line_user_id - LINE user ID
 * @param payload - { walletUniqueId, fullname, phone, balance }
 */
export const sendRegisterFlexMessage = (line_user_id: string, payload: LineRegisterPayload) => {
  return buildRegisterFlex(line_user_id, payload);
};

/**
 * Send deposit success flex message
 * @param line_user_id - LINE user ID
 * @param payload - { amount, fullnameWithBankNumber, walletUniqueId, date, balance, bankImageUrl, bankName, liffHistoryUrl }
 */
export const sendDepositFlexMessage = (line_user_id: string, payload: LineSavePayload) => {
  return buildSaveFlex(line_user_id, payload);
};

/**
 * Send withdrawal success flex message
 * @param line_user_id - LINE user ID
 * @param amount - Withdrawal amount
 * @param balance - Current balance
 * @param walletUniqueId - Wallet unique ID
 * @param accountName - Account name
 * @param accountNumber - Account number
 * @param bankName - Bank name
 * @param updatedDate - Transaction date
 */
export const sendWithdrawSuccessFlex = (
  line_user_id: string,
  amount: number,
  balance: number,
  walletUniqueId: string,
  accountName: string,
  bankName: string,
  updatedDate: Date,
) => {
  const payload: LineWithdrawPayload = {
    amount,
    balance,
    walletUniqueId,
    toDisplay: accountName,
    bankName,
    updatedDate,
  };
  return buildWithdrawFlex(line_user_id, payload);
};

/**
 * Send transfer received flex message
 * @param line_user_id - LINE user ID
 * @param senderWalletUniqueId - Sender wallet ID
 * @param receiverWalletUniqueId - Receiver wallet ID
 * @param liffUrlHistory - LIFF history URL
 * @param formattedAmount - Formatted amount
 * @param formattedDate - Formatted date
 * @param formattedBalance - Formatted balance
 */
export const sendTransferReceivedFlex = (
  line_user_id: string,
  senderWalletUniqueId: string,
  receiverWalletUniqueId: string,
  liffUrlHistory: string,
  formattedAmount: string,
  formattedDate: string,
  formattedBalance: string,
) => {
  const payload: LineReceiverPayload = {
    senderWalletUniqueId,
    receiverWalletUniqueId,
    liffUrlHistory,
    formattedAmount,
    formattedDate,
    formattedBalance,
  };
  return buildReceiverFlex(line_user_id, payload);
};

/**
 * Send transfer sent flex message
 * @param line_user_id - LINE user ID
 * @param senderWalletUniqueId - Sender wallet ID
 * @param receiverWalletUniqueId - Receiver wallet ID
 * @param liffUrlHistory - LIFF history URL
 * @param formattedAmount - Formatted amount
 * @param formattedDate - Formatted date
 * @param formattedBalance - Formatted balance
 */
export const sendTransferSentFlex = (
  line_user_id: string,
  senderWalletUniqueId: string,
  receiverWalletUniqueId: string,
  liffUrlHistory: string,
  formattedAmount: string,
  formattedDate: string,
  formattedBalance: string,
) => {
  const payload: LineSenderPayload = {
    senderWalletUniqueId,
    receiverWalletUniqueId,
    liffUrlHistory,
    formattedAmount,
    formattedDate,
    formattedBalance,
  };

  return buildSenderFlex(line_user_id, payload);
};

// ========== ORIGINAL FLEXMESSAGE FUNCTION (kept for backward compatibility) ==========

export const flexMessage = (
  mode: "register" | "save" | "withdraw" | "receiver" | "sender",
  line_user_id: string,
  payload: any = {},
) => {
  switch (mode) {
    case "register":
      return buildRegisterFlex(line_user_id, payload);
    case "save":
      return buildSaveFlex(line_user_id, payload);
    case "withdraw":
      return buildWithdrawFlex(line_user_id, payload);
    case "receiver":
      return buildReceiverFlex(line_user_id, payload);
    case "sender":
      return buildSenderFlex(line_user_id, payload);
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid flex message mode");
  }
};

export const sendReceiver = sendTransferReceivedFlex;

export default {
  sendRegisterFlexMessage,
  sendDepositFlexMessage,
  sendWithdrawSuccessFlex,
  sendTransferReceivedFlex,
  sendTransferSentFlex,
};
