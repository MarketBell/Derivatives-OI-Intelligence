import crypto from 'crypto';

export class PasswordUtils {
  /**
   * Generate random salt
   */
  public static generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a password using PBKDF2 with SHA-512
   */
  public static hashPassword(password: string, salt: string): string {
    const iterations = 10000;
    const keylen = 64;
    const digest = 'sha512';
    return crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
  }

  /**
   * Verify a password against a stored hash and salt using constant-time comparison
   */
  public static verifyPassword(password: string, salt: string, storedHash: string): boolean {
    const hash = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  }
}
