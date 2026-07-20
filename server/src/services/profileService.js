import crypto from 'crypto';
import { prisma } from '../db.js';

export const NICKNAME_CHANGE_COOLDOWN_MS = 15 * 60 * 1000;

export function normalizeNickname(value) {
  const nickname = String(value || '').trim().replace(/\s+/g, ' ');
  if (nickname.length < 2 || nickname.length > 24) {
    throw new Error('NICKNAME_LENGTH_INVALID');
  }
  if (!/^[\p{L}\p{N}_ -]+$/u.test(nickname)) {
    throw new Error('NICKNAME_CHARACTERS_INVALID');
  }
  return nickname;
}

export function getNicknameChangeAvailableAt(user, now = Date.now()) {
  if (user?.profileSetupRequired || !user?.nicknameChangedAt) {
    return null;
  }
  const availableAt = new Date(user.nicknameChangedAt).getTime() + NICKNAME_CHANGE_COOLDOWN_MS;
  return availableAt > now ? new Date(availableAt) : null;
}

async function assignPublicId(userId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { publicId: crypto.randomUUID() }
      });
    } catch (error) {
      if (error?.code !== 'P2002' || attempt === 2) {
        throw error;
      }
    }
  }
  throw new Error('PUBLIC_ID_ASSIGN_FAILED');
}

export async function ensureUserProfile(user) {
  if (!user) {
    return null;
  }
  return user.publicId ? user : assignPublicId(user.id);
}

export async function ensureAllUserPublicIds() {
  const users = await prisma.user.findMany({
    where: { publicId: null },
    select: { id: true }
  });
  for (const user of users) {
    await assignPublicId(user.id);
  }
  return users.length;
}

export function serializeUserPrincipal(user, now = Date.now()) {
  const availableAt = getNicknameChangeAvailableAt(user, now);
  return {
    type: 'USER',
    id: user.id,
    uuid: user.publicId,
    role: user.role,
    email: user.email,
    displayName: user.displayName,
    profileSetupRequired: Boolean(user.profileSetupRequired),
    nicknameChangedAt: user.nicknameChangedAt,
    nicknameChangeAvailableAt: availableAt?.toISOString() || null,
    flagged: Boolean(user.isFlagged)
  };
}

export async function updateUserNickname(userId, value, now = new Date()) {
  const nickname = normalizeNickname(value);
  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) {
    throw new Error('USER_NOT_FOUND');
  }

  const availableAt = getNicknameChangeAvailableAt(current, now.getTime());
  if (availableAt) {
    const error = new Error('NICKNAME_COOLDOWN');
    error.availableAt = availableAt;
    throw error;
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      displayName: nickname,
      nicknameChangedAt: now,
      profileSetupRequired: false,
      publicId: current.publicId || crypto.randomUUID()
    }
  });
}
