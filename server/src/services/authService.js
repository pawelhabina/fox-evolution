import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../db.js';
import { generateRefreshToken, hashDeviceId, hashPassword, hashToken, verifyPassword } from '../utils/crypto.js';
import { signAccessToken } from '../utils/jwt.js';

function createAccessPayloadForUser(user) {
  return {
    pt: 'USER',
    uid: user.id,
    role: user.role,
    flagged: Boolean(user.isFlagged)
  };
}

function createAccessPayloadForDevice(device) {
  return {
    pt: 'DEVICE',
    did: device.id,
    role: 'GUEST',
    flagged: Boolean(device.isFlagged)
  };
}

function refreshExpiresAt() {
  const date = new Date();
  date.setDate(date.getDate() + env.jwtRefreshTtlDays);
  return date;
}

async function createRefreshTokenRecord({ principalType, userId, deviceId, ipAddress, userAgent }) {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      principalType,
      userId,
      deviceId,
      tokenHash,
      expiresAt: refreshExpiresAt(),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    }
  });

  return refreshToken;
}

async function issueUserSession(user, context = {}) {
  const accessToken = signAccessToken(createAccessPayloadForUser(user));
  const refreshToken = await createRefreshTokenRecord({
    principalType: 'USER',
    userId: user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return {
    accessToken,
    refreshToken,
    principal: {
      type: 'USER',
      id: user.id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      flagged: user.isFlagged
    }
  };
}

async function issueDeviceSession(device, context = {}) {
  const accessToken = signAccessToken(createAccessPayloadForDevice(device));
  const refreshToken = await createRefreshTokenRecord({
    principalType: 'DEVICE',
    deviceId: device.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  return {
    accessToken,
    refreshToken,
    principal: {
      type: 'DEVICE',
      id: device.id,
      flagged: device.isFlagged,
      label: device.label
    }
  };
}

function displayNameFromEmail(email) {
  const localPart = String(email).split('@')[0] || 'Fox Player';
  return localPart.slice(0, 24);
}

export async function registerUser({ email, password, displayName, deviceId, migrateDeviceSaves = true, context = {} }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      displayName: displayName?.trim() || displayNameFromEmail(normalizedEmail)
    }
  });

  if (deviceId) {
    await linkDeviceToUser({ userId: user.id, deviceId, migrateSaves: migrateDeviceSaves });
  }

  return issueUserSession(user, context);
}

export async function loginUser({ email, password, deviceId, migrateDeviceSaves = true, context = {} }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  if (deviceId) {
    await linkDeviceToUser({ userId: user.id, deviceId, migrateSaves: migrateDeviceSaves });
  }

  const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
  return issueUserSession(refreshedUser, context);
}

export async function loginOAuthUser({ provider, providerUserId, email, displayName, context = {} }) {
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
  const providerKey = String(provider || '').trim().toUpperCase();

  let user = await prisma.user.findFirst({
    where: {
      oauthIdentities: {
        some: {
          provider: providerKey,
          providerUserId: String(providerUserId)
        }
      }
    }
  });

  if (!user && normalizedEmail) {
    user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        displayName: displayName?.trim() || (normalizedEmail ? displayNameFromEmail(normalizedEmail) : `Player-${providerUserId}`),
        oauthIdentities: {
          create: {
            provider: providerKey,
            providerUserId: String(providerUserId)
          }
        }
      }
    });
  } else {
    const existingIdentity = await prisma.oAuthIdentity.findFirst({
      where: {
        provider: providerKey,
        providerUserId: String(providerUserId),
        userId: user.id
      }
    });

    if (!existingIdentity) {
      await prisma.oAuthIdentity.create({
        data: {
          provider: providerKey,
          providerUserId: String(providerUserId),
          userId: user.id
        }
      });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      displayName: displayName?.trim() || user.displayName
    }
  });

  const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
  return issueUserSession(refreshedUser, context);
}

export async function loginDevice({ deviceId, label, context = {} }) {
  if (!deviceId) {
    throw new Error('DEVICE_ID_REQUIRED');
  }

  const deviceKeyHash = hashDeviceId(deviceId);
  let device = await prisma.device.findUnique({ where: { deviceKeyHash } });

  if (!device) {
    device = await prisma.device.create({
      data: {
        deviceKeyHash,
        label: label?.trim() || null
      }
    });
  } else if (label && label.trim() && label.trim() !== device.label) {
    device = await prisma.device.update({ where: { id: device.id }, data: { label: label.trim() } });
  }

  return issueDeviceSession(device, context);
}

export async function refreshSession({ refreshToken, context = {} }) {
  const tokenHash = hashToken(refreshToken || '');
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  let nextSession;
  if (record.principalType === 'USER' && record.userId) {
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    nextSession = await issueUserSession(user, context);
  } else if (record.principalType === 'DEVICE' && record.deviceId) {
    const device = await prisma.device.findUnique({ where: { id: record.deviceId } });
    if (!device) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    nextSession = await issueDeviceSession(device, context);
  } else {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: {
      revokedAt: new Date()
    }
  });

  return nextSession;
}

export async function revokeRefreshToken(refreshToken) {
  const tokenHash = hashToken(refreshToken || '');
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!record) {
    return;
  }
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
}

export async function getPrincipalFromJwtPayload(payload) {
  if (payload.pt === 'USER' && payload.uid) {
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user) {
      return null;
    }
    return {
      type: 'USER',
      id: user.id,
      role: user.role,
      email: user.email,
      displayName: user.displayName,
      flagged: user.isFlagged
    };
  }

  if (payload.pt === 'DEVICE' && payload.did) {
    const device = await prisma.device.findUnique({ where: { id: payload.did } });
    if (!device) {
      return null;
    }
    return {
      type: 'DEVICE',
      id: device.id,
      role: 'GUEST',
      label: device.label,
      flagged: device.isFlagged
    };
  }

  return null;
}

export async function linkDeviceToUser({ userId, deviceId, migrateSaves = true }) {
  const deviceKeyHash = hashDeviceId(deviceId);
  const device = await prisma.device.findUnique({ where: { deviceKeyHash } });
  if (!device) {
    return null;
  }

  await prisma.userDeviceLink.upsert({
    where: {
      userId_deviceId: {
        userId,
        deviceId: device.id
      }
    },
    create: {
      userId,
      deviceId: device.id
    },
    update: {
      linkedAt: new Date()
    }
  });

  if (migrateSaves) {
    const [userSaves, deviceSaves] = await Promise.all([
      prisma.gameSave.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
      prisma.gameSave.findMany({ where: { deviceId: device.id }, orderBy: { updatedAt: 'desc' } })
    ]);

    const occupied = new Set(userSaves.map((save) => save.slotId));
    let available = Math.max(0, 5 - userSaves.length);

    for (const save of deviceSaves) {
      if (available <= 0) {
        break;
      }
      if (occupied.has(save.slotId)) {
        continue;
      }
      await prisma.gameSave.create({
        data: {
          slotId: save.slotId,
          name: save.name,
          ownerType: 'USER',
          userId,
          state: save.state,
          summaryCoins: save.summaryCoins,
          summaryGems: save.summaryGems,
          summaryTopTier: save.summaryTopTier,
          cheatScore: save.cheatScore,
          cheatNotes: save.cheatNotes
        }
      });
      occupied.add(save.slotId);
      available -= 1;
    }
  }

  return device;
}

export async function ensureAdminUser() {
  if (!env.adminEmail || !env.adminPassword) {
    return;
  }

  const email = env.adminEmail.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hashPassword(env.adminPassword);

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: env.adminDisplayName,
        role: UserRole.ADMIN
      }
    });
    return;
  }

  if (existing.role !== UserRole.ADMIN) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: UserRole.ADMIN }
    });
  }
}
