import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceDir = path.resolve(projectRoot, process.env.UPDATE_SOURCE_DIR || 'dist');
const targetDir = path.resolve(projectRoot, process.env.UPDATE_TARGET_DIR || 'server/updates');

const KEEP_PATTERNS = [
  /^latest.*\.yml$/i,
  /\.zip$/i,
  /\.zip\.blockmap$/i,
  /\.dmg$/i,
  /\.dmg\.blockmap$/i,
  /\.exe$/i,
  /\.exe\.blockmap$/i,
  /\.AppImage$/i,
  /\.deb$/i,
  /\.rpm$/i,
  /\.snap$/i
];

function shouldKeep(fileName) {
  return KEEP_PATTERNS.some((pattern) => pattern.test(fileName));
}

function stripYamlScalar(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

function decodeArtifactName(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function collectManifestArtifacts(content) {
  const artifacts = new Set();
  const lines = String(content || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('url:') && !line.startsWith('- url:') && !line.startsWith('path:')) {
      continue;
    }
    const [, rawValue = ''] = line.split(':', 2);
    const value = decodeArtifactName(stripYamlScalar(rawValue));
    if (!value || value.startsWith('http://') || value.startsWith('https://')) {
      continue;
    }
    artifacts.add(value);
  }
  return artifacts;
}

async function safeReaddir(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function clearTargetDirectory(dir) {
  const entries = await safeReaddir(dir);
  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
    })
  );
}

async function publishUpdates() {
  const entries = await safeReaddir(sourceDir);
  if (entries.length === 0) {
    throw new Error(`Source directory does not exist or is empty: ${sourceDir}`);
  }

  const files = entries.filter((entry) => entry.isFile() && shouldKeep(entry.name));
  if (files.length === 0) {
    throw new Error(`No update artifacts found in ${sourceDir}`);
  }

  const sourceFileNames = new Set(files.map((file) => file.name));
  const missingArtifacts = [];
  for (const file of files) {
    if (!/^latest.*\.yml$/i.test(file.name)) {
      continue;
    }
    const manifestPath = path.join(sourceDir, file.name);
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const artifacts = collectManifestArtifacts(manifestContent);
    for (const artifact of artifacts) {
      if (!sourceFileNames.has(artifact)) {
        missingArtifacts.push(`${file.name} -> ${artifact}`);
      }
    }
  }
  if (missingArtifacts.length > 0) {
    throw new Error(
      `Update manifest points to missing files:\n${missingArtifacts.map((item) => `- ${item}`).join('\n')}\n` +
        'Run a fresh build (`npm run build`) and ensure artifact names match latest*.yml.'
    );
  }

  await fs.mkdir(targetDir, { recursive: true });
  await clearTargetDirectory(targetDir);

  await Promise.all(
    files.map(async (file) => {
      const from = path.join(sourceDir, file.name);
      const to = path.join(targetDir, file.name);
      await fs.copyFile(from, to);
    })
  );

  console.log(`Published ${files.length} update files:`);
  for (const file of files) {
    console.log(`- ${file.name}`);
  }
  console.log(`Target: ${targetDir}`);
}

publishUpdates().catch((error) => {
  console.error('Update publish failed:', error.message || error);
  process.exit(1);
});
