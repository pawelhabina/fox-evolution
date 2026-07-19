import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { env } from '../config/env.js';

const router = express.Router();

function artifactFromManifest(content) {
  const candidates = [];
  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^(?:-\s*)?(?:path|url):\s*["']?([^"']+?)["']?\s*$/i);
    if (match?.[1]) {
      candidates.push(decodeURIComponent(match[1].trim()));
    }
  }
  return candidates.find((name) => name.toLowerCase().endsWith('.exe')) || null;
}

async function existingExe(fileName) {
  if (!fileName || path.basename(fileName) !== fileName || !fileName.toLowerCase().endsWith('.exe')) {
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
    const fromManifest = await existingExe(artifactFromManifest(manifest));
    if (fromManifest) {
      return fromManifest;
    }
  } catch (_error) {
    // Fall back to the newest Windows artifact when no valid manifest exists.
  }

  const entries = await fs.readdir(env.updatesDir, { withFileTypes: true });
  const artifacts = await Promise.all(
    entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.exe')).map((entry) => existingExe(entry.name))
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

router.get('/windows/latest', redirectLatestWindows);
router.get('/', async (_req, res) => {
  try {
    const windows = await findLatestWindowsArtifact();
    return res.json({
      windows: windows
        ? { ...windows, downloadUrl: '/api/downloads/windows/latest' }
        : null
    });
  } catch (_error) {
    return res.status(500).json({ error: 'DOWNLOAD_LOOKUP_FAILED' });
  }
});

export default router;
