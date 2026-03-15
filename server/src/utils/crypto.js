import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export function hashDeviceId(deviceId) {
  return crypto.createHmac('sha256', env.deviceHashSalt).update(String(deviceId)).digest('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
