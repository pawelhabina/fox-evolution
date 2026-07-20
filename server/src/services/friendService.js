import { FriendshipStatus } from '@prisma/client';
import { prisma } from '../db.js';

function serializeFriendUser(user) {
  return {
    uuid: user.publicId,
    displayName: user.displayName
  };
}

function serializeFriendship(friendship, userId) {
  const isRequester = friendship.requesterId === userId;
  const otherUser = isRequester ? friendship.addressee : friendship.requester;
  return {
    id: friendship.id,
    status: friendship.status,
    direction: isRequester ? 'OUTGOING' : 'INCOMING',
    user: serializeFriendUser(otherUser),
    createdAt: friendship.createdAt,
    updatedAt: friendship.updatedAt
  };
}

const friendshipInclude = {
  requester: { select: { id: true, publicId: true, displayName: true } },
  addressee: { select: { id: true, publicId: true, displayName: true } }
};

export async function listFriends(userId) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: userId }, { addresseeId: userId }]
    },
    include: friendshipInclude,
    orderBy: { updatedAt: 'desc' }
  });

  const serialized = friendships.map((friendship) => serializeFriendship(friendship, userId));
  return {
    friends: serialized.filter((item) => item.status === FriendshipStatus.ACCEPTED),
    incoming: serialized.filter((item) => item.status === FriendshipStatus.PENDING && item.direction === 'INCOMING'),
    outgoing: serialized.filter((item) => item.status === FriendshipStatus.PENDING && item.direction === 'OUTGOING')
  };
}

export async function searchFriendCandidates(userId, query) {
  const normalized = String(query || '').trim();
  if (normalized.length < 2) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      publicId: { not: null },
      OR: [
        { publicId: normalized },
        { displayName: { contains: normalized } }
      ]
    },
    select: { id: true, publicId: true, displayName: true },
    take: 12,
    orderBy: { displayName: 'asc' }
  });

  const userIds = users.map((user) => user.id);
  const relations = userIds.length > 0
    ? await prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: { in: userIds } },
            { addresseeId: userId, requesterId: { in: userIds } }
          ]
        }
      })
    : [];

  const relationByUserId = new Map();
  for (const relation of relations) {
    const otherId = relation.requesterId === userId ? relation.addresseeId : relation.requesterId;
    relationByUserId.set(otherId, relation.status);
  }

  return users.map((user) => ({
    ...serializeFriendUser(user),
    friendshipStatus: relationByUserId.get(user.id) || null
  }));
}

export async function sendFriendRequest(userId, targetUuid) {
  const target = await prisma.user.findFirst({
    where: { publicId: String(targetUuid || '').trim() },
    select: { id: true }
  });
  if (!target) {
    throw new Error('FRIEND_TARGET_NOT_FOUND');
  }
  if (target.id === userId) {
    throw new Error('FRIEND_SELF_NOT_ALLOWED');
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId }
      ]
    },
    include: friendshipInclude
  });

  if (existing?.status === FriendshipStatus.ACCEPTED) {
    throw new Error('FRIENDSHIP_ALREADY_EXISTS');
  }
  if (existing?.status === FriendshipStatus.PENDING) {
    if (existing.addresseeId === userId) {
      const accepted = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: FriendshipStatus.ACCEPTED },
        include: friendshipInclude
      });
      return serializeFriendship(accepted, userId);
    }
    return serializeFriendship(existing, userId);
  }

  const created = await prisma.friendship.create({
    data: {
      requesterId: userId,
      addresseeId: target.id
    },
    include: friendshipInclude
  });
  return serializeFriendship(created, userId);
}

export async function acceptFriendRequest(userId, friendshipId) {
  const existing = await prisma.friendship.findFirst({
    where: {
      id: friendshipId,
      addresseeId: userId,
      status: FriendshipStatus.PENDING
    }
  });
  if (!existing) {
    throw new Error('FRIEND_REQUEST_NOT_FOUND');
  }
  const accepted = await prisma.friendship.update({
    where: { id: existing.id },
    data: { status: FriendshipStatus.ACCEPTED },
    include: friendshipInclude
  });
  return serializeFriendship(accepted, userId);
}

export async function removeFriendship(userId, friendshipId) {
  const existing = await prisma.friendship.findFirst({
    where: {
      id: friendshipId,
      OR: [{ requesterId: userId }, { addresseeId: userId }]
    }
  });
  if (!existing) {
    throw new Error('FRIENDSHIP_NOT_FOUND');
  }
  await prisma.friendship.delete({ where: { id: existing.id } });
  return true;
}
