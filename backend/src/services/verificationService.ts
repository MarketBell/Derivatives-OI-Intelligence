import crypto from 'crypto';
import { Logger } from '../utils/logger';

export interface VerificationRecord {
  email: string;
  code: string;
  purpose: 'setup_password' | 'reset_password';
  expiresAt: number; // timestamp in ms
  used: boolean;
}

export class VerificationService {
  private records: Map<string, VerificationRecord> = new Map();

  /**
   * Generate a secure 6-digit numeric verification code valid for 15 minutes (900,000 ms)
   */
  public generateVerificationCode(email: string, purpose: 'setup_password' | 'reset_password'): string {
    const normalizedEmail = email.toLowerCase().trim();
    // Generate cryptographically secure random integer between 100000 and 999999
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const record: VerificationRecord = {
      email: normalizedEmail,
      code,
      purpose,
      expiresAt,
      used: false
    };

    // Store by email + purpose
    const key = `${normalizedEmail}:${purpose}`;
    this.records.set(key, record);

    Logger.info('VerificationService', `Generated ${purpose} verification code for ${normalizedEmail} (Expires in 15m)`);

    return code;
  }

  /**
   * Verify a code for an email and purpose. If valid, mark as used and return true.
   */
  public verifyCode(email: string, code: string, purpose: 'setup_password' | 'reset_password'): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    const key = `${normalizedEmail}:${purpose}`;
    const record = this.records.get(key);

    if (!record) {
      return false;
    }

    if (record.used) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      this.records.delete(key);
      return false;
    }

    if (record.code !== code.trim()) {
      return false;
    }

    // Burn token on successful verification (single-use)
    record.used = true;
    this.records.set(key, record);
    return true;
  }

  /**
   * Clean up expired records periodically
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now > record.expiresAt || record.used) {
        this.records.delete(key);
      }
    }
  }
}

export const verificationService = new VerificationService();
