import { TransactionStatus } from "../../../generated/prisma";

export type CreateSavingTransactionBody = {
  walletId: string;
  userId: string;
};

export type WithdrawDetails = {
  bank: string;
  accountNumber: string;
  accountName: string;
};

export type TransferData = {
  line_user_id: string;
  recipientUserId: string;
  amount: number | string;
  pin: string | number;
};

export type TransactionQueryOptions = {
  year?: number;
  month?: number;
};

export type AdminTransactionQueryOptions = {
  page?: number;
  pageSize?: number;
  sort?: "amount" | "createdAt";
  order?: "asc" | "desc";
  status?:
    | "ALL"
    | "PENDING"
    | "SUCCESS"
    | "REJECTED"
    | "CANCELLED"
    | "INCOME"
    | "OUTCOME"
    | "TRANSFER"
    | "WITHDRAW"
    | "DEPOSIT"
    | "REWARD";
};



export type ApproveSenderInfo = {
  account: { name: string; bank: { account: string } };
  bank: { name: string };
};

export type ApproveDepositData = {
  userId: string;
  amount: string | number;
  sender: ApproveSenderInfo;
};

export type ApproveWithdrawData = {
  status: "SUCCESS";
  amount: string | number;
  description: string;
};

export type RejectWithdrawData = {
  status: "REJECTED";
  description: string;
};

export type EditTransactionData = {
  from: string;
  to: string;
  description: string;
  status: string;
  type: string;
  amount: string | number;
  slipImageUrl?: string;
};

export type RejectionData = { code: string; reason?: string };
