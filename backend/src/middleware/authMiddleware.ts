import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwtService';
import { User, IUserDocument } from '../models/User';
import { subscriptionService } from '../services/subscriptionService';
import { ISubscriptionDocument } from '../models/Subscription';
import { upstoxConfig } from '../config/upstoxConfig';
import { isDatabaseConnected } from '../config/database';
import { Logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: IUserDocument;
  subscription?: ISubscriptionDocument | null;
}

/**
 * Authenticate JWT Bearer Token
 */
export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (upstoxConfig.enforceSubscription) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Authentication token missing or invalid.',
        timestamp: new Date().toISOString()
      });
      return;
    }
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwtService.verifyToken(token);
    let user: any = null;

    if (isDatabaseConnected()) {
      try {
        if (payload.userId && /^[0-9a-fA-F]{24}$/.test(payload.userId)) {
          user = await User.findById(payload.userId);
        } else if (payload.email) {
          user = await User.findOne({ email: payload.email.toLowerCase() });
        }
      } catch (dbErr) {
        user = null;
      }
    }

    if (!user) {
      const memList = await subscriptionService.listAuthorizedUsers();
      const memUser = memList.find((u) => u.id === payload.userId || u.email.toLowerCase() === (payload.email || '').toLowerCase());
      if (memUser) {
        user = {
          _id: memUser.id,
          id: memUser.id,
          email: memUser.email,
          name: memUser.name,
          role: memUser.role,
          accessType: memUser.accessType,
          status: memUser.status
        };
      }
    }

    if (!user && payload.role === 'admin' && payload.email) {
      const lowerEmail = payload.email.toLowerCase();
      if (lowerEmail === 'billionitwealth@gmail.com' || (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === lowerEmail)) {
        user = {
          _id: payload.userId || 'admin-root',
          id: payload.userId || 'admin-root',
          email: lowerEmail,
          name: 'Administrator',
          role: 'admin',
          accessType: 'admin_free',
          status: 'active'
        };
      }
    }

    if (!user) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'User associated with token no longer exists.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // If non-admin user status is pending or revoked, reject
    if (user.role !== 'admin' && (user.status === 'revoked' || user.status === 'pending' || user.accessType === 'none')) {
      res.status(403).json({
        success: false,
        status: user.status === 'pending' ? 'pending_approval' : 'unauthorized',
        message: user.status === 'pending' ? 'Account pending administrator approval.' : 'Access revoked. Your account is no longer authorized.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const subscription = isDatabaseConnected()
      ? await subscriptionService.getActiveSubscription(user._id.toString())
      : null;

    req.user = user;
    req.subscription = subscription;
    next();
  } catch (err: any) {
    Logger.warn('AuthMiddleware', `JWT Verification failed: ${err.message}`);
    res.status(401).json({
      success: false,
      status: 'error',
      message: 'Invalid or expired token.',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Enforce Dashboard Access Control (Admin Grant or Active Subscription)
 */
export const requireDashboardAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!upstoxConfig.enforceSubscription) {
    return next();
  }

  if (!req.user) {
    res.status(401).json({
      success: false,
      status: 'error',
      message: 'Authentication required to access BIW OI Mantra dashboard.',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const hasAccess = subscriptionService.checkUserAccess(req.user, req.subscription);

  if (!hasAccess) {
    res.status(403).json({
      success: false,
      status: 'subscription_required',
      message: 'Paid ₹499/month subscription or Admin free access is required to view OI Dashboard.',
      support: subscriptionService.getSupportDetails(),
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

/**
 * Enforce Admin Role Access Control
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      status: 'error',
      message: 'Authentication required for administrative actions.',
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      status: 'error',
      message: 'Access denied: Admin privileges required.',
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};
