import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { googleAuthService } from '../services/googleAuthService';
import { subscriptionService } from '../services/subscriptionService';
import { jwtService } from '../services/jwtService';
import { isDatabaseConnected } from '../config/database';
import { User } from '../models/User';
import { OptionChainApiResponse } from '../types/optionChain';

/**
 * POST /api/auth/login
 * Email-based authentication with strict backend RBAC check:
 * - billionitwealth@gmail.com -> Admin Role, access to Admin Portal & Dashboard
 * - Authorized email (in DB or memory grant with active status) -> User Role, access to Dashboard
 * - Unauthorized email -> 403 Forbidden with clear access denied message
 */
export const emailLogin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'A valid Gmail / Email address is required to sign in.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();
    const isAdmin = lowerEmail === 'billionitwealth@gmail.com' || (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === lowerEmail);

    if (isAdmin) {
      // Ensure admin exists in DB or memory
      let userDoc: any = null;
      if (isDatabaseConnected()) {
        userDoc = await User.findOne({ email: lowerEmail });
        if (!userDoc) {
          userDoc = new User({
            email: lowerEmail,
            name: 'Administrator',
            role: 'admin',
            accessType: 'admin_free',
            preferences: { theme: 'dark' }
          });
          await userDoc.save();
        } else {
          userDoc.role = 'admin';
          userDoc.accessType = 'admin_free';
          await userDoc.save();
        }
      }

      const token = jwtService.generateToken(userDoc?._id?.toString() || 'admin-root', lowerEmail, 'admin');
      res.status(200).json({
        success: true,
        status: 'ok',
        token,
        user: {
          id: userDoc?._id?.toString() || 'admin-root',
          email: lowerEmail,
          name: 'Administrator',
          role: 'admin',
          accessType: 'admin_free'
        },
        redirectTo: '/admin',
        message: 'Welcome Administrator. Access granted.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user is authorized in DB or memory
    let isAuthorized = false;
    let userName = lowerEmail.split('@')[0];
    let accessType: 'admin_free' | 'paid' | 'none' = 'none';
    let userId = `user-${Date.now()}`;

    if (isDatabaseConnected()) {
      const user = await User.findOne({ email: lowerEmail });
      if (user) {
        const sub = await subscriptionService.getActiveSubscription(user._id.toString());
        if (subscriptionService.checkUserAccess(user, sub)) {
          isAuthorized = true;
          userName = user.name || userName;
          accessType = user.accessType;
          userId = user._id.toString();
        }
      }
    } else {
      // Memory check
      const memList = await subscriptionService.listAuthorizedUsers();
      const memUser = memList.find((u) => u.email === lowerEmail);
      if (memUser && memUser.status === 'active' && memUser.accessType !== 'none') {
        isAuthorized = true;
        userName = memUser.name || userName;
        accessType = memUser.accessType;
        userId = memUser.id;
      }
    }

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        status: 'unauthorized',
        message: 'Access Denied: Your email is not authorized to access the OI Intelligence Dashboard. Please contact the administrator at billionitwealth@gmail.com to request access.',
        support: subscriptionService.getSupportDetails(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const token = jwtService.generateToken(userId, lowerEmail, 'user');
    res.status(200).json({
      success: true,
      status: 'ok',
      token,
      user: {
        id: userId,
        email: lowerEmail,
        name: userName,
        role: 'user',
        accessType
      },
      redirectTo: '/dashboard',
      message: 'Access granted. Welcome to OI Intelligence Dashboard.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

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
      user: {
        id: (req.user as any)._id ? (req.user as any)._id.toString() : (req.user as any).id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        accessType: req.user.accessType
      },
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
