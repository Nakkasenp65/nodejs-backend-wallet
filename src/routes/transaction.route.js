import transactionController from '../controllers/transaction.controller.js';
import { Router } from 'express';
import validate from '../middlewares/validate.js';

const transactionRouter = Router();

transactionRouter.post('/:userId', transactionController.createTransaction);
transactionRouter.get('/:userId', transactionController.getTransactions);

export default transactionRouter;
