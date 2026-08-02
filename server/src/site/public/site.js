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
    const { windows } = await response.json();
    if (!windows) return;
    const version = windows.fileName.match(/Fox-Evolution-([\d.]+)-x64\.exe/i)?.[1] || 'najnowsza';
    const size = formatBytes(windows.size);
    document.querySelectorAll('[data-download-link]').forEach((link) => { link.href = windows.downloadUrl || '/download/windows'; });
    document.querySelectorAll('[data-download-meta]').forEach((node) => { node.textContent = `Wersja ${version}${size ? ` · ${size}` : ''}`; });
    const detail = document.querySelector('[data-version-detail]');
    if (detail) detail.textContent = `Fox Evolution ${version} · Windows x64${size ? ` · ${size}` : ''}`;
  } catch (_error) {
    const detail = document.querySelector('[data-version-detail]');
    if (detail) detail.textContent = 'Windows x64 · bezpieczny instalator';
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
