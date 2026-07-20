const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function toPowerShellLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildWindowsUpdateScript({ appPid, appExecutablePath, installerPath, logPath }) {
  const safePid = Math.max(1, Math.trunc(Number(appPid) || 0));
  const executablePath = String(appExecutablePath || '');
  const processName = (executablePath.includes('\\') ? path.win32 : path).parse(executablePath).name;

  return [
    "$ErrorActionPreference = 'Stop'",
    `$installerPath = ${toPowerShellLiteral(installerPath)}`,
    `$logPath = ${toPowerShellLiteral(logPath)}`,
    `$processName = ${toPowerShellLiteral(processName)}`,
    'function Write-UpdateLog([string]$message) {',
    '  Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format o) $message"',
    '}',
    'try {',
    '  Write-UpdateLog "Update helper started"',
    '  if (-not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {',
    '    throw "Downloaded installer does not exist: $installerPath"',
    '  }',
    `  $appPid = ${safePid}`,
    '  $appDeadline = (Get-Date).AddSeconds(30)',
    '  while (Get-Process -Id $appPid -ErrorAction SilentlyContinue) {',
    '    if ((Get-Date) -ge $appDeadline) {',
    '      Write-UpdateLog "Electron did not exit in time; forcing PID $appPid to close"',
    '      Stop-Process -Id $appPid -Force -ErrorAction SilentlyContinue',
    '      break',
    '    }',
    '    Start-Sleep -Milliseconds 250',
    '  }',
    '  $processDeadline = (Get-Date).AddSeconds(12)',
    '  do {',
    '    $remaining = @(Get-Process -Name $processName -ErrorAction SilentlyContinue)',
    '    if ($remaining.Count -eq 0) { break }',
    '    Start-Sleep -Milliseconds 250',
    '  } while ((Get-Date) -lt $processDeadline)',
    '  if ($remaining.Count -gt 0) {',
    '    Write-UpdateLog "Closing leftover Electron processes"',
    '    $remaining | Stop-Process -Force -ErrorAction SilentlyContinue',
    '    Start-Sleep -Milliseconds 1000',
    '  }',
    '  Write-UpdateLog "Starting downloaded installer"',
    "  $installer = Start-Process -FilePath $installerPath -ArgumentList @('--updated', '--force-run') -PassThru -Wait",
    '  Write-UpdateLog "Installer finished with exit code $($installer.ExitCode)"',
    '  if ($installer.ExitCode -ne 0) { throw "Installer exited with code $($installer.ExitCode)" }',
    '} catch {',
    '  Write-UpdateLog "UPDATE FAILED: $($_.Exception.Message)"',
    '  exit 1',
    '}',
    'exit 0'
  ].join('\r\n');
}

function launchWindowsUpdateHandoff(options) {
  const script = buildWindowsUpdateScript(options);
  const scriptPath = path.join(path.dirname(options.logPath), 'update-handoff.ps1');
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });
  // Windows PowerShell 5.1 needs a BOM to decode non-ASCII user profile paths reliably.
  fs.writeFileSync(scriptPath, `\uFEFF${script}`, 'utf8');
  const helper = spawn(
    'powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    }
  );
  helper.unref();
  return { pid: helper.pid, scriptPath };
}

module.exports = {
  buildWindowsUpdateScript,
  launchWindowsUpdateHandoff,
  toPowerShellLiteral
};
