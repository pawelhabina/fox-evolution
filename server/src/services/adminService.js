import { FlagSource, PrincipalType } from '@prisma/client';
import { prisma } from '../db.js';
import { hashPassword } from '../utils/crypto.js';
import { generateTemporaryPassword } from '../utils/password.js';
import { serializeSave } from './saveService.js';

export async function getAdminOverview() {
  const [usersTotal, usersFlagged, devicesTotal, devicesFlagged, savesTotal, topFlagReasons] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isFlagged: true } }),
    prisma.device.count(),
    prisma.device.count({ where: { isFlagged: true } }),
    prisma.gameSave.count(),
    prisma.cheatFlag.groupBy({
      by: ['reason'],
      _count: { reason: true },
      orderBy: { _count: { reason: 'desc' } },
      take: 5
    })
  ]);

  return {
    usersTotal,
    usersFlagged,
    devicesTotal,
    devicesFlagged,
    savesTotal,
    topFlagReasons: topFlagReasons.map((item) => ({ reason: item.reason, count: item._count.reason }))
  };
}

export async function listUsers({ page = 1, pageSize = 20, search = '', filter = 'all' }) {
  const normalizedPageSize = Math.max(1, Math.min(100, Number(pageSize) || 20));
  const normalizedPage = Math.max(1, Number(page) || 1);
  const skip = (normalizedPage - 1) * normalizedPageSize;
  const query = String(search || '').trim();

  const filters = [];
  if (query) {
    filters.push({ OR: [{ id: { contains: query } }, { publicId: { contains: query } }, { email: { contains: query } }, { displayName: { contains: query } }] });
  }
  if (filter === 'flagged') {
    filters.push({ isFlagged: true });
  }
  if (filter === 'admins') {
    filters.push({ role: 'ADMIN' });
  }
  const where = filters.length > 0 ? { AND: filters } : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: normalizedPageSize,
      select: {
        id: true,
        publicId: true,
        email: true,
        displayName: true,
        role: true,
        isFlagged: true,
        flagReason: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            saves: true,
            deviceLinks: true
          }
        }
      }
    })
  ]);

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    total,
    items: users.map((user) => ({
      ...user,
      savesCount: user._count.saves,
      linkedDevicesCount: user._count.deviceLinks
    }))
  };
}

export async function getUserDetails(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      saves: {
        orderBy: { updatedAt: 'desc' }
      },
      flags: {
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      deviceLinks: {
        include: {
          device: true
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    publicId: user.publicId,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isFlagged: user.isFlagged,
    flagReason: user.flagReason,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    saves: user.saves.map(serializeSave),
    flags: user.flags,
    devices: user.deviceLinks.map((link) => ({
      id: link.device.id,
      label: link.device.label,
      isFlagged: link.device.isFlagged,
      linkedAt: link.linkedAt,
      createdAt: link.device.createdAt
    }))
  };
}

export async function resetUserPassword({ adminUserId, userId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true }
  });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }
  if (user.id === adminUserId) {
    throw new Error('CANNOT_RESET_OWN_PASSWORD');
  }
  if (!user.email) {
    throw new Error('PASSWORD_LOGIN_UNAVAILABLE');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const revokedSessions = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 }
      }
    });
    const revoked = await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    await tx.auditLog.create({
      data: {
        adminUserId,
        action: 'ADMIN_RESET_USER_PASSWORD',
        targetType: 'User',
        targetId: userId,
        details: { revokedSessions: revoked.count }
      }
    });
    return revoked.count;
  });

  return { temporaryPassword, revokedSessions };
}

export async function setUserFlag({ adminUserId, userId, flagged, reason }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        isFlagged: Boolean(flagged),
        flagReason: flagged ? reason || 'Manual admin flag' : null
      }
    });

    if (flagged) {
      await tx.cheatFlag.create({
        data: {
          source: FlagSource.ADMIN,
          userId,
          adminId: adminUserId,
          reason: reason || 'Manual admin flag',
          score: 100
        }
      });
    }

    await tx.auditLog.create({
      data: {
        adminUserId,
        action: flagged ? 'ADMIN_FLAG_USER' : 'ADMIN_UNFLAG_USER',
        targetType: 'User',
        targetId: userId,
        details: { reason: reason || null }
      }
    });
  });
}

export async function getSaveDetails(saveId) {
  const save = await prisma.gameSave.findUnique({
    where: { id: saveId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      },
      device: {
        select: {
          id: true,
          label: true
        }
      }
    }
  });

  if (!save) {
    return null;
  }

  return {
    ...serializeSave(save),
    state: save.state,
    owner: save.ownerType === PrincipalType.USER ? save.user : save.device,
    cheatNotes: save.cheatNotes,
    editedByAdminAt: save.editedByAdminAt
  };
}

export async function recentAuditLogs(limit = 50) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(200, Number(limit) || 50)),
    include: {
      admin: {
        select: {
          id: true,
          displayName: true,
          email: true
        }
      }
    }
  });

  return rows;
}

export async function getTelemetryStats(days = 30) {
  const safeDays = Math.max(1, Math.min(120, Number(days) || 30));
  const since = new Date();
  since.setDate(since.getDate() - safeDays);

  const [totalEvents, byType, dailyActivity] = await Promise.all([
    prisma.telemetryEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.telemetryEvent.groupBy({
      by: ['eventType'],
      _count: { eventType: true },
      where: { createdAt: { gte: since } },
      orderBy: { _count: { eventType: 'desc' } },
      take: 20
    }),
    prisma.$queryRaw`
      SELECT DATE(createdAt) AS day, COUNT(DISTINCT userId) AS activeUsers, COUNT(DISTINCT deviceId) AS activeDevices
      FROM TelemetryEvent
      WHERE createdAt >= ${since}
      GROUP BY DATE(createdAt)
      ORDER BY day DESC
      LIMIT ${safeDays}
    `
  ]);

  const normalizedDailyActivity = Array.isArray(dailyActivity)
    ? dailyActivity.map((row) => ({
        day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day),
        activeUsers: Number(row.activeUsers ?? 0),
        activeDevices: Number(row.activeDevices ?? 0)
      }))
    : [];

  return {
    since,
    totalEvents,
    byType: byType.map((row) => ({
      eventType: row.eventType,
      count: row._count.eventType
    })),
    dailyActivity: normalizedDailyActivity
  };
}
