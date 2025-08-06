import multer from 'multer';
import transactionController from '../controllers/transaction.controller.js';
import { Router } from 'express';
import catchAsync from '../utils/catchAsync.js';

const transactionRouter = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

transactionRouter.post('/', upload.single('slipImage'), transactionController.createSavingTransaction);
transactionRouter.get('/:walletId', transactionController.getTransactions);
transactionRouter.get('/thai/:walletId', transactionController.getThaiTransactions);
transactionRouter.get('/success/:walletId', transactionController.getSuccessTransactions);

export default transactionRouter;
