import crypto from 'crypto';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.resolve(projectRoot, process.env.UPDATE_TARGET_DIR || 'server/updates');
const installerPattern = /\.(?:exe|msi|dmg|pkg|AppImage|deb|rpm)$/i;

async function discoverNextcloudRoot() {
  if (process.env.NEXTCLOUD_SYNC_ROOT) {
    return path.resolve(process.env.NEXTCLOUD_SYNC_ROOT);
  }

  const cloudStorage = path.join(os.homedir(), 'Library', 'CloudStorage');
  const entries = await fs.readdir(cloudStorage, { withFileTypes: true });
  const roots = entries.filter((entry) => entry.isDirectory() && entry.name.startsWith('Nextcloud-'));
  if (roots.length === 1) {
    return path.join(cloudStorage, roots[0].name);
  }

  const existingFoxEvoRoots = [];
  for (const root of roots) {
    const candidate = path.join(cloudStorage, root.name);
    if (await exists(path.join(candidate, 'global', 'fox-evo'))) {
      existingFoxEvoRoots.push(candidate);
    }
  }
  if (existingFoxEvoRoots.length === 1) {
    return existingFoxEvoRoots[0];
  }

  if (roots.length !== 1) {
    throw new Error(
      `Could not select one Nextcloud account for global/fox-evo from ${roots.length} mounted accounts. Set NEXTCLOUD_SYNC_ROOT explicitly.`
    );
  }
}

async function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

const nextcloudRoot = await discoverNextcloudRoot();
const targetDir = path.join(nextcloudRoot, 'global', 'fox-evo');
const safePrefix = `${path.resolve(nextcloudRoot)}${path.sep}`;
if (!path.resolve(targetDir).startsWith(safePrefix)) {
  throw new Error('Unexpected Nextcloud target path');
}

const entries = await fs.readdir(sourceDir, { withFileTypes: true });
const installers = entries.filter((entry) => entry.isFile() && installerPattern.test(entry.name));
if (installers.length === 0) {
  throw new Error(`No installers found in ${sourceDir}`);
}

await fs.mkdir(targetDir, { recursive: true });
for (const installer of installers) {
  const source = path.join(sourceDir, installer.name);
  const target = path.join(targetDir, installer.name);
  const sourceHash = await sha256(source);
  if (await exists(target)) {
    const targetHash = await sha256(target);
    if (sourceHash === targetHash) {
      console.log(`Already published: ${installer.name}`);
      continue;
    }
  }

  const temporaryTarget = path.join(targetDir, `.${installer.name}.uploading-${process.pid}`);
  try {
    await fs.copyFile(source, temporaryTarget);
    const copiedHash = await sha256(temporaryTarget);
    if (copiedHash !== sourceHash) {
      throw new Error(`Checksum mismatch after copying ${installer.name}`);
    }
    await fs.rename(temporaryTarget, target);
  } finally {
    await fs.rm(temporaryTarget, { force: true });
  }
  console.log(`Published to Nextcloud: ${installer.name}`);
}

console.log(`Nextcloud target: ${targetDir}`);
