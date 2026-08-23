import { Router } from 'express';
import {
  getSubscriptionStatus,
  adminGrantAccess,
  adminActivatePaid
} from '../controllers/subscriptionController';
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/status', authenticateJWT, getSubscriptionStatus);
router.post('/admin-grant', authenticateJWT, requireAdmin, adminGrantAccess);
router.post('/manual-activate', authenticateJWT, requireAdmin, adminActivatePaid);

export default router;
