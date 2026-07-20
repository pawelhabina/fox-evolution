const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = require('../package.json');

test('packages the production generic update feed', () => {
  const [publish] = packageJson.build.publish || [];
  assert.deepEqual(publish, {
    provider: 'generic',
    url: 'https://foxevo.mionix.pl/updates'
  });
});

test('uses existing application and installer icon assets', () => {
  const iconPaths = [
    packageJson.build.win.icon,
    packageJson.build.mac.icon,
    packageJson.build.linux.icon,
    packageJson.build.nsis.installerIcon,
    packageJson.build.nsis.uninstallerIcon
  ];

  for (const iconPath of iconPaths) {
    assert.ok(iconPath, 'icon path must be configured');
    assert.ok(fs.existsSync(path.join(projectRoot, iconPath)), `missing icon: ${iconPath}`);
  }
});
