import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const siteDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

test('public site contains the complete download journey and required assets', () => {
  const html = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(siteDir, 'site.css'), 'utf8');
  const script = fs.readFileSync(path.join(siteDir, 'site.js'), 'utf8');

  assert.match(html, /Fox Evolution — Merge Fox Tycoon/);
  assert.match(html, /href="\/download\/windows"/);
  assert.match(html, /href="\/download\/macos\/arm64"/);
  assert.match(html, /href="\/download\/macos\/x64"/);
  assert.match(html, /WINDOWS \+ MACOS/);
  assert.match(html, /id="gra"/);
  assert.match(html, /id="ewolucja"/);
  assert.match(html, /id="funkcje"/);
  assert.match(html, /id="faq"/);
  assert.match(html, /data-merge-stage/);
  assert.equal((html.match(/data-merge-fox/g) || []).length, 2);
  assert.equal((html.match(/data-evolution-node/g) || []).length, 4);
  assert.equal((html.match(/data-tilt/g) || []).length, 3);
  assert.match(html, /data-scroll-progress/);

  assert.match(script, /completeMergeDemo/);
  assert.match(script, /--hero-tilt-x/);
  assert.match(script, /--scroll-progress/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(css, /@keyframes particle-burst/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);

  assert.ok(fs.existsSync(path.join(siteDir, 'og.png')), 'missing social preview image');

  for (const asset of ['fox-evolution-icon.png', 'fox-tier-01.png', 'fox-tier-05.png', 'fox-tier-10.png', 'fox-tier-15.png']) {
    assert.ok(fs.existsSync(path.join(siteDir, 'assets', asset)), `missing site asset: ${asset}`);
  }
});
