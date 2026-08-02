import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { env } from '../config/env.js';

const router = express.Router();

export function artifactNamesFromManifest(content) {
  const candidates = [];
  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^(?:-\s*)?(?:path|url):\s*["']?([^"']+?)["']?\s*$/i);
    if (match?.[1]) {
      candidates.push(decodeURIComponent(match[1].trim()));
    }
  }
  return candidates;
}

async function existingArtifact(fileName, extension) {
  if (!fileName || path.basename(fileName) !== fileName || !fileName.toLowerCase().endsWith(extension)) {
    return null;
  }
  try {
    const stats = await fs.stat(path.join(env.updatesDir, fileName));
    return stats.isFile() ? { fileName, size: stats.size, updatedAt: stats.mtime.toISOString() } : null;
  } catch (_error) {
    return null;
  }
}

export async function findLatestWindowsArtifact() {
  try {
    const manifest = await fs.readFile(path.join(env.updatesDir, 'latest.yml'), 'utf-8');
    const fileName = artifactNamesFromManifest(manifest).find((name) => name.toLowerCase().endsWith('.exe'));
    const fromManifest = await existingArtifact(fileName, '.exe');
    if (fromManifest) {
      return fromManifest;
    }
  } catch (_error) {
    // Fall back to the newest Windows artifact when no valid manifest exists.
  }

  const entries = await fs.readdir(env.updatesDir, { withFileTypes: true });
  const artifacts = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.exe'))
      .map((entry) => existingArtifact(entry.name, '.exe'))
  );
  return artifacts.filter(Boolean).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))[0] || null;
}

export async function findLatestMacArtifact(arch) {
  if (!['arm64', 'x64'].includes(arch)) {
    return null;
  }

  try {
    const manifest = await fs.readFile(path.join(env.updatesDir, 'latest-mac.yml'), 'utf-8');
    const suffix = `-${arch}.dmg`;
    const fileName = artifactNamesFromManifest(manifest).find((name) => name.toLowerCase().endsWith(suffix));
    const fromManifest = await existingArtifact(fileName, '.dmg');
    if (fromManifest) {
      return fromManifest;
    }
  } catch (_error) {
    // Fall back to the newest matching macOS artifact when no valid manifest exists.
  }

  const suffix = `-${arch}.dmg`;
  const entries = await fs.readdir(env.updatesDir, { withFileTypes: true });
  const artifacts = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(suffix))
      .map((entry) => existingArtifact(entry.name, '.dmg'))
  );
  return artifacts.filter(Boolean).sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))[0] || null;
}

export async function redirectLatestWindows(_req, res) {
  try {
    const artifact = await findLatestWindowsArtifact();
    if (!artifact) {
      return res.status(404).json({ error: 'WINDOWS_INSTALLER_NOT_FOUND' });
    }
    return res.redirect(302, `/updates/${encodeURIComponent(artifact.fileName)}`);
  } catch (_error) {
    return res.status(500).json({ error: 'DOWNLOAD_LOOKUP_FAILED' });
  }
}

function redirectLatestMacForArch(arch) {
  return async (_req, res) => {
    try {
      const artifact = await findLatestMacArtifact(arch);
      if (!artifact) {
        return res.status(404).json({ error: 'MACOS_INSTALLER_NOT_FOUND' });
      }
      return res.redirect(302, `/updates/${encodeURIComponent(artifact.fileName)}`);
    } catch (_error) {
      return res.status(500).json({ error: 'DOWNLOAD_LOOKUP_FAILED' });
    }
  };
}

export const redirectLatestMacArm64 = redirectLatestMacForArch('arm64');
export const redirectLatestMacX64 = redirectLatestMacForArch('x64');

router.get('/windows/latest', redirectLatestWindows);
router.get('/macos/arm64/latest', redirectLatestMacArm64);
router.get('/macos/x64/latest', redirectLatestMacX64);
router.get('/', async (_req, res) => {
  try {
    const [windows, macArm64, macX64] = await Promise.all([
      findLatestWindowsArtifact(),
      findLatestMacArtifact('arm64'),
      findLatestMacArtifact('x64')
    ]);
    return res.json({
      windows: windows
        ? { ...windows, downloadUrl: '/api/downloads/windows/latest' }
        : null,
      macos: {
        arm64: macArm64 ? { ...macArm64, downloadUrl: '/api/downloads/macos/arm64/latest' } : null,
        x64: macX64 ? { ...macX64, downloadUrl: '/api/downloads/macos/x64/latest' } : null
      }
    });
  } catch (_error) {
    return res.status(500).json({ error: 'DOWNLOAD_LOOKUP_FAILED' });
  }
});

export default router;
