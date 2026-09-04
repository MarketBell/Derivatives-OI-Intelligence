import { Router } from 'express';
import {
  getSubscriptionStatus,
  adminGrantAccess,
  adminActivatePaid,
  adminListUsers,
  adminRevokeAccess
} from '../controllers/subscriptionController';
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/status', authenticateJWT, getSubscriptionStatus);
router.get('/users', authenticateJWT, requireAdmin, adminListUsers);
router.post('/admin-grant', authenticateJWT, requireAdmin, adminGrantAccess);
router.post('/admin-revoke', authenticateJWT, requireAdmin, adminRevokeAccess);
router.post('/manual-activate', authenticateJWT, requireAdmin, adminActivatePaid);

export default router;

