import transactionController from '../controllers/transaction.controller.js';
import { Router } from 'express';
import multer from 'multer';
import validate from '../middlewares/validate.js';
const upload = multer();
const transactionRouter = Router();

transactionRouter.post('/:walletId', upload.single('slipImage'), transactionController.createTransaction);
transactionRouter.get('/:walletId', transactionController.getTransactions);
transactionRouter.get('/success/:walletId', transactionController.getSuccessTransactions);

export default transactionRouter;
