import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('desktop OAuth ends on a success page and then opens the app protocol', () => {
  const authRoute = fs.readFileSync(path.join(serverRoot, 'src/routes/auth.js'), 'utf8');
  const completionScript = fs.readFileSync(path.join(serverRoot, 'src/site/public/oauth-complete.js'), 'utf8');

  assert.match(authRoute, /url\.protocol === 'fox-evolution:'/);
  assert.match(authRoute, /Pomyślnie zalogowano/);
  assert.match(authRoute, /Cache-Control', 'no-store'/);
  assert.match(authRoute, /oauth-complete\.js/);
  assert.match(completionScript, /window\.location\.assign\(openAppLink\.href\)/);
  assert.match(completionScript, /setTimeout\(launchFoxEvolution, 300\)/);
});
