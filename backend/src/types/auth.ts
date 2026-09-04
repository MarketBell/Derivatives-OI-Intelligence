export type UserRole = 'user' | 'admin';
export type AccessType = 'none' | 'paid' | 'admin_free';
export type SubscriptionStatus = 'active' | 'expired' | 'inactive';
export type ThemePreference = 'dark' | 'light';

export interface UserPreferences {
  theme: ThemePreference;
}

export interface IUserProfile {
  id: string;
  email: string;
  name: string;
  googleId?: string;
  picture?: string;
  phone?: string;
  role: UserRole;
  accessType: AccessType;
  preferences: UserPreferences;
  createdAt: Date;
}

export interface ISubscriptionDetails {
  id: string;
  userId: string;
  plan: string;
  price: number;
  currency: string;
  status: SubscriptionStatus;
  type: AccessType;
  startDate?: Date;
  expiryDate?: Date;
  daysRemaining: number;
  grantedBy?: string;
  notes?: string;
}

export interface PlatformSupportDetails {
  platformName: string;
  email: string;
  phone: string;
  monthlyPrice: number;
  currency: string;
  staticPaymentLink: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface UserStatusResponse {
  user: IUserProfile;
  subscription: ISubscriptionDetails;
  hasAccess: boolean;
  support: PlatformSupportDetails;
}
