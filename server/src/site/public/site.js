const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');
const header = document.querySelector('[data-header]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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

let scrollFrame = 0;
function updateScrollState() {
  scrollFrame = 0;
  const scrollableHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / scrollableHeight));
  document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));
  header?.classList.toggle('is-scrolled', window.scrollY > 24);

  const sections = [...document.querySelectorAll('main section[id]')];
  const activeSection = sections.reduce((active, section) => (
    section.getBoundingClientRect().top <= 150 ? section : active
  ), sections[0]);
  nav?.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.classList.toggle('is-active', link.getAttribute('href') === `#${activeSection?.id}`);
  });
}

window.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollState);
}, { passive: true });
window.addEventListener('resize', updateScrollState, { passive: true });
updateScrollState();

if (finePointer && !reducedMotion) {
  const cursorGlow = document.querySelector('[data-cursor-glow]');
  let pointerFrame = 0;
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  window.addEventListener('pointermove', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    document.body.classList.add('has-pointer');
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      cursorGlow?.style.setProperty('--cursor-x', `${pointerX}px`);
      cursorGlow?.style.setProperty('--cursor-y', `${pointerY}px`);
    });
  }, { passive: true });

  const heroVisual = document.querySelector('.hero-visual');
  heroVisual?.addEventListener('pointermove', (event) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    heroVisual.style.setProperty('--hero-tilt-x', `${(-y * 5).toFixed(2)}deg`);
    heroVisual.style.setProperty('--hero-tilt-y', `${(x * 7).toFixed(2)}deg`);
  });
  heroVisual?.addEventListener('pointerleave', () => {
    heroVisual.style.setProperty('--hero-tilt-x', '0deg');
    heroVisual.style.setProperty('--hero-tilt-y', '0deg');
  });

  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--tilt-x', `${((0.5 - y) * 5).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${((x - 0.5) * 6).toFixed(2)}deg`);
      card.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
      card.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    });
  });
}

const mergeStage = document.querySelector('[data-merge-stage]');
const mergeButtons = [...document.querySelectorAll('[data-merge-fox]')];
const mergeStatus = document.querySelector('[data-merge-status]');
const demoCoins = document.querySelector('[data-demo-coins]');
const coinCounter = demoCoins?.closest('.coin-counter');
const logSequence = document.querySelector('[data-log-sequence]');
const logSuccess = document.querySelector('[data-log-success]');
let mergeResetTimer;
let mergeAutoTimer;
let mergeDemoClaimed = false;

function setMergeFoxSelected(button, selected) {
  button.classList.toggle('is-selected', selected);
  button.setAttribute('aria-pressed', String(selected));
  const action = button.querySelector('.slot-action');
  if (action) action.textContent = selected ? 'GOTOWY' : 'WYBIERZ';
}

function resetMergeDemo(scheduleAutomaticDemo = true) {
  window.clearTimeout(mergeResetTimer);
  window.clearTimeout(mergeAutoTimer);
  mergeStage?.classList.remove('is-merging', 'is-complete');
  mergeButtons.forEach((button) => setMergeFoxSelected(button, false));
  if (demoCoins) demoCoins.textContent = '12.48M';
  if (mergeStatus) mergeStatus.textContent = 'Kliknij oba lisy, aby uruchomić merge.';
  if (logSequence) logSequence.textContent = '> merge_sequence: waiting';
  if (logSuccess) logSuccess.textContent = '> select_two_foxes_';
  if (scheduleAutomaticDemo && !mergeDemoClaimed && !reducedMotion) {
    mergeAutoTimer = window.setTimeout(startAutomaticMergeDemo, 1_100);
  }
}

function completeMergeDemo() {
  mergeStage?.classList.remove('is-merging');
  mergeStage?.classList.add('is-complete');
  if (mergeStatus) mergeStatus.textContent = 'Merge ukończony! Odblokowano TIER 10.';
  if (logSequence) logSequence.textContent = '> merge_sequence: complete';
  if (logSuccess) logSuccess.textContent = '> new_fox_unlocked ✓';
  if (demoCoins) demoCoins.textContent = '12.53M';
  coinCounter?.classList.add('is-gaining');
  window.setTimeout(() => coinCounter?.classList.remove('is-gaining'), reducedMotion ? 0 : 420);
  mergeResetTimer = window.setTimeout(() => resetMergeDemo(true), 3_600);
}

function beginMergeDemo() {
  mergeStage?.classList.add('is-merging');
  if (mergeStatus) mergeStatus.textContent = 'Łączenie lisów...';
  if (logSequence) logSequence.textContent = '> merge_sequence: running';
  window.setTimeout(completeMergeDemo, reducedMotion ? 40 : 560);
}

function startAutomaticMergeDemo() {
  if (mergeDemoClaimed || mergeButtons.length !== 2) return;
  setMergeFoxSelected(mergeButtons[0], true);
  if (mergeStatus) mergeStatus.textContent = 'Lis pierwszy gotowy...';
  mergeAutoTimer = window.setTimeout(() => {
    if (mergeDemoClaimed) return;
    setMergeFoxSelected(mergeButtons[1], true);
    beginMergeDemo();
  }, 650);
}

mergeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    mergeDemoClaimed = true;
    window.clearTimeout(mergeAutoTimer);
    if (mergeStage?.classList.contains('is-merging')) return;
    if (mergeStage?.classList.contains('is-complete')) resetMergeDemo(false);
    const selected = button.classList.toggle('is-selected');
    setMergeFoxSelected(button, selected);
    const selectionCount = mergeButtons.filter((item) => item.classList.contains('is-selected')).length;
    if (mergeStatus) mergeStatus.textContent = selectionCount === 1 ? 'Świetnie. Wybierz drugiego lisa.' : 'Kliknij oba lisy, aby uruchomić merge.';
    if (selectionCount < 2) return;
    beginMergeDemo();
  });
});

if (!reducedMotion) mergeAutoTimer = window.setTimeout(startAutomaticMergeDemo, 1_200);

const evolutionNodes = [...document.querySelectorAll('[data-evolution-node]')];
const evolutionLabel = document.querySelector('[data-evolution-label]');
const evolutionDescription = document.querySelector('[data-evolution-description]');
const trackProgress = document.querySelector('[data-track-progress]');

evolutionNodes.forEach((node) => {
  node.addEventListener('click', () => {
    evolutionNodes.forEach((item) => item.classList.toggle('is-active', item === node));
    const step = Number(node.dataset.step) || 0;
    const title = node.querySelector('strong')?.textContent || '';
    const stage = node.querySelector('span')?.textContent || '';
    if (evolutionLabel) evolutionLabel.textContent = `${title} // ${stage}`;
    if (evolutionDescription) evolutionDescription.textContent = node.dataset.description || '';
    trackProgress?.style.setProperty('--track-progress', String(step / Math.max(1, evolutionNodes.length - 1)));
  });
});

function animateCounter(node) {
  const target = Number(node.dataset.countTo);
  if (!Number.isFinite(target) || reducedMotion) return;
  const startedAt = performance.now();
  const duration = 760;
  function frame(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - ((1 - progress) ** 3);
    node.textContent = String(Math.round(target * eased));
    if (progress < 1) window.requestAnimationFrame(frame);
  }
  node.textContent = '0';
  window.requestAnimationFrame(frame);
}

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

if ('IntersectionObserver' in window && !reducedMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        entry.target.querySelectorAll?.('[data-count-to]').forEach(animateCounter);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
} else {
  document.querySelectorAll('.reveal').forEach((node) => node.classList.add('is-visible'));
}

void loadLatestVersion();
