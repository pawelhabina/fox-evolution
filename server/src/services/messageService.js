import { prisma } from '../db.js';

export async function createAdminMessage({ adminUserId, audience, userId, title, body }) {
  const normalizedAudience = String(audience || '').toUpperCase();
  const normalizedTitle = String(title || '').trim();
  const normalizedBody = String(body || '').trim();

  if (!['GLOBAL', 'USER'].includes(normalizedAudience)) {
    throw new Error('INVALID_MESSAGE_AUDIENCE');
  }

  let recipients;
  if (normalizedAudience === 'GLOBAL') {
    recipients = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true }
    });
  } else {
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { publicId: userId }
        ]
      },
      select: { id: true }
    });
    if (!recipient) {
      throw new Error('USER_NOT_FOUND');
    }
    recipients = [recipient];
  }

  return prisma.$transaction(async (tx) => {
    const message = await tx.adminMessage.create({
      data: {
        audience: normalizedAudience,
        title: normalizedTitle,
        body: normalizedBody,
        createdByAdminId: adminUserId
      }
    });

    if (recipients.length > 0) {
      await tx.adminMessageDelivery.createMany({
        data: recipients.map((recipient) => ({
          messageId: message.id,
          userId: recipient.id
        }))
      });
    }

    await tx.auditLog.create({
      data: {
        adminUserId,
        action: 'ADMIN_SEND_PLAYER_MESSAGE',
        targetType: normalizedAudience === 'GLOBAL' ? 'AllUsers' : 'User',
        targetId: normalizedAudience === 'GLOBAL' ? message.id : recipients[0].id,
        details: {
          audience: normalizedAudience,
          title: normalizedTitle,
          deliveries: recipients.length
        }
      }
    });

    return { message, deliveryCount: recipients.length };
  });
}

export async function listAdminMessages(limit = 50) {
  const messages = await prisma.adminMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(100, Number(limit) || 50)),
    include: {
      createdByAdmin: {
        select: { id: true, displayName: true, email: true }
      },
      deliveries: {
        take: 1,
        select: {
          user: { select: { id: true, publicId: true, displayName: true, email: true } }
        }
      },
      _count: { select: { deliveries: true } }
    }
  });

  if (messages.length === 0) {
    return [];
  }
  const readCounts = await prisma.adminMessageDelivery.groupBy({
    by: ['messageId'],
    where: {
      messageId: { in: messages.map((message) => message.id) },
      readAt: { not: null }
    },
    _count: { messageId: true }
  });
  const readByMessageId = new Map(readCounts.map((row) => [row.messageId, row._count.messageId]));

  return messages.map((message) => ({
    id: message.id,
    audience: message.audience,
    title: message.title,
    body: message.body,
    createdAt: message.createdAt,
    createdByAdmin: message.createdByAdmin,
    recipient: message.audience === 'USER' ? message.deliveries[0]?.user || null : null,
    deliveryCount: message._count.deliveries,
    readCount: readByMessageId.get(message.id) || 0
  }));
}

export async function getPendingPlayerMessage(principal) {
  if (principal?.type !== 'USER') {
    return null;
  }
  const delivery = await prisma.adminMessageDelivery.findFirst({
    where: { userId: principal.id, readAt: null },
    orderBy: { createdAt: 'asc' },
    include: {
      message: {
        select: { id: true, title: true, body: true, createdAt: true }
      }
    }
  });
  if (!delivery) {
    return null;
  }
  return {
    deliveryId: delivery.id,
    messageId: delivery.message.id,
    title: delivery.message.title,
    body: delivery.message.body,
    createdAt: delivery.message.createdAt
  };
}

export async function markPlayerMessageRead(principal, deliveryId) {
  if (principal?.type !== 'USER') {
    return false;
  }
  const updated = await prisma.adminMessageDelivery.updateMany({
    where: { id: deliveryId, userId: principal.id },
    data: { readAt: new Date() }
  });
  return updated.count > 0;
}
