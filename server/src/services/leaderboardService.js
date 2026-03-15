import { LeaderboardCategory } from '@prisma/client';
import { prisma } from '../db.js';

const CATEGORIES = [LeaderboardCategory.COINS, LeaderboardCategory.GEMS, LeaderboardCategory.TOP_TIER];

function pickCategoryValue(save, category) {
  if (category === LeaderboardCategory.COINS) {
    return save.summaryCoins;
  }
  if (category === LeaderboardCategory.GEMS) {
    return save.summaryGems;
  }
  return BigInt(save.summaryTopTier);
}

function buildRowsForCategory(users, category, generatedAt) {
  const rows = users
    .map((user) => {
      let value = 0n;
      for (const save of user.saves) {
        const candidate = pickCategoryValue(save, category);
        if (candidate > value) {
          value = candidate;
        }
      }
      return {
        userId: user.id,
        value,
        generatedAt,
        category
      };
    })
    .filter((row) => row.value > 0n)
    .sort((a, b) => {
      if (a.value === b.value) {
        return a.userId.localeCompare(b.userId);
      }
      return a.value > b.value ? -1 : 1;
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));

  return rows;
}

export async function refreshLeaderboards() {
  const users = await prisma.user.findMany({
    where: {
      isFlagged: false,
      saves: {
        some: {
          ownerType: 'USER'
        }
      }
    },
    select: {
      id: true,
      saves: {
        where: {
          ownerType: 'USER'
        },
        select: {
          summaryCoins: true,
          summaryGems: true,
          summaryTopTier: true
        }
      }
    }
  });

  const generatedAt = new Date();

  await prisma.$transaction(async (tx) => {
    for (const category of CATEGORIES) {
      await tx.leaderboardEntry.deleteMany({ where: { category } });
      const rows = buildRowsForCategory(users, category, generatedAt);
      if (rows.length > 0) {
        await tx.leaderboardEntry.createMany({ data: rows });
      }
    }
  });

  return { generatedAt, usersProcessed: users.length };
}

function serializeEntry(entry) {
  return {
    rank: entry.rank,
    value: entry.value.toString(),
    user: {
      id: entry.user.id,
      displayName: entry.user.displayName
    }
  };
}

export async function getLeaderboard({ category, limit = 10, principal }) {
  const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 10));

  const [top, myEntry, latest] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: { category },
      orderBy: { rank: 'asc' },
      take: normalizedLimit,
      include: {
        user: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    }),
    principal?.type === 'USER'
      ? prisma.leaderboardEntry.findFirst({
          where: {
            category,
            userId: principal.id
          },
          include: {
            user: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        })
      : Promise.resolve(null),
    prisma.leaderboardEntry.findFirst({ where: { category }, orderBy: { generatedAt: 'desc' } })
  ]);

  return {
    category,
    updatedAt: latest?.generatedAt || null,
    top: top.map(serializeEntry),
    myRank: myEntry ? serializeEntry(myEntry) : null
  };
}

export function parseLeaderboardCategory(rawCategory) {
  const normalized = String(rawCategory || '').trim().toUpperCase();
  if (normalized === 'COINS') {
    return LeaderboardCategory.COINS;
  }
  if (normalized === 'GEMS') {
    return LeaderboardCategory.GEMS;
  }
  if (normalized === 'TOP_TIER' || normalized === 'TOPTIER') {
    return LeaderboardCategory.TOP_TIER;
  }
  return null;
}
