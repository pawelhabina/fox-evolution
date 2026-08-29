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

test('installer recovers from a broken legacy uninstaller without deleting game data', () => {
  const installerInclude = fs.readFileSync(path.join(projectRoot, 'build/installer.nsh'), 'utf8');

  assert.match(installerInclude, /!macro customUnInstallCheck\b/);
  assert.match(installerInclude, /!macro customUnInstallCheckCurrentUser\b/);
  assert.match(installerInclude, /RMDir \/r "\$INSTDIR"/);
  assert.doesNotMatch(installerInclude, /RMDir \/r .*AppData\\Roaming\\fox-evolution/i);
});

test('waits for Windows file handles before starting the downloaded installer', () => {
  const electronMain = fs.readFileSync(path.join(projectRoot, 'electron/main.js'), 'utf8');

  assert.match(electronMain, /await new Promise\(\(resolve\) => setTimeout\(resolve, 10_000\)\)/);
  assert.match(electronMain, /autoUpdater\.quitAndInstall\(true, true\)/);
  assert.doesNotMatch(electronMain, /launchWindowsUpdateHandoff/);
});

test('checks for updates periodically, after resume, and from both game menus', () => {
  const electronMain = fs.readFileSync(path.join(projectRoot, 'electron/main.js'), 'utf8');
  const app = fs.readFileSync(path.join(projectRoot, 'src/App.jsx'), 'utf8');
  const mainMenu = fs.readFileSync(path.join(projectRoot, 'src/components/MainMenu.jsx'), 'utf8');

  assert.match(electronMain, /UPDATE_CHECK_INTERVAL_MS = 10 \* 60 \* 1000/);
  assert.match(electronMain, /powerMonitor\.on\('resume'/);
  assert.match(electronMain, /mainWindow\.on\('focus'/);
  assert.match(electronMain, /showUpdateReadyNotification/);
  assert.match(app, /Sprawdź aktualizacje/);
  assert.match(mainMenu, /Sprawdź aktualizacje/);
});

test('uses a full-width draggable title bar with native macOS traffic lights', () => {
  const electronMain = fs.readFileSync(path.join(projectRoot, 'electron/main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(projectRoot, 'src/styles.css'), 'utf8');
  const dragRegion = styles.match(/\.electron-drag-region \{[\s\S]*?\n\}/);

  assert.ok(dragRegion);
  assert.match(dragRegion[0], /right: 0/);
  assert.match(dragRegion[0], /left: 0/);
  assert.match(electronMain, /trafficLightPosition: \{ x: 12, y: 9 \}/);
});

test('elemental fox atlas covers levels 15 through 20 and marks rarer levels', () => {
  const sprites = fs.readFileSync(path.join(projectRoot, 'src/assets/foxSprites.js'), 'utf8');
  const arena = fs.readFileSync(path.join(projectRoot, 'src/components/Arena.jsx'), 'utf8');

  assert.match(sprites, /fox-element-progression-atlas-v2\.png/);
  assert.match(sprites, /Math\.min\(5, safeTier - 15\)/);
  assert.match(sprites, /backgroundSize: '600% 300%'/);
  assert.match(arena, /fox\.evolution && fox\.tier > 20/);
  assert.match(arena, /fox-rare-level-marker/);
});

test('main menu uses the official game icon instead of the paw glyph', () => {
  const mainMenu = fs.readFileSync(path.join(projectRoot, 'src/components/MainMenu.jsx'), 'utf8');

  assert.match(mainMenu, /fox-evolution-icon\.png/);
  assert.match(mainMenu, /className="main-menu-brand-icon"/);
  assert.doesNotMatch(mainMenu, /<GuiIcon name="pet" alt="" size=\{64\} \/>/);
});

test('version 1.2.11 is visibly marked as Early Access', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const constants = fs.readFileSync(path.join(projectRoot, 'src/game/constants.js'), 'utf8');
  const mainMenu = fs.readFileSync(path.join(projectRoot, 'src/components/MainMenu.jsx'), 'utf8');

  assert.equal(packageJson.version, '1.2.11');
  assert.match(constants, /GAME_VERSION = '1\.2\.11'/);
  assert.match(constants, /RELEASE_CHANNEL = 'EARLY ACCESS'/);
  assert.match(mainMenu, /EARLY ACCESS/);
  assert.match(mainMenu, /Wczesna wersja gry/);
});

test('macOS packages receive a complete stable ad-hoc signature', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const hook = fs.readFileSync(path.join(projectRoot, 'scripts/after-pack.cjs'), 'utf8');
  assert.equal(packageJson.build.afterPack, 'scripts/after-pack.cjs');
  assert.match(hook, /'--deep', '--sign', '-'/);
  assert.match(hook, /designated => identifier \"com\.foxevolution\.app\"/);
  assert.match(hook, /'--verify', '--deep', '--strict'/);
});

test('production deployment publishes Windows and macOS update artifacts', () => {
  const deployScript = fs.readFileSync(path.join(projectRoot, 'scripts/deploy-s1.mjs'), 'utf8');
  const nginxConfig = fs.readFileSync(path.join(projectRoot, 'deploy/s1/foxevo.mionix.pl.nginx'), 'utf8');
  const serverEntry = fs.readFileSync(path.join(projectRoot, 'server/src/server.js'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

  for (const include of ['*.exe', '*.zip', '*.dmg', 'latest.yml', 'latest-mac.yml']) {
    assert.match(deployScript, new RegExp(`--include=${include.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  }
  assert.match(deployScript, /\[ ! -f \$\{targetUpdates\}\/latest\.yml \] && \[ ! -f \$\{targetUpdates\}\/latest-mac\.yml \]/);
  assert.ok(packageJson.build.files.includes('!dist/*.dmg'));
  assert.ok(packageJson.build.files.includes('!dist/*.zip'));
  assert.ok(packageJson.build.files.includes('!dist/*.blockmap'));
  assert.ok(packageJson.build.files.includes('!dist/mac{,/**/*}'));
  assert.match(nginxConfig, /location \/updates\/[\s\S]*Cache-Control "no-cache, must-revalidate"/);
  assert.match(serverEntry, /setHeader\('Cache-Control', 'no-cache, must-revalidate'\)/);
});

test('GitHub releases are published as restartable Early Access prereleases', () => {
  const workflow = fs.readFileSync(path.join(projectRoot, '.github/workflows/release.yml'), 'utf8');

  assert.match(workflow, /workflow_dispatch:[\s\S]*release_tag:/);
  assert.match(workflow, /inputs\.release_tag \|\| github\.ref/);
  assert.match(workflow, /Fox Evolution \$version Early Access/);
  assert.match(workflow, /gh release upload .* --clobber/);
  assert.match(workflow, /gh release edit .* --prerelease/);
  assert.match(workflow, /gh release create .* --prerelease/);
});
