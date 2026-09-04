import { User, IUserDocument } from '../models/User';
import { Subscription, ISubscriptionDocument } from '../models/Subscription';
import { UserStatusResponse, PlatformSupportDetails, ISubscriptionDetails, IUserProfile } from '../types/auth';
import { upstoxConfig } from '../config/upstoxConfig';
import { isDatabaseConnected } from '../config/database';
import { Logger } from '../utils/logger';

// In-memory fallback user store when MongoDB is not connected
export interface MemoryUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  accessType: 'none' | 'paid' | 'admin_free';
  status: 'active' | 'inactive';
  grantedAt?: string;
  expiresAt?: string;
}

const defaultMemoryUsers: MemoryUser[] = [
  {
    id: 'admin-1',
    email: 'billionitwealth@gmail.com',
    name: 'Billion IT Wealth Admin',
    role: 'admin',
    accessType: 'admin_free',
    status: 'active',
    grantedAt: new Date().toISOString()
  }
];

export class SubscriptionService {
  private memoryUsers: MemoryUser[] = [...defaultMemoryUsers];

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
    if (user.role === 'admin' || user.email.toLowerCase() === 'billionitwealth@gmail.com') {
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
    if (!isDatabaseConnected()) return null;

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
  public formatUserProfile(user: IUserDocument | any): IUserProfile {
    const id = user._id ? user._id.toString() : (user.id || 'mem-user');
    return {
      id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      googleId: user.googleId,
      picture: user.picture,
      phone: user.phone,
      role: user.role || 'user',
      accessType: user.accessType || 'admin_free',
      preferences: user.preferences,
      createdAt: user.createdAt
    };
  }

  /**
   * Get Platform Support Details
   */
  public getSupportDetails(): PlatformSupportDetails {
    return {
      platformName: upstoxConfig.platformName,
      email: upstoxConfig.supportEmail,
      phone: upstoxConfig.supportPhone,
      monthlyPrice: 499,
      currency: 'INR',
      staticPaymentLink: upstoxConfig.razorpayStaticPaymentLink
    };
  }

  /**
   * Get full user status payload including calculated remaining days
   */
  public async getUserStatusResponse(user: IUserDocument | any): Promise<UserStatusResponse> {
    const userId = user._id ? user._id.toString() : (user.id || 'mem-user');
    const sub = await this.getActiveSubscription(userId);
    const hasAccess = this.checkUserAccess(user, sub);
    const daysRemaining = sub && sub.expiryDate ? this.calculateRemainingDays(sub.expiryDate) : 365;

    const subscriptionDetails: ISubscriptionDetails = {
      id: sub ? (sub._id ? sub._id.toString() : (sub as any).id || '') : '',
      userId,
      plan: sub ? sub.plan : 'monthly_499',
      price: sub ? sub.price : 499,
      currency: sub ? sub.currency : 'INR',
      status: sub ? sub.status : (user.accessType === 'admin_free' ? 'active' : (user.status || 'inactive')),
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
   * List all authorized users for the Admin Dashboard
   */
  public async listAuthorizedUsers(): Promise<MemoryUser[]> {
    if (isDatabaseConnected()) {
      try {
        const users = await User.find({}).sort({ createdAt: -1 }).lean();
        return users.map((u) => ({
          id: u._id.toString(),
          email: u.email,
          name: u.name,
          role: u.role,
          accessType: u.accessType,
          status: u.accessType !== 'none' || u.role === 'admin' ? 'active' : 'inactive',
          grantedAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined
        }));
      } catch (err: any) {
        Logger.warn('SubscriptionService', `DB user list failed, falling back to memory: ${err.message}`);
      }
    }
    return [...this.memoryUsers];
  }

  /**
   * Grant free dashboard access to a user (Admin Only Action)
   */
  public async grantAdminAccess(
    targetEmail: string,
    adminUserId?: string,
    durationDays: number = 365,
    notes?: string
  ): Promise<any> {
    const lowerEmail = targetEmail.toLowerCase().trim();

    if (isDatabaseConnected()) {
      let user = await User.findOne({ email: lowerEmail });
      if (!user) {
        user = new User({
          email: lowerEmail,
          name: lowerEmail.split('@')[0],
          role: 'user',
          accessType: 'admin_free',
          preferences: { theme: 'dark' }
        });
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

      Logger.info('SubscriptionService', `Granted admin free access to ${lowerEmail} for ${durationDays} days`);
      return user;
    } else {
      // Memory fallback
      const existing = this.memoryUsers.find((u) => u.email === lowerEmail);
      if (existing) {
        existing.accessType = 'admin_free';
        existing.status = 'active';
        existing.grantedAt = new Date().toISOString();
      } else {
        this.memoryUsers.push({
          id: `mem-${Date.now()}`,
          email: lowerEmail,
          name: lowerEmail.split('@')[0],
          role: 'user',
          accessType: 'admin_free',
          status: 'active',
          grantedAt: new Date().toISOString()
        });
      }
      return { email: lowerEmail, accessType: 'admin_free', role: 'user' };
    }
  }

  /**
   * Revoke dashboard access from a user (Admin Only Action)
   */
  public async revokeAdminAccess(targetEmail: string): Promise<any> {
    const lowerEmail = targetEmail.toLowerCase().trim();

    if (lowerEmail === 'billionitwealth@gmail.com') {
      throw new Error('Cannot revoke access from root administrator.');
    }

    if (isDatabaseConnected()) {
      const user = await User.findOne({ email: lowerEmail });
      if (user) {
        user.accessType = 'none';
        await user.save();
        await Subscription.updateMany({ userId: user._id }, { status: 'expired' });
      }
      return { email: lowerEmail, accessType: 'none' };
    } else {
      const memUser = this.memoryUsers.find((u) => u.email === lowerEmail);
      if (memUser) {
        memUser.accessType = 'none';
        memUser.status = 'inactive';
      }
      return { email: lowerEmail, accessType: 'none' };
    }
  }

  /**
   * Activate paid subscription for a user (Admin/Payment Ingestion Action)
   */
  public async activatePaidSubscription(
    targetEmail: string,
    durationDays: number = 30
  ): Promise<any> {
    const lowerEmail = targetEmail.toLowerCase().trim();

    if (isDatabaseConnected()) {
      let user = await User.findOne({ email: lowerEmail });
      if (!user) {
        user = new User({
          email: lowerEmail,
          name: lowerEmail.split('@')[0],
          role: 'user',
          accessType: 'paid',
          preferences: { theme: 'dark' }
        });
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

      Logger.info('SubscriptionService', `Activated paid subscription for ${lowerEmail} for ${durationDays} days`);
      return sub;
    } else {
      const existing = this.memoryUsers.find((u) => u.email === lowerEmail);
      if (existing) {
        existing.accessType = 'paid';
        existing.status = 'active';
      } else {
        this.memoryUsers.push({
          id: `mem-${Date.now()}`,
          email: lowerEmail,
          name: lowerEmail.split('@')[0],
          role: 'user',
          accessType: 'paid',
          status: 'active'
        });
      }
      return { email: lowerEmail, accessType: 'paid' };
    }
  }
}

export const subscriptionService = new SubscriptionService();

