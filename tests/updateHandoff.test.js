const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWindowsUpdateScript, toPowerShellLiteral } = require('../electron/updateHandoff');

test('escapes apostrophes in PowerShell literals', () => {
  assert.equal(toPowerShellLiteral("C:\\Users\\O'Brien\\update.exe"), "'C:\\Users\\O''Brien\\update.exe'");
});

test('writes a multiline helper that waits for Electron and logs installer failures', () => {
  const script = buildWindowsUpdateScript({
    appPid: 4321,
    appExecutablePath: 'C:\\Apps\\Fox Evolution\\Fox Evolution.exe',
    installerPath: 'C:\\Temp\\Fox-Evolution-1.1.5-x64.exe',
    logPath: 'C:\\Users\\Player\\AppData\\Roaming\\Fox Evolution\\update-install.log'
  });

  assert.match(script, /\$appPid = 4321/);
  assert.match(script, /\$processName = 'Fox Evolution'/);
  assert.match(script, /while \(Get-Process -Id \$appPid/);
  assert.match(script, /Get-Process -Name \$processName/);
  assert.match(script, /AddSeconds\(12\)/);
  assert.match(script, /Stop-Process -Force/);
  assert.match(script, /Test-Path -LiteralPath \$installerPath/);
  assert.match(script, /Start-Process -FilePath \$installerPath.*-PassThru -Wait/);
  assert.match(script, /'--updated', '--force-run'/);
  assert.match(script, /Installer finished with exit code/);
  assert.match(script, /UPDATE FAILED/);
  assert.match(script, /\r\n/);
  assert.doesNotMatch(script, /\{; /);
});
