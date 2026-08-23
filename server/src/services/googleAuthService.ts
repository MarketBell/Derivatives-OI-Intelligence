import { User, IUserDocument } from '../models/User';
import { subscriptionService } from './subscriptionService';
import { jwtService } from './jwtService';
import { dhanConfig } from '../config/dhanConfig';
import { UserStatusResponse } from '../types/auth';
import { Logger } from '../utils/logger';

export interface GoogleAuthPayload {
  email: string;
  name: string;
  googleId?: string;
  picture?: string;
  phone?: string;
}

export class GoogleAuthService {
  /**
   * Authenticate user with Google payload, upsert User in MongoDB, and return JWT & user status
   */
  public async authenticateGoogleUser(payload: GoogleAuthPayload): Promise<{ token: string; userStatus: UserStatusResponse }> {
    const { email, name, googleId, picture, phone } = payload;
    const lowerEmail = email.toLowerCase().trim();

    let user: IUserDocument | null = await User.findOne({ email: lowerEmail });

    if (!user) {
      // First user registered or designated email can be initialized as admin if desired
      const isFirstAdmin = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === lowerEmail;
      
      user = new User({
        email: lowerEmail,
        name,
        googleId,
        picture,
        phone,
        role: isFirstAdmin ? 'admin' : 'user',
        accessType: isFirstAdmin ? 'admin_free' : 'none',
        preferences: { theme: 'dark' }
      });

      await user.save();
      Logger.info('GoogleAuthService', `Created new BIW OI Mantra user: ${lowerEmail}`);
    } else {
      // Update details if provided
      if (name) user.name = name;
      if (googleId) user.googleId = googleId;
      if (picture) user.picture = picture;
      if (phone && !user.phone) user.phone = phone;
      await user.save();
    }

    const token = jwtService.generateToken(user._id.toString(), user.email, user.role);
    const userStatus = await subscriptionService.getUserStatusResponse(user);

    return {
      token,
      userStatus
    };
  }
}

export const googleAuthService = new GoogleAuthService();
