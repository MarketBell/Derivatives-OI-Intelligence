import { Router } from 'express';
import {
  register,
  emailLogin,
  completeLegacySetup,
  forgotPassword,
  resetPassword,
  loginWithGoogle,
  getCurrentUser,
  updateProfile,
  updatePreferences
} from '../controllers/authController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', emailLogin);
router.post('/complete-legacy-setup', completeLegacySetup);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/google', loginWithGoogle);
router.get('/me', authenticateJWT, getCurrentUser);
router.put('/profile', authenticateJWT, updateProfile);
router.put('/preferences', authenticateJWT, updatePreferences);

export default router;
