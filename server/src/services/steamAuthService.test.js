import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSteamIdentifier } from './steamAuthService.js';

test('normalizes an OpenID claimed identifier to a SteamID64', () => {
  assert.equal(
    normalizeSteamIdentifier('https://steamcommunity.com/openid/id/76561198000000000'),
    '76561198000000000'
  );
});

test('accepts an already normalized SteamID64', () => {
  assert.equal(normalizeSteamIdentifier('76561198000000000'), '76561198000000000');
});

test('rejects identifiers outside the Steam OpenID namespace', () => {
  assert.throws(
    () => normalizeSteamIdentifier('https://example.com/openid/id/76561198000000000'),
    /STEAM_ID_INVALID/
  );
});
