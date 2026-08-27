const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} zakończył się kodem ${result.status}`);
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`;
  run('codesign', ['--force', '--deep', '--sign', '-', '--timestamp=none', appPath]);
  run('codesign', [
    '--force',
    '--sign',
    '-',
    '--timestamp=none',
    '--requirements',
    '=designated => identifier "com.foxevolution.app"',
    appPath
  ]);
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath]);
};
