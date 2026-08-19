import { Router } from 'express';
import { getOptionChain } from '../controllers/optionChainController';

const router = Router();

// GET /api/option-chain
router.get('/', getOptionChain);

export default router;
