import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtl });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: `${env.jwtRefreshTtlDays}d` });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

export function getRefreshExpiresAt() {
  const date = new Date();
  date.setDate(date.getDate() + env.jwtRefreshTtlDays);
  return date;
}
