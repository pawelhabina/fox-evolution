const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');

function closeNavigation() {
  navToggle?.setAttribute('aria-expanded', 'false');
  nav?.classList.remove('is-open');
}

navToggle?.addEventListener('click', () => {
  const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!isOpen));
  nav?.classList.toggle('is-open', !isOpen);
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeNavigation));
document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });

function formatBytes(value) {
  const megabytes = Number(value) / 1024 / 1024;
  return Number.isFinite(megabytes) ? `${Math.round(megabytes)} MB` : null;
}

async function loadLatestVersion() {
  try {
    const response = await fetch('/api/downloads', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { windows, macos } = await response.json();
    const downloads = {
      windows,
      'macos-arm64': macos?.arm64,
      'macos-x64': macos?.x64
    };
    const fallbacks = {
      windows: 'Windows x64 · EXE',
      'macos-arm64': 'Apple Silicon · DMG',
      'macos-x64': 'macOS Intel · DMG'
    };
    const versions = [];

    Object.entries(downloads).forEach(([platform, artifact]) => {
      if (!artifact) return;
      const version = artifact.fileName.match(/Fox-Evolution-([\d.]+)-(?:x64|arm64)\.(?:exe|dmg)/i)?.[1] || 'najnowsza';
      const size = formatBytes(artifact.size);
      versions.push(version);
      document.querySelectorAll(`[data-download-link="${platform}"]`).forEach((link) => { link.href = artifact.downloadUrl; });
      document.querySelectorAll(`[data-download-meta="${platform}"]`).forEach((node) => {
        node.textContent = `${fallbacks[platform]} · ${version}${size ? ` · ${size}` : ''}`;
      });
      if (platform === 'windows') {
        document.querySelectorAll('[data-download-meta]:not([data-download-meta="windows"]):not([data-download-meta="macos-arm64"]):not([data-download-meta="macos-x64"])').forEach((node) => {
          node.textContent = `Wersja ${version}${size ? ` · ${size}` : ''}`;
        });
      }
    });

    const detail = document.querySelector('[data-version-detail]');
    if (detail) detail.textContent = versions.length ? `Fox Evolution ${versions[0]} · Windows + macOS` : 'Windows + macOS';
  } catch (_error) {
    const detail = document.querySelector('[data-version-detail]');
    if (detail) detail.textContent = 'Windows + macOS · instalatory bezpośrednie';
  }
}

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
} else {
  document.querySelectorAll('.reveal').forEach((node) => node.classList.add('is-visible'));
}

void loadLatestVersion();
