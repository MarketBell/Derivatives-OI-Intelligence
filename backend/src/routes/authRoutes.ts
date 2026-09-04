import { Router } from 'express';
import {
  emailLogin,
  loginWithGoogle,
  getCurrentUser,
  updateProfile,
  updatePreferences
} from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', emailLogin);
router.post('/google', loginWithGoogle);
router.get('/me', authenticateJWT, getCurrentUser);
router.put('/profile', authenticateJWT, updateProfile);
router.put('/preferences', authenticateJWT, updatePreferences);

export default router;
