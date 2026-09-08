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
    const email = req.body.email || req.body.targetEmail;
    const durationDays = req.body.durationDays;
    const notes = req.body.notes;

    if (!email) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Target user email is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const grantedById = (req.user as any)?._id?.toString() || (req.user as any)?.id || 'admin-root';
    const targetUser = await subscriptionService.grantAdminAccess(
      email,
      grantedById,
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
    const email = req.body.email || req.body.targetEmail;
    const durationDays = req.body.durationDays;

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

/**
 * GET /api/subscription/users
 * List all users for the Admin Dashboard (Admin Only Endpoint)
 */
export const adminListUsers = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await subscriptionService.listAuthorizedUsers();

    res.status(200).json({
      success: true,
      status: 'ok',
      data: users,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscription/admin-approve
 * Approve a pending user account (Admin Only Endpoint)
 */
export const adminApproveUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = req.body.email || req.body.targetEmail;

    if (!email) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Target user email is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const adminUserId = (req.user as any)?._id?.toString() || (req.user as any)?.id || 'admin-root';
    const result = await subscriptionService.approveUserAccess(email, adminUserId);

    res.status(200).json({
      success: true,
      status: 'ok',
      message: `User ${email} approved successfully. Dashboard access is now active.`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      status: 'error',
      message: err.message || 'Failed to approve user access.',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * POST /api/subscription/admin-revoke
 * Revoke dashboard access from a user (Admin Only Endpoint)
 */
export const adminRevokeAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = req.body.email || req.body.targetEmail;

    if (!email) {
      res.status(400).json({
        success: false,
        status: 'error',
        message: 'Target user email is required.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await subscriptionService.revokeAdminAccess(email);

    res.status(200).json({
      success: true,
      status: 'ok',
      message: `Access revoked successfully for ${email}.`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      status: 'error',
      message: err.message || 'Failed to revoke access.',
      timestamp: new Date().toISOString()
    });
  }
};


