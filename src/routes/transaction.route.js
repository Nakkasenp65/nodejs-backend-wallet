import transactionController from '../controllers/transaction.controller.js';
import { Router } from 'express';
import validate from '../middlewares/validate.js';

const transactionRouter = Router();

transactionRouter.post('/:walletId', transactionController.createTransaction);
transactionRouter.get('/:walletId', transactionController.getTransactions);

export default transactionRouter;
