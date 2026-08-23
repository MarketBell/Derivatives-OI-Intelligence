import jwt from 'jsonwebtoken';
import { dhanConfig } from '../config/dhanConfig';
import { AuthTokenPayload, UserRole } from '../types/auth';

export class JwtService {
  /**
   * Generate JWT token for authenticated user
   */
  public generateToken(userId: string, email: string, role: UserRole): string {
    const payload: AuthTokenPayload = {
      userId,
      email,
      role
    };

    return jwt.sign(payload, dhanConfig.jwtSecret, {
      expiresIn: '30d'
    });
  }

  /**
   * Verify and decode JWT token
   */
  public verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, dhanConfig.jwtSecret) as AuthTokenPayload;
  }
}

export const jwtService = new JwtService();
