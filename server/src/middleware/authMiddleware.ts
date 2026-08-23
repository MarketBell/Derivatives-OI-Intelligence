import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../services/jwtService';
import { User, IUserDocument } from '../models/User';
import { subscriptionService } from '../services/subscriptionService';
import { ISubscriptionDocument } from '../models/Subscription';
import { dhanConfig } from '../config/dhanConfig';
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
    if (dhanConfig.enforceSubscription) {
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
    const user = await User.findById(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'User associated with token no longer exists.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const subscription = await subscriptionService.getActiveSubscription(user._id.toString());
    req.user = user;
    req.subscription = subscription;
    next();
  } catch (err: any) {
    Logger.warn('AuthMiddleware', `JWT Verification failed: ${err.message}`);
    if (dhanConfig.enforceSubscription) {
      res.status(401).json({
        success: false,
        status: 'error',
        message: 'Invalid or expired token.',
        timestamp: new Date().toISOString()
      });
      return;
    }
    next();
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
  if (!dhanConfig.enforceSubscription) {
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
