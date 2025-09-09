import walletController from './wallet.controller.js';
import auth from '../../../middlewares/auth.js';
import { Router } from 'express';

const walletRouter = Router();

walletRouter.post('/:transactionId', auth, walletController.confirmWalletAmount);
walletRouter.get('/:userId', auth, walletController.getUserWallet);

export default walletRouter;
