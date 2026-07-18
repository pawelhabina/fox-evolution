import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binExtension = process.platform === 'win32' ? '.cmd' : '';
const viteCommand = path.join(projectRoot, 'node_modules', '.bin', `vite${binExtension}`);
const electronCommand = path.join(projectRoot, 'node_modules', '.bin', `electron${binExtension}`);
const viteHost = '127.0.0.1';
const vitePort = 5173;

let viteProcess = null;
let electronProcess = null;
let shuttingDown = false;

function stopChild(child, signal = 'SIGTERM') {
  if (child && child.exitCode === null && !child.killed) {
    child.kill(signal);
  }
}

function shutdown(exitCode = 0, signal = 'SIGTERM') {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  stopChild(electronProcess, signal);
  stopChild(viteProcess, signal);

  setTimeout(() => {
    process.exit(exitCode);
  }, 150).unref();
}

function waitForPort(host, port, timeoutMs = 60_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function attempt() {
      if (shuttingDown) {
        reject(new Error('Uruchamianie przerwane'));
        return;
      }

      const socket = net.createConnection({ host, port });
      socket.setTimeout(500);

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      const retry = () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Vite nie otworzył portu ${host}:${port} w ciągu ${timeoutMs / 1000}s`));
          return;
        }
        setTimeout(attempt, 150);
      };

      socket.once('error', retry);
      socket.once('timeout', retry);
    }

    attempt();
  });
}

process.once('SIGINT', () => shutdown(130, 'SIGINT'));
process.once('SIGTERM', () => shutdown(143, 'SIGTERM'));

viteProcess = spawn(viteCommand, ['--host', viteHost], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

viteProcess.once('error', (error) => {
  console.error('Nie udało się uruchomić Vite:', error.message);
  shutdown(1);
});

viteProcess.once('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(`Vite zakończył działanie${signal ? ` (${signal})` : ` z kodem ${code ?? 1}`}.`);
    shutdown(code ?? 1);
  }
});

try {
  await waitForPort(viteHost, vitePort);
  console.log(`Vite gotowy na ${viteHost}:${vitePort}. Uruchamiam Electron...`);

  electronProcess = spawn(electronCommand, ['electron/main.js'], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  electronProcess.once('error', (error) => {
    console.error('Nie udało się uruchomić Electrona:', error.message);
    shutdown(1);
  });

  electronProcess.once('exit', (code, signal) => {
    if (!shuttingDown) {
      console.log(`Electron zakończył działanie${signal ? ` (${signal})` : ` z kodem ${code ?? 0}`}.`);
      shutdown(code ?? 0);
    }
  });
} catch (error) {
  if (!shuttingDown) {
    console.error(error.message);
    shutdown(1);
  }
}
