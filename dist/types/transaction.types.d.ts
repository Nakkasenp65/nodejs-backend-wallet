/**
 * Type definitions for Transaction module
 * This file can be used even with JS files via JSDoc
 */
import { TransactionStatus, Transaction, Wallet, User } from "../generated/prisma/index.js";
export interface CreateSavingTransactionBody {
    walletId: string;
    userId: string;
    from?: string;
}
export interface CreateWithdrawRequestBody {
    userId: string;
    amount: number;
    bank: string;
    accountNumber: string;
    accountName: string;
}
export interface CreateInternalTransferBody {
    userId: string;
    recipientUserId: string;
    amount: number;
    pin: string;
    line_user_id: string;
}
export interface ApproveTransactionBody {
    userId: string;
    amount: number;
    sender?: string;
}
export interface RejectTransactionBody {
    code: string;
    reason?: string;
}
export interface TransactionWithRelations extends Transaction {
    fromWallet?: (Wallet & {
        user: Pick<User, "line_display_name">;
    }) | null;
    toWallet?: (Wallet & {
        user: Pick<User, "line_display_name">;
    }) | null;
}
export interface PaginatedTransactionsResponse {
    data: TransactionWithRelations[];
    paging: {
        mode: "offset";
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export interface WithdrawalDetails {
    bank: string;
    accountNumber: string;
    accountName: string;
}
export interface TransferData {
    line_user_id: string;
    recipientUserId: string;
    amount: number;
    pin: string;
}
export interface GetTransactionsOptions {
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: "asc" | "desc";
    status?: TransactionStatus | "ALL";
}
export interface GetWalletTransactionsOptions {
    year?: number | string;
    month?: number | string;
}
//# sourceMappingURL=transaction.types.d.ts.map