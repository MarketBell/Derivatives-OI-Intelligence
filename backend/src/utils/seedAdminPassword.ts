import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';
import mongoose from 'mongoose';
import { connectDatabase, isDatabaseConnected, disconnectDatabase } from '../config/database';
import { User } from '../models/User';
import { subscriptionService } from '../services/subscriptionService';
import { PasswordUtils } from '../utils/passwordUtils';
import { Logger } from '../utils/logger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ROOT_ADMIN_EMAIL = 'billionitwealth@gmail.com';

async function promptPassword(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function seedAdminPassword(): Promise<boolean> {
  let password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!password || password.trim() === '') {
    if (process.stdin.isTTY) {
      password = await promptPassword('Enter Admin Password (min 6 characters): ');
    }
  }

  if (!password || typeof password !== 'string' || password.trim().length < 6) {
    console.error('ERROR: Admin password must be provided via ADMIN_INITIAL_PASSWORD environment variable or interactive prompt (min 6 characters).');
    return false;
  }

  const salt = PasswordUtils.generateSalt();
  const passwordHash = PasswordUtils.hashPassword(password, salt);

  const dbConnected = await connectDatabase();

  if (dbConnected && isDatabaseConnected()) {
    try {
      let admin = await User.findOne({ email: ROOT_ADMIN_EMAIL });

      if (admin) {
        admin.passwordHash = passwordHash;
        admin.salt = salt;
        admin.role = 'admin';
        admin.status = 'active';
        admin.accessType = 'admin_free';
        await admin.save();
        console.log(`[SUCCESS] Admin password hash & salt successfully updated in MongoDB for ${ROOT_ADMIN_EMAIL}.`);
      } else {
        admin = new User({
          email: ROOT_ADMIN_EMAIL,
          name: 'Administrator',
          passwordHash,
          salt,
          role: 'admin',
          status: 'active',
          accessType: 'admin_free',
          preferences: { theme: 'dark' }
        });
        await admin.save();
        console.log(`[SUCCESS] Admin account created with secure password hash & salt in MongoDB for ${ROOT_ADMIN_EMAIL}.`);
      }
      return true;
    } catch (err: any) {
      console.error(`[ERROR] Failed to save admin credentials in MongoDB: ${err.message}`);
      return false;
    } finally {
      if (require.main === module) {
        await disconnectDatabase();
      }
    }
  } else {
    // In-memory / Fallback file store
    console.log('[INFO] MongoDB not connected; applying credentials to fallback store.');
    const memUser = subscriptionService.findMemoryUser(ROOT_ADMIN_EMAIL);
    if (memUser) {
      memUser.passwordHash = passwordHash;
      memUser.salt = salt;
      memUser.role = 'admin';
      memUser.status = 'active';
      memUser.accessType = 'admin_free';
      subscriptionService.saveMemoryUser(memUser);
    } else {
      subscriptionService.saveMemoryUser({
        id: 'admin-1',
        email: ROOT_ADMIN_EMAIL,
        name: 'Administrator',
        passwordHash,
        salt,
        role: 'admin',
        status: 'active',
        accessType: 'admin_free'
      });
    }
    console.log(`[SUCCESS] Admin password hash & salt configured in fallback store for ${ROOT_ADMIN_EMAIL}.`);
    return true;
  }
}

// Direct execution
if (require.main === module) {
  seedAdminPassword()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal error during admin seeding:', err);
      process.exit(1);
    });
}
