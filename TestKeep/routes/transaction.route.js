import multer from 'multer';
import transactionController from '../controllers/transaction.controller.js';
import { Router } from 'express';
import catchAsync from '../utils/catchAsync.js';

const transactionRouter = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

transactionRouter.post('/', upload.single('slipImage'), transactionController.createSavingTransaction);
transactionRouter.post('/withdraw', transactionController.createWithdrawTransaction);
transactionRouter.post('/transfer', transactionController.createInternalTransfer);
transactionRouter.post('/update/:transactionId', transactionController.updateTransaction);
transactionRouter.post('/export', transactionController.exportToPdf);
transactionRouter.get('/:walletId', transactionController.getWalletTransactions);
transactionRouter.get('/thai/:walletId', transactionController.getThaiTransactions);
transactionRouter.get('/success/:walletId', transactionController.getSuccessTransactions);

export default transactionRouter;
