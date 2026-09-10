import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { googleAuthService } from '../services/googleAuthService';
import { subscriptionService } from '../services/subscriptionService';
import { verificationService } from '../services/verificationService';
import { jwtService } from '../services/jwtService';
import { PasswordUtils } from '../utils/passwordUtils';
import { isDatabaseConnected } from '../config/database';
import { User } from '../models/User';
import { Logger } from '../utils/logger';

/**
 * POST /api/auth/register
 * Self-service registration for new traders
 * Sets role: 'user', status: 'pending', accessType: 'none'
 */
export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'A valid Full Name (at least 2 characters) is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'A valid Gmail / Email address is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Password must be at least 6 characters.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();

    // Check if user already exists
    if (isDatabaseConnected()) {
      const existing = await User.findOne({ email: lowerEmail });
      if (existing) {
        res.status(409).json({
          success: false,
          status: 'conflict',
          message: 'An account with this email already exists. Please sign in.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const salt = PasswordUtils.generateSalt();
      const passwordHash = PasswordUtils.hashPassword(password, salt);

      const user = new User({
        name: name.trim(),
        email: lowerEmail,
        passwordHash,
        salt,
        role: 'user',
        status: 'pending',
        accessType: 'none',
        preferences: { theme: 'dark' }
      });

      await user.save();

      Logger.info('AuthController', `New user registered: ${lowerEmail} (Status: pending)`);

      res.status(201).json({
        success: true,
        status: 'pending_approval',
        message: 'Your account has been created successfully. Your dashboard access is pending administrator approval.',
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: 'user',
          status: 'pending'
        },
        timestamp: new Date().toISOString()
      });
      return;
    } else {
      // Memory fallback
      const existing = subscriptionService.findMemoryUser(lowerEmail);
      if (existing) {
        res.status(409).json({
          success: false,
          status: 'conflict',
          message: 'An account with this email already exists. Please sign in.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const salt = PasswordUtils.generateSalt();
      const passwordHash = PasswordUtils.hashPassword(password, salt);

      const memUser = {
        id: `user-${Date.now()}`,
        email: lowerEmail,
        name: name.trim(),
        passwordHash,
        salt,
        role: 'user' as const,
        status: 'pending' as const,
        accessType: 'none' as const,
        grantedAt: new Date().toISOString()
      };

      subscriptionService.saveMemoryUser(memUser);

      res.status(201).json({
        success: true,
        status: 'pending_approval',
        message: 'Your account has been created successfully. Your dashboard access is pending administrator approval.',
        user: {
          id: memUser.id,
          email: memUser.email,
          name: memUser.name,
          role: 'user',
          status: 'pending'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Email + Password authentication with strict backend RBAC check:
 * - billionitwealth@gmail.com -> Admin Role
 * - Active accounts with valid password -> User Role
 * - Legacy accounts without password -> Requests password setup with verification
 * - Pending accounts -> 403 pending_approval
 * - Revoked accounts -> 403 unauthorized
 */
export const emailLogin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
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
    const isRootAdmin = lowerEmail === 'billionitwealth@gmail.com' || (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === lowerEmail);

    let userDoc: any = null;
    if (isDatabaseConnected()) {
      userDoc = await User.findOne({ email: lowerEmail });
    } else {
      userDoc = subscriptionService.findMemoryUser(lowerEmail);
    }

    // If Root Admin has no DB record yet, auto-bootstrap
    if (isRootAdmin && !userDoc) {
      let initialSalt: string | undefined;
      let initialHash: string | undefined;
      if (process.env.ADMIN_INITIAL_PASSWORD && process.env.ADMIN_INITIAL_PASSWORD.trim().length >= 6) {
        initialSalt = PasswordUtils.generateSalt();
        initialHash = PasswordUtils.hashPassword(process.env.ADMIN_INITIAL_PASSWORD, initialSalt);
      }

      if (isDatabaseConnected()) {
        userDoc = new User({
          email: lowerEmail,
          name: 'Administrator',
          passwordHash: initialHash,
          salt: initialSalt,
          role: 'admin',
          status: 'active',
          accessType: 'admin_free',
          preferences: { theme: 'dark' }
        });
        await userDoc.save();
      } else {
        userDoc = {
          id: 'admin-root',
          email: lowerEmail,
          name: 'Administrator',
          passwordHash: initialHash,
          salt: initialSalt,
          role: 'admin',
          status: 'active',
          accessType: 'admin_free'
        };
        subscriptionService.saveMemoryUser(userDoc);
      }
    }

    // Check if user exists
    if (!userDoc) {
      res.status(404).json({
        success: false,
        status: 'not_found',
        message: 'Account not found. Please create an account to request dashboard access.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Check if user has no password configured
    if (!userDoc.passwordHash) {
      if (isRootAdmin) {
        // Admin accounts must have their credentials initialized via administrative initialization
        res.status(401).json({
          success: false,
          status: 'error',
          message: 'Administrator password is not initialized. Please initialize admin credentials.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate a secure verification code for legacy setup
      const code = verificationService.generateVerificationCode(lowerEmail, 'setup_password');
      res.status(200).json({
        success: true,
        status: 'requires_password_setup',
        message: 'Please complete account verification and set your password to continue.',
        email: lowerEmail,
        verificationCode: process.env.NODE_ENV !== 'production' ? code : undefined,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify Password existence
    if (!password || typeof password !== 'string' || password.trim() === '') {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Password is required to sign in.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Constant-time PBKDF2 password verification via existing PasswordUtils
    const isPasswordValid = PasswordUtils.verifyPassword(password, userDoc.salt || '', userDoc.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: isRootAdmin ? 'Invalid administrator password.' : 'Invalid email or password. Please try again.',
        timestamp: new Date().toISOString()
      });
      return;
    }


    // Check Account Status
    const accountStatus = userDoc.status || (userDoc.accessType !== 'none' ? 'active' : 'pending');
    if (accountStatus === 'pending') {
      res.status(403).json({
        success: false,
        status: 'pending_approval',
        message: 'Your account is pending administrator approval. Please wait for an admin to grant access.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (accountStatus === 'revoked') {
      res.status(403).json({
        success: false,
        status: 'unauthorized',
        message: 'Account access has been revoked by administrator.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Generate JWT token for active user
    const token = jwtService.generateToken(
      userDoc._id?.toString() || userDoc.id || 'user-id',
      lowerEmail,
      userDoc.role || 'user'
    );

    res.status(200).json({
      success: true,
      status: 'ok',
      token,
      user: {
        id: userDoc._id?.toString() || userDoc.id || 'user-id',
        email: lowerEmail,
        name: userDoc.name || lowerEmail.split('@')[0],
        role: userDoc.role || 'user',
        status: userDoc.status || 'active',
        accessType: userDoc.accessType || 'paid'
      },
      redirectTo: userDoc.role === 'admin' ? '/admin' : '/dashboard',
      message: 'Sign in successful. Access granted.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/complete-legacy-setup
 * Set password for legacy authorized account after verifying single-use code
 */
export const completeLegacySetup = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Valid email, verification code, and new password (min 6 chars) are required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();
    const isValid = verificationService.verifyCode(lowerEmail, code, 'setup_password');

    if (!isValid) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Invalid or expired verification code.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const salt = PasswordUtils.generateSalt();
    const passwordHash = PasswordUtils.hashPassword(newPassword, salt);

    let userDoc: any = null;
    if (isDatabaseConnected()) {
      userDoc = await User.findOne({ email: lowerEmail });
      if (userDoc) {
        userDoc.passwordHash = passwordHash;
        userDoc.salt = salt;
        if (userDoc.status !== 'revoked') {
          userDoc.status = 'active';
        }
        await userDoc.save();
      }
    } else {
      userDoc = subscriptionService.findMemoryUser(lowerEmail);
      if (userDoc) {
        userDoc.passwordHash = passwordHash;
        userDoc.salt = salt;
        if (userDoc.status !== 'revoked') {
          userDoc.status = 'active';
        }
        subscriptionService.saveMemoryUser(userDoc);
      }
    }

    if (!userDoc) {
      res.status(404).json({
        success: false,
        status: 'error',
        message: 'User not found.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (lowerEmail === 'billionitwealth@gmail.com' || (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === lowerEmail)) {
      res.status(403).json({
        success: false,
        status: 'error',
        message: 'Administrator password cannot be configured via legacy user setup. Use secure administrative initialization.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const role = userDoc.role || 'user';
    const userId = userDoc._id ? userDoc._id.toString() : (userDoc.id || 'usr-root');
    const token = jwtService.generateToken(userId, lowerEmail, role);

    res.status(200).json({
      success: true,
      status: 'ok',
      token,
      user: {
        id: userId,
        email: lowerEmail,
        name: userDoc.name,
        role,
        status: userDoc.status,
        accessType: userDoc.accessType
      },
      redirectTo: role === 'admin' ? '/admin' : '/dashboard',
      message: 'Account setup complete. You are now signed in.',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 * Request a single-use verification code to reset password
 */
export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'A valid email address is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();
    let userExists = false;

    if (isDatabaseConnected()) {
      const user = await User.findOne({ email: lowerEmail });
      userExists = !!user;
    } else {
      userExists = !!subscriptionService.findMemoryUser(lowerEmail);
    }

    if (!userExists) {
      // Return ambiguous message for privacy
      res.status(200).json({
        success: true,
        status: 'ok',
        message: 'If an account exists with that email, a verification code has been generated.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const code = verificationService.generateVerificationCode(lowerEmail, 'reset_password');

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'A 6-digit verification code has been generated.',
      email: lowerEmail,
      verificationCode: process.env.NODE_ENV !== 'production' ? code : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password using single-use verification code
 */
export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Valid email, verification code, and new password (min 6 chars) are required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const lowerEmail = email.toLowerCase().trim();
    const isValid = verificationService.verifyCode(lowerEmail, code, 'reset_password');

    if (!isValid) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Invalid or expired verification code.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const salt = PasswordUtils.generateSalt();
    const passwordHash = PasswordUtils.hashPassword(newPassword, salt);

    if (isDatabaseConnected()) {
      await User.updateOne({ email: lowerEmail }, { passwordHash, salt });
    } else {
      const user = subscriptionService.findMemoryUser(lowerEmail);
      if (user) {
        user.passwordHash = passwordHash;
        user.salt = salt;
        subscriptionService.saveMemoryUser(user);
      }
    }

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Your password has been reset successfully. Please sign in with your new password.',
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
      message: 'Successfully authenticated with Billionit Wealth.',
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
 * Get current authenticated user profile
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
        status: req.user.status || 'active',
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
 * Update user profile details
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

    if (typeof (req.user as any).save === 'function') {
      await (req.user as any).save();
    }
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
 * Update UI preferences
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
      req.user.preferences = { theme };
      if (typeof (req.user as any).save === 'function') {
        await (req.user as any).save();
      }
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

