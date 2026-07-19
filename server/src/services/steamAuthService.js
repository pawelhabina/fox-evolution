const STEAM_OPENID_IDENTIFIER = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})\/?$/i;
const STEAM_ID = /^\d{17}$/;

export function normalizeSteamIdentifier(value) {
  const identifier = String(value || '').trim();
  if (STEAM_ID.test(identifier)) {
    return identifier;
  }

  const match = identifier.match(STEAM_OPENID_IDENTIFIER);
  if (!match) {
    throw new Error('STEAM_ID_INVALID');
  }
  return match[1];
}
