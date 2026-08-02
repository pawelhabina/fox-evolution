import assert from 'node:assert/strict';
import test from 'node:test';
import { artifactNamesFromManifest } from './downloads.js';

test('reads Windows and both macOS architectures from update manifests', () => {
  const manifest = [
    'files:',
    '  - url: Fox-Evolution-1.1.19-arm64.dmg',
    '  - url: Fox-Evolution-1.1.19-x64.dmg',
    'path: Fox-Evolution-1.1.19-x64.exe'
  ].join('\n');

  assert.deepEqual(artifactNamesFromManifest(manifest), [
    'Fox-Evolution-1.1.19-arm64.dmg',
    'Fox-Evolution-1.1.19-x64.dmg',
    'Fox-Evolution-1.1.19-x64.exe'
  ]);
});
