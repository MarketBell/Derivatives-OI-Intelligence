import { Router } from 'express';
import {
  getLatestOptionChain,
  getAvailableDates,
  getTimeSeriesData,
  postSnapshot,
  triggerLiveFetch,
  getCollectionStatus,
  startCollectorHandler,
  stopCollectorHandler
} from '../controllers/optionChainController';
import { authenticateJWT, requireDashboardAccess } from '../middleware/authMiddleware';

const router = Router();

// Apply Auth & Subscription Access Protection (Controlled via ENFORCE_SUBSCRIPTION flag)
router.use(authenticateJWT, requireDashboardAccess);

router.get('/', getLatestOptionChain);
router.get('/dates', getAvailableDates);
router.get('/time-series', getTimeSeriesData);
router.get('/collection-status', getCollectionStatus);
router.post('/snapshot', postSnapshot);
router.post('/fetch', triggerLiveFetch);
router.post('/collector/start', startCollectorHandler);
router.post('/collector/stop', stopCollectorHandler);

export default router;

