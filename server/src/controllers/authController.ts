import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { googleAuthService } from '../services/googleAuthService';
import { subscriptionService } from '../services/subscriptionService';
import { User } from '../models/User';
import { OptionChainApiResponse } from '../types/optionChain';

/**
 * POST /api/auth/google
 * Authenticate with Google ID / OAuth payload
 */
export const loginWithGoogle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, googleId, picture, phone } = req.body;

    if (!email || !name) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'email and name are required fields for Google authentication.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { token, userStatus } = await googleAuthService.authenticateGoogleUser({
      email,
      name,
      googleId,
      picture,
      phone
    });

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Successfully authenticated with BIW OI Mantra.',
      token,
      data: userStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user profile, calculated days remaining, and support info
 */
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Authentication required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userStatus = await subscriptionService.getUserStatusResponse(req.user);

    res.status(200).json({
      success: true,
      status: 'ok',
      data: userStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/profile
 * Update user profile details (phone, name)
 */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Authentication required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { name, phone } = req.body;
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;

    await req.user.save();
    const userStatus = await subscriptionService.getUserStatusResponse(req.user);

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Profile updated successfully.',
      data: userStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/preferences
 * Update UI preferences (theme: dark / light)
 */
export const updatePreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Authentication required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { theme } = req.body;
    if (theme && (theme === 'dark' || theme === 'light')) {
      req.user.preferences.theme = theme;
      await req.user.save();
    }

    const userStatus = await subscriptionService.getUserStatusResponse(req.user);

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Preferences updated successfully.',
      data: userStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};
