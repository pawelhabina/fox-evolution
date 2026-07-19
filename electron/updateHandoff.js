const { spawn } = require('child_process');
const path = require('path');

function toPowerShellLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildWindowsUpdateScript({ appPid, appExecutablePath, installerPath, logPath }) {
  const safePid = Math.max(1, Math.trunc(Number(appPid) || 0));
  const processName = path.parse(String(appExecutablePath || '')).name;

  return [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `$installerPath = ${toPowerShellLiteral(installerPath)}`,
    `$logPath = ${toPowerShellLiteral(logPath)}`,
    `$processName = ${toPowerShellLiteral(processName)}`,
    'Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) Waiting for Fox Evolution to exit"',
    `Wait-Process -Id ${safePid} -ErrorAction SilentlyContinue`,
    '$deadline = (Get-Date).AddSeconds(12)',
    'do {',
    '  $remaining = @(Get-Process -Name $processName -ErrorAction SilentlyContinue)',
    '  if ($remaining.Count -eq 0) { break }',
    '  Start-Sleep -Milliseconds 250',
    '} while ((Get-Date) -lt $deadline)',
    'if ($remaining.Count -gt 0) {',
    '  Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) Closing leftover Electron processes"',
    '  $remaining | Stop-Process -Force -ErrorAction SilentlyContinue',
    '  Start-Sleep -Milliseconds 1000',
    '}',
    'Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) Starting downloaded installer"',
    "Start-Process -FilePath $installerPath -ArgumentList @('--updated', '--force-run')"
  ].join('; ');
}

function launchWindowsUpdateHandoff(options) {
  const script = buildWindowsUpdateScript(options);
  const helper = spawn(
    'powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    }
  );
  helper.unref();
  return helper.pid;
}

module.exports = {
  buildWindowsUpdateScript,
  launchWindowsUpdateHandoff,
  toPowerShellLiteral
};
