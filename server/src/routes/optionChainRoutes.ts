import { Router } from 'express';
import {
  getLatestOptionChain,
  getAvailableDates,
  getTimeSeriesData,
  postSnapshot,
  triggerLiveFetch
} from '../controllers/optionChainController';
import { authenticateJWT, requireDashboardAccess } from '../middleware/authMiddleware';

const router = Router();

// Apply Auth & Subscription Access Protection (Controlled via ENFORCE_SUBSCRIPTION flag)
router.use(authenticateJWT, requireDashboardAccess);

router.get('/', getLatestOptionChain);
router.get('/dates', getAvailableDates);
router.get('/time-series', getTimeSeriesData);
router.post('/snapshot', postSnapshot);
router.post('/fetch', triggerLiveFetch);

export default router;
