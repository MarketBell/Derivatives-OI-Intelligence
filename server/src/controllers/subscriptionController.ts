import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { subscriptionService } from '../services/subscriptionService';

/**
 * GET /api/subscription/status
 * Get current subscription status, days remaining, and static Razorpay payment link
 */
export const getSubscriptionStatus = async (
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
      data: {
        subscription: userStatus.subscription,
        hasAccess: userStatus.hasAccess,
        support: userStatus.support
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscription/admin-grant
 * Grant or revoke free access for a user (Admin Only Endpoint)
 */
export const adminGrantAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, durationDays, notes } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Target user email is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const targetUser = await subscriptionService.grantAdminAccess(
      email,
      req.user?._id.toString(),
      durationDays || 365,
      notes
    );

    const userStatus = await subscriptionService.getUserStatusResponse(targetUser);

    res.status(200).json({
      success: true,
      status: 'ok',
      message: `Successfully granted admin free access to ${email}.`,
      data: userStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      status: 'error',
      message: err.message || 'Failed to grant admin access.',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * POST /api/subscription/manual-activate
 * Activate paid subscription for a user (Admin Only Endpoint)
 */
export const adminActivatePaid = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, durationDays } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Target user email is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const sub = await subscriptionService.activatePaidSubscription(
      email,
      durationDays || 30
    );

    res.status(200).json({
      success: true,
      status: 'ok',
      message: `Successfully activated paid subscription for ${email}.`,
      data: sub,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      status: 'error',
      message: err.message || 'Failed to activate paid subscription.',
      timestamp: new Date().toISOString()
    });
  }
};
