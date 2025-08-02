import walletController from '../controllers/wallet.controller.js';
import { Router } from 'express';

const walletRouter = Router();

walletRouter.post('/:transactionId', walletController.confirmWalletAmount);
walletRouter.get('/:transactionId', (req, res) => {
  res.send('confirmedAmount');
});

export default walletRouter;
