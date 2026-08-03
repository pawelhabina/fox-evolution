import crypto from 'crypto';

const PASSWORD_GROUPS = [
  'abcdefghijkmnopqrstuvwxyz',
  'ABCDEFGHJKLMNPQRSTUVWXYZ',
  '23456789',
  '!@#$%&*+-=?'
];
const PASSWORD_ALPHABET = PASSWORD_GROUPS.join('');

function randomCharacter(characters) {
  return characters[crypto.randomInt(0, characters.length)];
}

export function generateTemporaryPassword(length = 20) {
  const safeLength = Math.max(16, Math.min(64, Math.floor(Number(length) || 20)));
  const characters = PASSWORD_GROUPS.map(randomCharacter);

  while (characters.length < safeLength) {
    characters.push(randomCharacter(PASSWORD_ALPHABET));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters.join('');
}
