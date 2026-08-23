import { User, IUserDocument } from '../models/User';
import { Subscription, ISubscriptionDocument } from '../models/Subscription';
import { UserStatusResponse, PlatformSupportDetails, ISubscriptionDetails, IUserProfile } from '../types/auth';
import { dhanConfig } from '../config/dhanConfig';
import { Logger } from '../utils/logger';

export class SubscriptionService {
  /**
   * Calculate remaining days dynamically from an explicit expiry date
   */
  public calculateRemainingDays(expiryDate?: Date): number {
    if (!expiryDate) return 0;
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine whether a user has dashboard access based on role, admin grant, or paid subscription
   */
  public checkUserAccess(user: IUserDocument, subscription?: ISubscriptionDocument | null): boolean {
    if (user.role === 'admin') {
      return true;
    }

    if (user.accessType === 'admin_free') {
      return true;
    }

    if (
      subscription &&
      subscription.status === 'active' &&
      subscription.expiryDate &&
      subscription.expiryDate.getTime() > Date.now()
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get active subscription document for a user if present
   */
  public async getActiveSubscription(userId: string): Promise<ISubscriptionDocument | null> {
    const sub = await Subscription.findOne({
      userId,
      status: 'active'
    }).sort({ expiryDate: -1 });

    if (!sub) return null;

    // Check if expired
    if (sub.expiryDate && sub.expiryDate.getTime() <= Date.now()) {
      sub.status = 'expired';
      await sub.save();
      return null;
    }

    return sub;
  }

  /**
   * Format User Profile object
   */
  public formatUserProfile(user: IUserDocument): IUserProfile {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      googleId: user.googleId,
      picture: user.picture,
      phone: user.phone,
      role: user.role,
      accessType: user.accessType,
      preferences: user.preferences,
      createdAt: user.createdAt
    };
  }

  /**
   * Get Platform Support Details
   */
  public getSupportDetails(): PlatformSupportDetails {
    return {
      platformName: dhanConfig.platformName,
      email: dhanConfig.supportEmail,
      phone: dhanConfig.supportPhone,
      monthlyPrice: 499,
      currency: 'INR',
      staticPaymentLink: dhanConfig.razorpayStaticPaymentLink
    };
  }

  /**
   * Get full user status payload including calculated remaining days
   */
  public async getUserStatusResponse(user: IUserDocument): Promise<UserStatusResponse> {
    const sub = await this.getActiveSubscription(user._id.toString());
    const hasAccess = this.checkUserAccess(user, sub);
    const daysRemaining = sub && sub.expiryDate ? this.calculateRemainingDays(sub.expiryDate) : 0;

    const subscriptionDetails: ISubscriptionDetails = {
      id: sub ? sub._id.toString() : '',
      userId: user._id.toString(),
      plan: sub ? sub.plan : 'monthly_499',
      price: sub ? sub.price : 499,
      currency: sub ? sub.currency : 'INR',
      status: sub ? sub.status : (user.accessType === 'admin_free' ? 'active' : 'inactive'),
      type: sub ? sub.type : user.accessType,
      startDate: sub?.startDate,
      expiryDate: sub?.expiryDate,
      daysRemaining,
      notes: sub?.notes
    };

    return {
      user: this.formatUserProfile(user),
      subscription: subscriptionDetails,
      hasAccess,
      support: this.getSupportDetails()
    };
  }

  /**
   * Grant free dashboard access to a user (Admin Only Action)
   */
  public async grantAdminAccess(
    targetEmail: string,
    adminUserId?: string,
    durationDays: number = 365,
    notes?: string
  ): Promise<IUserDocument> {
    const user = await User.findOne({ email: targetEmail.toLowerCase() });
    if (!user) {
      throw new Error(`User with email '${targetEmail}' not found.`);
    }

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    user.accessType = 'admin_free';
    await user.save();

    await Subscription.findOneAndUpdate(
      { userId: user._id, type: 'admin_free' },
      {
        userId: user._id,
        plan: 'admin_free_grant',
        price: 0,
        currency: 'INR',
        status: 'active',
        type: 'admin_free',
        startDate,
        expiryDate,
        grantedBy: adminUserId,
        notes: notes || 'Free access granted by administrator'
      },
      { upsert: true, new: true }
    );

    Logger.info('SubscriptionService', `Granted admin free access to ${targetEmail} for ${durationDays} days`);
    return user;
  }

  /**
   * Activate paid subscription for a user (Admin/Payment Ingestion Action)
   */
  public async activatePaidSubscription(
    targetEmail: string,
    durationDays: number = 30
  ): Promise<ISubscriptionDocument> {
    const user = await User.findOne({ email: targetEmail.toLowerCase() });
    if (!user) {
      throw new Error(`User with email '${targetEmail}' not found.`);
    }

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    user.accessType = 'paid';
    await user.save();

    const sub = await Subscription.findOneAndUpdate(
      { userId: user._id, status: 'active' },
      {
        userId: user._id,
        plan: 'monthly_499',
        price: 499,
        currency: 'INR',
        status: 'active',
        type: 'paid',
        startDate,
        expiryDate,
        notes: 'Activated paid ₹499 monthly subscription'
      },
      { upsert: true, new: true }
    );

    Logger.info('SubscriptionService', `Activated paid subscription for ${targetEmail} for ${durationDays} days`);
    return sub;
  }
}

export const subscriptionService = new SubscriptionService();
