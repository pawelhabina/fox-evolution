import { FlagSource, PrincipalType } from '@prisma/client';
import { prisma } from '../db.js';
import { detectCheatSignals } from '../utils/cheatDetection.js';
import { summarizeState } from '../utils/gameState.js';

const MAX_SAVES_PER_OWNER = 5;

function ownerWhereFromPrincipal(principal) {
  if (principal.type === 'USER') {
    return {
      ownerType: PrincipalType.USER,
      userId: principal.id
    };
  }

  return {
    ownerType: PrincipalType.DEVICE,
    deviceId: principal.id
  };
}

export function serializeSave(save) {
  return {
    id: save.id,
    slotId: save.slotId,
    name: save.name,
    ownerType: save.ownerType,
    summary: {
      coins: save.summaryCoins.toString(),
      gems: save.summaryGems.toString(),
      topTier: save.summaryTopTier
    },
    cheatScore: save.cheatScore,
    updatedAt: save.updatedAt,
    createdAt: save.createdAt
  };
}

async function applyAutoFlag({ principal, reason, score }) {
  if (principal.type === 'USER') {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: principal.id },
        data: {
          isFlagged: true,
          flagReason: reason
        }
      }),
      prisma.cheatFlag.create({
        data: {
          source: FlagSource.AUTO,
          userId: principal.id,
          reason,
          score
        }
      })
    ]);
  } else {
    await prisma.$transaction([
      prisma.device.update({
        where: { id: principal.id },
        data: {
          isFlagged: true,
          flagReason: reason
        }
      }),
      prisma.cheatFlag.create({
        data: {
          source: FlagSource.AUTO,
          deviceId: principal.id,
          reason,
          score
        }
      })
    ]);
  }
}

export async function listSavesForPrincipal(principal) {
  return prisma.gameSave.findMany({
    where: ownerWhereFromPrincipal(principal),
    orderBy: [{ updatedAt: 'desc' }]
  });
}

export async function getSaveForPrincipal(principal, slotId) {
  return prisma.gameSave.findFirst({
    where: {
      ...ownerWhereFromPrincipal(principal),
      slotId
    }
  });
}

export async function saveForPrincipal({ principal, slotId, name, state, skipCheatValidation = false, editedByAdmin = false }) {
  const ownerWhere = ownerWhereFromPrincipal(principal);
  const existing = await prisma.gameSave.findFirst({
    where: {
      ...ownerWhere,
      slotId
    }
  });

  if (!existing) {
    const count = await prisma.gameSave.count({ where: ownerWhere });
    if (count >= MAX_SAVES_PER_OWNER) {
      throw new Error('SAVE_LIMIT_REACHED');
    }
  }

  const summary = summarizeState(state);
  let cheatScore = 0;
  let cheatNotes = null;
  let flagged = false;

  if (!skipCheatValidation) {
    const elapsedSeconds = existing ? Math.max(1, Math.floor((Date.now() - existing.updatedAt.getTime()) / 1000)) : 1;
    const detection = detectCheatSignals({
      prevState: existing?.state,
      nextState: state,
      elapsedSeconds
    });

    cheatScore = detection.score;
    cheatNotes = detection.reasons.length > 0 ? detection.reasons : null;

    if (detection.shouldFlag) {
      flagged = true;
      await applyAutoFlag({
        principal,
        reason: detection.reasons.join('; ').slice(0, 300) || 'Auto anti-cheat flag',
        score: detection.score
      });
    }
  }

  const payload = {
    slotId,
    name: name?.trim() || `Save ${slotId}`,
    state,
    summaryCoins: summary.coins,
    summaryGems: summary.gems,
    summaryTopTier: summary.topTier,
    cheatScore,
    cheatNotes,
    editedByAdminAt: editedByAdmin ? new Date() : null,
    ...ownerWhere
  };

  const save = existing
    ? await prisma.gameSave.update({
        where: { id: existing.id },
        data: payload
      })
    : await prisma.gameSave.create({
        data: payload
      });

  return {
    save,
    flagged
  };
}

export async function deleteSaveForPrincipal(principal, slotId) {
  const existing = await getSaveForPrincipal(principal, slotId);
  if (!existing) {
    return false;
  }
  await prisma.gameSave.delete({ where: { id: existing.id } });
  return true;
}

export async function adminUpdateSave({ adminUserId, saveId, state, name }) {
  const existing = await prisma.gameSave.findUnique({ where: { id: saveId } });
  if (!existing) {
    throw new Error('SAVE_NOT_FOUND');
  }

  const summary = summarizeState(state || existing.state);

  const updated = await prisma.$transaction(async (tx) => {
    const save = await tx.gameSave.update({
      where: { id: saveId },
      data: {
        name: name?.trim() || existing.name,
        state: state || existing.state,
        summaryCoins: summary.coins,
        summaryGems: summary.gems,
        summaryTopTier: summary.topTier,
        editedByAdminAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        adminUserId,
        action: 'ADMIN_EDIT_SAVE',
        targetType: 'GameSave',
        targetId: saveId,
        details: {
          changedName: Boolean(name),
          changedState: Boolean(state)
        }
      }
    });

    return save;
  });

  return updated;
}
