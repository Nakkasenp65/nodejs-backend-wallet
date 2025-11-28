export type LineRegisterPayload = {
  walletUniqueId: string;
  fullname: string;
  phone: string;
  balance: string;
};

export type LineSavePayload = {
  amount: string;
  fullnameWithBankNumber: string;
  walletUniqueId: string;
  date: string;
  balance: string;
  bankImageUrl: string;
  bankName: string;
  liffHistoryUrl: string;
};

export type LineWithdrawPayload = {
  amount: string | number;
  walletUniqueId: string;
  toDisplay: string;
  bankImageUrl?: string;
  bankName: string;
  date?: string;
  updatedDate?: Date | string;
  balance: string | number;
  liffHistoryUrl?: string;
};

export type LineReceiverPayload = {
  senderWalletUniqueId: string;
  receiverWalletUniqueId: string;
  liffUrlHistory: string;
  formattedAmount: string;
  formattedDate: string;
  formattedBalance: string;
};

export type LineSenderPayload = {
  senderWalletUniqueId: string;
  receiverWalletUniqueId: string;
  liffUrlHistory: string;
  formattedAmount: string;
  formattedDate: string;
  formattedBalance: string;
};
