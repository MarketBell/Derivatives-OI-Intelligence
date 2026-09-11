import { Router } from 'express';
import {
  getSubscriptionStatus,
  adminGrantAccess,
  adminApproveUser,
  adminActivatePaid,
  adminListUsers,
  adminRevokeAccess,
  adminGetPaymentProof
} from '../controllers/subscriptionController';
import { authenticateJWT, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/status', authenticateJWT, getSubscriptionStatus);
router.get('/users', authenticateJWT, requireAdmin, adminListUsers);
router.get('/payment-proof/:identifier', authenticateJWT, requireAdmin, adminGetPaymentProof);
router.post('/admin-grant', authenticateJWT, requireAdmin, adminGrantAccess);
router.post('/admin-approve', authenticateJWT, requireAdmin, adminApproveUser);
router.post('/admin-revoke', authenticateJWT, requireAdmin, adminRevokeAccess);
router.post('/manual-activate', authenticateJWT, requireAdmin, adminActivatePaid);

export default router;
