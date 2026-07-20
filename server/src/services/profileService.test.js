import assert from 'node:assert/strict';
import test from 'node:test';
import { getNicknameChangeAvailableAt, normalizeNickname, NICKNAME_CHANGE_COOLDOWN_MS } from './profileService.js';

test('normalizes whitespace and accepts Polish nickname characters', () => {
  assert.equal(normalizeNickname('  Leśny   Lis_7  '), 'Leśny Lis_7');
});

test('rejects nickname characters that are unsafe for the public profile', () => {
  assert.throws(() => normalizeNickname('<script>'), /NICKNAME_CHARACTERS_INVALID/);
  assert.throws(() => normalizeNickname('x'), /NICKNAME_LENGTH_INVALID/);
});

test('allows onboarding immediately and applies a 15 minute cooldown later', () => {
  const changedAt = new Date('2026-07-20T10:00:00.000Z');
  assert.equal(getNicknameChangeAvailableAt({ profileSetupRequired: true, nicknameChangedAt: changedAt }, changedAt.getTime()), null);

  const availableAt = getNicknameChangeAvailableAt(
    { profileSetupRequired: false, nicknameChangedAt: changedAt },
    changedAt.getTime() + 1000
  );
  assert.equal(availableAt.getTime(), changedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_MS);
  assert.equal(
    getNicknameChangeAvailableAt(
      { profileSetupRequired: false, nicknameChangedAt: changedAt },
      changedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_MS
    ),
    null
  );
});
