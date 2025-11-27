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
  year?: number | string;
  month?: number | string;
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

export type EditTransactionUpdate = {
  amount?: number | string;
  status?: "PENDING" | "SUCCESS" | "REJECTED" | "CANCELLED";
  slipImageUrl?: string;
  description?: string;
  bank?: string;
  from?: string;
  to?: string;
  verified?: boolean;
  verifiedAmount?: number;
  name?: string;
  type?: "INCOME" | "OUTCOME" | "TRANSFER" | "WITHDRAW" | "DEPOSIT" | "REWARD";
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

export type RejectionData = { code: string; reason?: string };

