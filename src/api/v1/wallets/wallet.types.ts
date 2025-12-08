export interface Wallet {
  id: string;
  balance: number;
  bonusBalance: number;
  walletUniqueId: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
