import fs from 'fs';
import path from 'path';
import { User, IUserDocument } from '../models/User';
import { Subscription, ISubscriptionDocument } from '../models/Subscription';
import { UserStatusResponse, PlatformSupportDetails, ISubscriptionDetails, IUserProfile, AccountStatus } from '../types/auth';
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
  status: AccountStatus;
  passwordHash?: string;
  salt?: string;
  grantedAt?: string;
  expiresAt?: string;
  phone?: string;
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

const FALLBACK_STORE_PATH = path.resolve(__dirname, '../../.fallback_store.json');

export class SubscriptionService {
  private memoryUsers: MemoryUser[] = (() => {
    let users: MemoryUser[];
    try {
      if (fs.existsSync(FALLBACK_STORE_PATH)) {
        const raw = fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        users = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...defaultMemoryUsers];
      } else {
        users = [...defaultMemoryUsers];
      }
    } catch {
      users = [...defaultMemoryUsers];
    }

    if (process.env.ADMIN_INITIAL_PASSWORD && process.env.ADMIN_INITIAL_PASSWORD.trim().length >= 6) {
      try {
        const { PasswordUtils } = require('../utils/passwordUtils');
        const salt = PasswordUtils.generateSalt();
        const hash = PasswordUtils.hashPassword(process.env.ADMIN_INITIAL_PASSWORD, salt);
        const adminUser = users.find((u) => u.email.toLowerCase() === 'billionitwealth@gmail.com') || users[0];
        if (adminUser) {
          adminUser.passwordHash = hash;
          adminUser.salt = salt;
        }
        try {
          fs.writeFileSync(FALLBACK_STORE_PATH, JSON.stringify(users, null, 2), 'utf-8');
        } catch {}
      } catch (e) {
        // Ignore if passwordUtils not yet resolved
      }
    }
    return users;
  })();

  private saveFallbackStore(): void {
    try {
      fs.writeFileSync(FALLBACK_STORE_PATH, JSON.stringify(this.memoryUsers, null, 2), 'utf-8');
    } catch {}
  }

  private syncFallbackStore(): void {
    try {
      if (fs.existsSync(FALLBACK_STORE_PATH)) {
        const raw = fs.readFileSync(FALLBACK_STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.memoryUsers = parsed;
        }
      }
    } catch {}
  }

  /**
   * Update memory user profile details and persist to fallback store
   */
  public updateMemoryUser(userId: string, data: { name?: string; phone?: string }): void {
    this.syncFallbackStore();
    const user = this.memoryUsers.find(
      (u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase()
    );
    if (user) {
      if (data.name) user.name = data.name;
      if (data.phone !== undefined) user.phone = data.phone;
      this.saveFallbackStore();
    }
  }

  /**
   * Calculate remaining days dynamically from an explicit expiry date
   */
  public calculateRemainingDays(expiryDate?: Date): number {
    if (!expiryDate) return -1; // -1 indicates non-expiring / continuous access
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine whether a user has dashboard access based on role, admin grant, or paid subscription
   */
  public checkUserAccess(user: IUserDocument | any, subscription?: ISubscriptionDocument | null): boolean {
    if (user.role === 'admin' || user.email.toLowerCase() === 'billionitwealth@gmail.com') {
      return true;
    }

    // Must not be pending or revoked
    const status: AccountStatus = user.status || (user.accessType !== 'none' ? 'active' : 'pending');
    if (status !== 'active') {
      return false;
    }

    if (user.accessType === 'admin_free') {
      return true;
    }

    if (
      subscription &&
      subscription.status === 'active' &&
      (!subscription.expiryDate || subscription.expiryDate.getTime() > Date.now())
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
    const status: AccountStatus = user.status || (user.role === 'admin' || user.accessType !== 'none' ? 'active' : 'pending');
    return {
      id,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      googleId: user.googleId,
      picture: user.picture,
      phone: user.phone,
      role: user.role || 'user',
      accessType: user.accessType || 'none',
      status,
      preferences: user.preferences || { theme: 'dark' },
      createdAt: user.createdAt || new Date()
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
    const daysRemaining = sub && sub.expiryDate ? this.calculateRemainingDays(sub.expiryDate) : (hasAccess ? -1 : 0);

    const subscriptionDetails: ISubscriptionDetails = {
      id: sub ? (sub._id ? sub._id.toString() : (sub as any).id || '') : '',
      userId,
      plan: sub ? sub.plan : (user.accessType === 'admin_free' ? 'admin_approved_access' : 'monthly_499'),
      price: sub ? sub.price : (user.accessType === 'admin_free' ? 0 : 499),
      currency: sub ? sub.currency : 'INR',
      status: sub ? sub.status : (hasAccess ? 'active' : 'inactive'),
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
   * List all users (pending, active, revoked, admin) for the Admin Dashboard
   */
  public async listAuthorizedUsers(): Promise<MemoryUser[]> {
    if (isDatabaseConnected()) {
      try {
        const users = await User.find({}).sort({ createdAt: -1 }).lean();
        return users.map((u) => {
          const status: AccountStatus = u.status || (u.role === 'admin' || u.accessType !== 'none' ? 'active' : 'pending');
          return {
            id: u._id.toString(),
            email: u.email,
            name: u.name,
            role: u.role,
            accessType: u.accessType,
            status,
            grantedAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined
          };
        });
      } catch (err: any) {
        Logger.warn('SubscriptionService', `DB user list failed, falling back to memory: ${err.message}`);
      }
    }
    this.syncFallbackStore();
    return [...this.memoryUsers];
  }

  /**
   * Admin Approve a user (sets status to 'active' and grants admin_free access)
   */
  public async approveUserAccess(targetEmail: string, adminUserId?: string): Promise<any> {
    const lowerEmail = targetEmail.toLowerCase().trim();

    if (isDatabaseConnected()) {
      let user = await User.findOne({ email: lowerEmail });
      if (!user) {
        throw new Error(`User with email ${lowerEmail} not found.`);
      }

      user.status = 'active';
      user.accessType = 'admin_free';
      await user.save();

      await Subscription.findOneAndUpdate(
        { userId: user._id, type: 'admin_free' },
        {
          userId: user._id,
          plan: 'admin_approved_access',
          price: 0,
          currency: 'INR',
          status: 'active',
          type: 'admin_free',
          startDate: new Date(),
          grantedBy: adminUserId,
          notes: 'Dashboard access approved by administrator'
        },
        { upsert: true, new: true }
      );

      Logger.info('SubscriptionService', `Admin approved access for ${lowerEmail}`);
      return user;
    } else {
      const existing = this.memoryUsers.find((u) => u.email === lowerEmail);
      if (existing) {
        existing.status = 'active';
        existing.accessType = 'admin_free';
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
      return { email: lowerEmail, status: 'active', accessType: 'admin_free' };
    }
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
          status: 'active',
          preferences: { theme: 'dark' }
        });
      }

      user.status = 'active';
      user.accessType = 'admin_free';
      await user.save();

      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);

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
      return { email: lowerEmail, accessType: 'admin_free', role: 'user', status: 'active' };
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
        user.status = 'revoked';
        user.accessType = 'none';
        await user.save();
        await Subscription.updateMany({ userId: user._id }, { status: 'inactive' });
      }
      return { email: lowerEmail, status: 'revoked', accessType: 'none' };
    } else {
      const memUser = this.memoryUsers.find((u) => u.email === lowerEmail);
      if (memUser) {
        memUser.status = 'revoked';
        memUser.accessType = 'none';
      }
      return { email: lowerEmail, status: 'revoked', accessType: 'none' };
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
          status: 'active',
          preferences: { theme: 'dark' }
        });
      }

      user.status = 'active';
      user.accessType = 'paid';
      await user.save();

      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);

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
      return { email: lowerEmail, accessType: 'paid', status: 'active' };
    }
  }

  /**
   * Find a user in memory by email
   */
  public findMemoryUser(email: string): MemoryUser | undefined {
    this.syncFallbackStore();
    return this.memoryUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  /**
   * Add or update a user in memory
   */
  public saveMemoryUser(user: MemoryUser): void {
    const idx = this.memoryUsers.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      this.memoryUsers[idx] = user;
    } else {
      this.memoryUsers.push(user);
    }
    this.saveFallbackStore();
  }
}

export const subscriptionService = new SubscriptionService();
