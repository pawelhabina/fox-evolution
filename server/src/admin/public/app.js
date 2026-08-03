const adminState = {
  token: localStorage.getItem('fox_admin_token') || '',
  view: location.hash.replace('#', '') || 'overview',
  users: { page: 1, pageSize: 20, total: 0, items: [] },
  selectedUserId: null,
  selectedSave: null,
  conflictSave: null,
  flagTarget: null,
  passwordResetTarget: null,
  overview: null,
  telemetry: null,
  messages: [],
  audit: []
};

const byId = (id) => document.getElementById(id);
const loginView = byId('login-view');
const adminApp = byId('admin-app');
const loginForm = byId('login-form');
const loginError = byId('login-error');
const usersTable = byId('users-table');
const userDetails = byId('user-details');
const userDrawer = byId('user-drawer');
const drawerBackdrop = byId('drawer-backdrop');
const saveModal = byId('save-modal');
const saveForm = byId('save-form');
const saveMessage = byId('save-editor-msg');
const conflictBanner = byId('save-conflict');
const flagModal = byId('flag-modal');

const VIEW_COPY = {
  overview: ['// CENTRUM DOWODZENIA', 'Przegląd systemu'],
  users: ['// SPOŁECZNOŚĆ', 'Gracze i zapisy'],
  messages: ['// KOMUNIKACJA', 'Wiadomości dla graczy'],
  telemetry: ['// ANALITYKA', 'Telemetria gry'],
  audit: ['// BEZPIECZEŃSTWO', 'Dziennik zmian']
};

const ACTION_LABELS = {
  ADMIN_EDIT_SAVE: 'Edycja zapisu',
  ADMIN_FLAG_USER: 'Oznaczenie gracza',
  ADMIN_UNFLAG_USER: 'Usunięcie flagi',
  ADMIN_RESET_USER_PASSWORD: 'Reset hasła gracza',
  ADMIN_SEND_PLAYER_MESSAGE: 'Wiadomość do graczy'
};

class ApiError extends Error {
  constructor(status, data) {
    super(data?.error || `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(number) : '0';
}

function formatDate(value, withTime = true) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pl-PL', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { day: '2-digit', month: 'short' }).format(date);
}

function relativeTime(value) {
  if (!value) return 'nigdy';
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('pl', { numeric: 'auto' });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

function initials(name) {
  return String(name || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function setToken(token) {
  adminState.token = token;
  if (token) localStorage.setItem('fox_admin_token', token);
  else localStorage.removeItem('fox_admin_token');
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (adminState.token) headers.Authorization = `Bearer ${adminState.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && adminState.token) logout(false);
    throw new ApiError(response.status, data);
  }
  return data;
}

function toast(title, message = '', type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'is-error' : ''}`;
  node.innerHTML = `<i></i><div><strong>${escapeHtml(title)}</strong>${message ? `<span>${escapeHtml(message)}</span>` : ''}</div>`;
  byId('toast-region').appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function setBusy(button, busy, label = 'Przetwarzanie…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.innerHTML;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    if (button.dataset.originalLabel) button.innerHTML = button.dataset.originalLabel;
  }
}

async function copyText(value) {
  const text = String(value || '');
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

function renderAuthState() {
  const logged = Boolean(adminState.token);
  loginView.classList.toggle('hidden', logged);
  adminApp.classList.toggle('hidden', !logged);
}

function logout(showToast = true) {
  setToken('');
  closeDrawer();
  closeModal('save-modal');
  renderAuthState();
  if (showToast) toast('Wylogowano', 'Sesja administratora została zakończona.');
}

function switchView(view, updateHash = true) {
  if (!VIEW_COPY[view]) view = 'overview';
  adminState.view = view;
  document.querySelectorAll('[data-view-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.viewPanel === view));
  document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
  byId('view-kicker').textContent = VIEW_COPY[view][0];
  byId('view-title').textContent = VIEW_COPY[view][1];
  if (updateHash) history.replaceState(null, '', `#${view}`);
  document.querySelector('.sidebar').classList.remove('is-open');
  if (view === 'users' && adminState.users.items.length === 0) loadUsers();
  if (view === 'messages') loadMessages();
  if (view === 'telemetry') loadTelemetry();
  if (view === 'audit') loadAudit();
}

function metricCard(label, value, note, tone, icon) {
  return `<article class="metric-card ${tone}"><div class="metric-card-head"><span>${escapeHtml(label)}</span><i class="metric-icon">${icon}</i></div><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

async function loadOverview() {
  const [overview, telemetry, auditData] = await Promise.all([
    api('/api/admin/overview'),
    api('/api/admin/stats/telemetry?days=14'),
    api('/api/admin/audit?limit=6')
  ]);
  adminState.overview = overview;
  adminState.telemetry = telemetry;
  adminState.audit = auditData.logs || [];
  byId('flagged-nav-count').textContent = overview.usersFlagged;
  byId('overview-cards').innerHTML = [
    metricCard('Wszyscy gracze', formatNumber(overview.usersTotal), 'zarejestrowane konta', 'tone-amber', '♟'),
    metricCard('Aktywne zapisy', formatNumber(overview.savesTotal), 'zapisy w chmurze', 'tone-cyan', '▣'),
    metricCard('Oznaczeni gracze', formatNumber(overview.usersFlagged), `${overview.devicesFlagged} oznaczonych urządzeń`, 'tone-red', '!'),
    metricCard('Urządzenia', formatNumber(overview.devicesTotal), 'rozpoznane instalacje', 'tone-violet', '◇')
  ].join('');
  renderActivityChart(byId('overview-activity'), telemetry.dailyActivity || []);
  renderFlagReasons(overview.topFlagReasons || []);
  renderOverviewAudit(adminState.audit);
  markRefreshed();
}

function renderActivityChart(node, rows) {
  const ordered = [...rows].reverse();
  if (ordered.length === 0) {
    node.classList.remove('loading-block');
    node.innerHTML = '<div class="empty-state"><span>⌁</span><h3>Brak aktywności</h3><p>W wybranym okresie nie zapisano zdarzeń.</p></div>';
    return;
  }
  const max = Math.max(1, ...ordered.flatMap((row) => [row.activeUsers, row.activeDevices]));
  node.classList.remove('loading-block');
  node.innerHTML = ordered.map((row) => `
    <div class="activity-day" title="${escapeHtml(row.day)} · gracze ${row.activeUsers} · urządzenia ${row.activeDevices}">
      <i class="activity-bar" style="height:${Math.max(2, row.activeUsers / max * 100)}%"></i>
      <i class="activity-bar is-device" style="height:${Math.max(2, row.activeDevices / max * 100)}%"></i>
      <span>${escapeHtml(row.day.slice(5))}</span>
    </div>`).join('');
  node.insertAdjacentHTML('afterend', '<div class="chart-legend"><span><i></i> Gracze</span><span><i class="is-device"></i> Urządzenia</span></div>');
  const previousLegend = node.parentElement.querySelectorAll('.chart-legend');
  previousLegend.forEach((legend, index) => { if (index < previousLegend.length - 1) legend.remove(); });
}

function renderFlagReasons(rows) {
  const node = byId('flag-reasons');
  node.classList.remove('loading-block');
  if (rows.length === 0) {
    node.innerHTML = '<div class="empty-state"><span>✓</span><h3>Czysto</h3><p>Brak zarejestrowanych flag.</p></div>';
    return;
  }
  const max = Math.max(...rows.map((row) => row.count), 1);
  node.innerHTML = rows.map((row) => `<div class="reason-item"><div class="reason-line"><span title="${escapeHtml(row.reason)}">${escapeHtml(row.reason)}</span><strong>${row.count}</strong></div><div class="reason-track"><i style="width:${row.count / max * 100}%"></i></div></div>`).join('');
}

function renderOverviewAudit(rows) {
  const node = byId('overview-audit');
  node.classList.remove('loading-block');
  node.innerHTML = rows.length ? rows.map((log) => `<div class="timeline-item"><i class="timeline-dot"></i><div><p><strong>${escapeHtml(ACTION_LABELS[log.action] || log.action)}</strong> · ${escapeHtml(log.admin?.displayName || log.admin?.email || 'Administrator')}</p><small>${escapeHtml(log.targetType)} · ${relativeTime(log.createdAt)}</small></div></div>`).join('') : '<div class="empty-state"><p>Brak wpisów audytu.</p></div>';
}

async function loadUsers() {
  const search = byId('search').value.trim();
  const filter = byId('user-filter').value;
  const data = await api(`/api/admin/users?search=${encodeURIComponent(search)}&filter=${encodeURIComponent(filter)}&page=${adminState.users.page}&pageSize=${adminState.users.pageSize}`);
  adminState.users = data;
  renderUsers();
}

function renderUsers() {
  const { items, page, pageSize, total } = adminState.users;
  usersTable.innerHTML = items.map((user) => `
    <tr>
      <td><div class="user-cell"><span class="user-avatar">${escapeHtml(initials(user.displayName))}</span><div><strong>${escapeHtml(user.displayName)}</strong><small>${escapeHtml(user.email || 'konto bez e-maila')}</small></div></div></td>
      <td>${user.isFlagged ? '<span class="badge badge--flag">Oznaczony</span>' : user.role === 'ADMIN' ? '<span class="badge badge--admin">Admin</span>' : '<span class="badge badge--ok">Aktywny</span>'}</td>
      <td>${formatNumber(user.savesCount)}</td><td>${formatNumber(user.linkedDevicesCount)}</td><td>${escapeHtml(relativeTime(user.lastLoginAt))}</td>
      <td><button class="row-button" type="button" data-user-open="${escapeHtml(user.id)}">Otwórz profil →</button></td>
    </tr>`).join('');
  byId('users-empty').classList.toggle('hidden', items.length > 0);
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(total, page * pageSize);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  byId('users-range').textContent = `${start}–${end} z ${total} graczy`;
  byId('page-label').textContent = `${page} / ${pages}`;
  byId('prev-page').disabled = page <= 1;
  byId('next-page').disabled = page >= pages;
}

async function openUser(userId) {
  adminState.selectedUserId = userId;
  drawerBackdrop.classList.remove('hidden');
  userDrawer.classList.add('is-open');
  userDrawer.setAttribute('aria-hidden', 'false');
  userDetails.innerHTML = '<div class="loading-block"></div>';
  const user = await api(`/api/admin/users/${userId}`);
  renderUserDetails(user);
}

function closeDrawer() {
  userDrawer.classList.remove('is-open');
  userDrawer.setAttribute('aria-hidden', 'true');
  drawerBackdrop.classList.add('hidden');
}

function renderUserDetails(user) {
  const status = user.isFlagged ? '<span class="badge badge--flag">Oznaczony</span>' : '<span class="badge badge--ok">Aktywny</span>';
  const saves = user.saves?.length ? user.saves.map((save) => `
    <article class="save-card"><div class="save-card-head"><div><h5>${escapeHtml(save.name)}</h5><p>${escapeHtml(save.slotId)} · ${relativeTime(save.updatedAt)}</p></div><button class="row-button" type="button" data-save-open="${escapeHtml(save.id)}">Edytuj</button></div><div class="save-stats"><div><span>MONETY</span><strong>${escapeHtml(formatNumber(save.summary?.coins))}</strong></div><div><span>DIAMENTY</span><strong>${escapeHtml(formatNumber(save.summary?.gems))}</strong></div><div><span>TOP TIER</span><strong>${save.summary?.topTier || 1}</strong></div></div></article>`).join('') : '<div class="empty-state"><p>Ten gracz nie ma zapisów w chmurze.</p></div>';
  const devices = user.devices?.length ? user.devices.map((device) => `<article class="device-card"><div><strong>${escapeHtml(device.label || 'Nieznane urządzenie')}</strong><small>Połączono ${formatDate(device.linkedAt)}</small></div>${device.isFlagged ? '<span class="badge badge--flag">Flaga</span>' : '<span class="badge badge--ok">OK</span>'}</article>`).join('') : '<div class="empty-state"><p>Brak połączonych urządzeń.</p></div>';
  const flags = user.flags?.length ? user.flags.map((flag) => `<article class="flag-card"><p>${escapeHtml(flag.reason)}</p><small>${escapeHtml(flag.source)} · wynik ${flag.score} · ${formatDate(flag.createdAt)}</small></article>`).join('') : '<div class="empty-state"><p>Brak historii flag.</p></div>';
  const internalId = user.id || '';
  const publicId = user.publicId || '';
  userDetails.innerHTML = `
    <section class="profile-hero"><span class="profile-avatar">${escapeHtml(initials(user.displayName))}</span><div><h3>${escapeHtml(user.displayName)}</h3><p>${escapeHtml(user.email || 'konto bez e-maila')}</p></div>${status}</section>
    <div class="profile-meta"><div class="meta-card"><span>Rola</span><strong>${escapeHtml(user.role)}</strong></div><div class="meta-card"><span>Ostatnie logowanie</span><strong>${escapeHtml(relativeTime(user.lastLoginAt))}</strong></div><div class="meta-card"><span>Utworzono</span><strong>${formatDate(user.createdAt, false)}</strong></div><div class="meta-card"><span>Logowanie hasłem</span><strong>${user.email ? 'Dostępne' : 'Brak adresu e-mail'}</strong></div><div class="meta-card identifier-card"><span>Pełne ID konta</span><div class="identifier-value"><code>${escapeHtml(internalId)}</code><button class="row-button" type="button" data-copy-value="${escapeHtml(internalId)}">Kopiuj</button></div></div><div class="meta-card identifier-card"><span>Publiczne UUID</span><div class="identifier-value"><code>${escapeHtml(publicId || 'Brak UUID')}</code>${publicId ? `<button class="row-button" type="button" data-copy-value="${escapeHtml(publicId)}">Kopiuj</button>` : ''}</div></div></div>
    <div class="profile-actions">${user.isFlagged ? `<button class="button button--secondary user-flag-action" type="button" data-unflag-user="${escapeHtml(user.id)}">Usuń oznaczenie</button>` : `<button class="button button--danger user-flag-action" type="button" data-flag-user="${escapeHtml(user.id)}" data-name="${escapeHtml(user.displayName)}">Oznacz gracza</button>`}${user.email ? `<button class="button button--secondary" type="button" data-reset-password="${escapeHtml(user.id)}" data-name="${escapeHtml(user.displayName)}">Wygeneruj nowe hasło</button>` : ''}<button class="button button--secondary" type="button" data-message-user="${escapeHtml(user.id)}" data-name="${escapeHtml(user.displayName)}">Wyślij wiadomość</button></div>
    <section class="drawer-section"><div class="drawer-section-head"><h4>Zapisy gry</h4><span>${user.saves?.length || 0}</span></div><div class="save-list">${saves}</div></section>
    <section class="drawer-section"><div class="drawer-section-head"><h4>Urządzenia</h4><span>${user.devices?.length || 0}</span></div><div class="device-list">${devices}</div></section>
    <section class="drawer-section"><div class="drawer-section-head"><h4>Historia flag</h4><span>${user.flags?.length || 0}</span></div><div class="flag-list">${flags}</div></section>`;
}

function openPasswordResetModal(userId, displayName) {
  adminState.passwordResetTarget = { userId, displayName };
  byId('password-reset-user').textContent = `Resetujesz hasło konta: ${displayName}`;
  byId('password-reset-confirm').classList.remove('hidden');
  byId('password-reset-result').classList.add('hidden');
  byId('generated-password').textContent = '';
  byId('password-reset-message').textContent = '';
  byId('password-reset-submit').classList.remove('hidden');
  byId('password-reset-modal').classList.remove('hidden');
}

async function submitPasswordReset() {
  const target = adminState.passwordResetTarget;
  if (!target) return;
  const button = byId('password-reset-submit');
  const message = byId('password-reset-message');
  setBusy(button, true, 'Generowanie…');
  message.textContent = '';
  try {
    const result = await api(`/api/admin/users/${encodeURIComponent(target.userId)}/reset-password`, { method: 'POST' });
    byId('generated-password').textContent = result.temporaryPassword;
    byId('password-reset-confirm').classList.add('hidden');
    byId('password-reset-result').classList.remove('hidden');
    button.classList.add('hidden');
    toast('Hasło zostało zresetowane', `Unieważnione sesje: ${result.revokedSessions || 0}`);
    loadAudit().catch(() => {});
  } catch (error) {
    const messages = {
      CANNOT_RESET_OWN_PASSWORD: 'Nie można resetować własnego hasła z aktywnej sesji panelu.',
      PASSWORD_LOGIN_UNAVAILABLE: 'To konto nie obsługuje logowania hasłem.'
    };
    message.textContent = messages[error.message] || error.message || 'Nie udało się zresetować hasła.';
  } finally {
    setBusy(button, false);
  }
}

function updateMessageAudience() {
  const individual = byId('message-audience').value === 'USER';
  byId('message-user-field').classList.toggle('hidden', !individual);
  byId('message-user-id').required = individual;
}

function composeMessageForUser(userId, displayName) {
  switchView('messages');
  byId('message-audience').value = 'USER';
  byId('message-user-id').value = userId;
  byId('message-form-info').classList.remove('is-error');
  byId('message-form-info').textContent = `Odbiorca: ${displayName}`;
  updateMessageAudience();
  closeDrawer();
  setTimeout(() => byId('message-title').focus(), 0);
}

async function loadMessages() {
  const data = await api('/api/admin/messages?limit=50');
  adminState.messages = data.messages || [];
  const node = byId('messages-history');
  node.classList.remove('loading-block');
  node.innerHTML = adminState.messages.length ? adminState.messages.map((message) => {
    const target = message.audience === 'GLOBAL'
      ? 'Wszystkie konta graczy'
      : message.recipient?.displayName || message.recipient?.email || message.recipient?.id || 'Wybrane konto';
    return `<article class="message-history-card"><div class="message-history-head"><h3>${escapeHtml(message.title)}</h3><small>${escapeHtml(formatDate(message.createdAt))}</small></div><p>${escapeHtml(message.body)}</p><div class="message-delivery-meta"><span>${escapeHtml(target)}</span><span>Odczytano: ${formatNumber(message.readCount)}/${formatNumber(message.deliveryCount)}</span><span>Autor: ${escapeHtml(message.createdByAdmin?.displayName || message.createdByAdmin?.email || 'Administrator')}</span></div></article>`;
  }).join('') : '<div class="empty-state"><span>✉</span><h3>Brak wiadomości</h3><p>Wyślij pierwszą wiadomość do graczy.</p></div>';
}

async function submitMessage() {
  const audience = byId('message-audience').value;
  const payload = {
    audience,
    title: byId('message-title').value.trim(),
    body: byId('message-body').value.trim()
  };
  if (audience === 'USER') payload.userId = byId('message-user-id').value.trim();
  const button = byId('message-submit');
  const info = byId('message-form-info');
  setBusy(button, true, 'Wysyłanie…');
  info.classList.remove('is-error');
  try {
    const result = await api('/api/admin/messages', { method: 'POST', body: JSON.stringify(payload) });
    byId('message-title').value = '';
    byId('message-body').value = '';
    info.textContent = `Dostarczono do ${result.deliveryCount || 0} kont.`;
    toast('Wiadomość wysłana', `Liczba dostarczeń: ${result.deliveryCount || 0}`);
    await loadMessages();
  } catch (error) {
    info.classList.add('is-error');
    info.textContent = error.message === 'USER_NOT_FOUND' ? 'Nie znaleziono konta o podanym ID.' : error.message || 'Nie udało się wysłać wiadomości.';
  } finally {
    setBusy(button, false);
  }
}

async function setUserFlag(userId, flagged, reason = '') {
  await api(`/api/admin/users/${userId}/flag`, { method: 'PATCH', body: JSON.stringify({ flagged, reason }) });
  toast(flagged ? 'Gracz oznaczony' : 'Oznaczenie usunięte', 'Ranking został przeliczony.');
  await Promise.all([loadOverview(), loadUsers(), openUser(userId)]);
}

function openFlagModal(userId, displayName) {
  adminState.flagTarget = { userId, displayName };
  byId('flag-user-label').textContent = `Oznaczasz konto: ${displayName}`;
  byId('flag-reason').value = '';
  flagModal.classList.remove('hidden');
  setTimeout(() => byId('flag-reason').focus(), 0);
}

function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split('.');
  let cursor = object;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) cursor[key] = value;
    else cursor = cursor[key] ||= {};
  });
}

function renderFoxSummary(foxes = []) {
  const counts = new Map();
  foxes.forEach((fox) => counts.set(Number(fox.tier) || 1, (counts.get(Number(fox.tier) || 1) || 0) + 1));
  const tiers = [...counts.keys()].sort((a, b) => a - b);
  const max = Math.max(1, ...counts.values());
  byId('fox-summary').innerHTML = `<div class="fox-summary-head"><span>${foxes.length} lisów na planszy</span><strong>Top tier: ${tiers.at(-1) || 1}</strong></div>${tiers.length ? `<div class="tier-distribution">${tiers.map((tier) => `<i class="tier-column" title="Tier ${tier}: ${counts.get(tier)}" style="height:${Math.max(8, counts.get(tier) / max * 100)}%"><span>${tier}</span></i>`).join('')}</div>` : '<div class="empty-state"><p>Plansza jest pusta.</p></div>'}`;
}

async function openSave(saveId, suppliedSave = null) {
  const save = suppliedSave || await api(`/api/admin/saves/${saveId}`);
  adminState.selectedSave = save;
  adminState.conflictSave = null;
  byId('save-modal-title').textContent = save.name || 'Edycja zapisu';
  byId('save-owner').textContent = `${save.owner?.displayName || save.owner?.label || 'Nieznany właściciel'} · ${save.slotId}`;
  byId('save-name').value = save.name || '';
  saveForm.querySelectorAll('[data-save-path]').forEach((input) => {
    const value = getPath(save.state, input.dataset.savePath);
    input.value = value ?? '';
  });
  byId('save-json-preview').textContent = JSON.stringify(save.state || {}, null, 2);
  byId('save-version').textContent = `Wersja z ${formatDate(save.updatedAt)}`;
  renderFoxSummary(save.state?.foxes || []);
  conflictBanner.classList.add('hidden');
  saveMessage.textContent = '';
  saveMessage.classList.remove('is-error');
  saveModal.classList.remove('hidden');
}

function parseFieldValue(input, original) {
  const raw = input.value.trim();
  if (raw === '') return original;
  const number = Number(raw.replace(',', '.'));
  if (!Number.isFinite(number)) throw new Error(`Niepoprawna liczba w polu „${input.closest('label')?.querySelector('span')?.textContent || input.dataset.savePath}”`);
  return number;
}

function buildSaveChanges() {
  const original = adminState.selectedSave;
  const statePatch = {};
  saveForm.querySelectorAll('[data-save-path]').forEach((input) => {
    const path = input.dataset.savePath;
    const previous = getPath(original.state, path);
    const next = parseFieldValue(input, previous);
    if (!Object.is(Number(previous), Number(next))) setPath(statePatch, path, next);
  });
  const payload = { expectedUpdatedAt: original.updatedAt };
  const name = byId('save-name').value.trim();
  if (name !== original.name) payload.name = name;
  if (Object.keys(statePatch).length > 0) payload.statePatch = statePatch;
  return payload;
}

async function submitSave() {
  const payload = buildSaveChanges();
  if (payload.name === undefined && payload.statePatch === undefined) {
    saveMessage.textContent = 'Nie ma żadnych zmian do zapisania.';
    return;
  }
  const button = byId('save-submit');
  setBusy(button, true, 'Zapisywanie…');
  saveMessage.textContent = '';
  try {
    const result = await api(`/api/admin/saves/${adminState.selectedSave.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    adminState.selectedSave = result.save;
    await openSave(result.save.id, result.save);
    toast('Zapis zaktualizowany', 'Zmieniono wyłącznie pola widoczne w formularzu.');
    if (adminState.selectedUserId) await openUser(adminState.selectedUserId);
    await loadOverview();
  } catch (error) {
    if (error.status === 409 && error.data?.current) {
      adminState.conflictSave = error.data.current;
      conflictBanner.classList.remove('hidden');
      saveMessage.textContent = 'Wykryto nowszą wersję zapisu. Nic nie zostało nadpisane.';
      saveMessage.classList.add('is-error');
    } else {
      saveMessage.textContent = error.message || 'Nie udało się zapisać zmian.';
      saveMessage.classList.add('is-error');
    }
  } finally {
    setBusy(button, false);
  }
}

function closeModal(id) {
  if (id === 'password-reset-modal') {
    byId('generated-password').textContent = '';
    byId('password-reset-message').textContent = '';
    adminState.passwordResetTarget = null;
  }
  byId(id)?.classList.add('hidden');
}

async function loadTelemetry() {
  const days = Number(byId('telemetry-days').value || 30);
  const data = await api(`/api/admin/stats/telemetry?days=${days}`);
  adminState.telemetry = data;
  const latest = data.dailyActivity?.[0] || { activeUsers: 0, activeDevices: 0 };
  byId('telemetry-summary').innerHTML = [
    metricCard('Wszystkie zdarzenia', formatNumber(data.totalEvents), `od ${formatDate(data.since, false)}`, 'tone-amber', '≡'),
    metricCard('Aktywni gracze', formatNumber(latest.activeUsers), 'ostatni dzień z danymi', 'tone-cyan', '♟'),
    metricCard('Aktywne urządzenia', formatNumber(latest.activeDevices), 'ostatni dzień z danymi', 'tone-violet', '◇')
  ].join('');
  renderActivityChart(byId('telemetry-chart'), data.dailyActivity || []);
  const rows = data.byType || [];
  const max = Math.max(1, ...rows.map((row) => row.count));
  byId('event-types').innerHTML = rows.length ? rows.map((row) => `<div class="event-item"><div class="event-line"><span>${escapeHtml(row.eventType)}</span><strong>${formatNumber(row.count)}</strong></div><div class="event-track"><i style="width:${row.count / max * 100}%"></i></div></div>`).join('') : '<div class="empty-state"><p>Brak zdarzeń.</p></div>';
  markRefreshed();
}

async function loadAudit() {
  const limit = Number(byId('audit-limit').value || 30);
  const data = await api(`/api/admin/audit?limit=${limit}`);
  adminState.audit = data.logs || [];
  byId('audit-table').innerHTML = adminState.audit.map((log) => `<tr><td>${escapeHtml(formatDate(log.createdAt))}</td><td>${escapeHtml(log.admin?.displayName || log.admin?.email || 'Administrator')}</td><td><span class="badge">${escapeHtml(ACTION_LABELS[log.action] || log.action)}</span></td><td>${escapeHtml(log.targetType)}<br><small>${escapeHtml(log.targetId.slice(0,12))}…</small></td><td class="details-cell">${escapeHtml(summarizeDetails(log.details))}</td></tr>`).join('');
  markRefreshed();
}

function summarizeDetails(details) {
  if (!details) return '—';
  if (Array.isArray(details.changedStatePaths)) return details.changedStatePaths.length ? `Pola: ${details.changedStatePaths.join(', ')}` : details.changedName ? 'Zmieniono nazwę' : '—';
  if (details.reason) return `Powód: ${details.reason}`;
  return Object.entries(details).map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
}

function markRefreshed() {
  byId('last-refresh').textContent = `Odświeżono ${new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit' }).format(new Date())}`;
}

async function refreshCurrentView() {
  const button = byId('refresh-btn');
  setBusy(button, true, 'Odświeżanie…');
  try {
    if (adminState.view === 'overview') await loadOverview();
    if (adminState.view === 'users') await loadUsers();
    if (adminState.view === 'messages') await loadMessages();
    if (adminState.view === 'telemetry') await loadTelemetry();
    if (adminState.view === 'audit') await loadAudit();
    toast('Dane odświeżone');
  } catch (error) {
    toast('Błąd odświeżania', error.message, 'error');
  } finally {
    setBusy(button, false);
  }
}

async function bootDashboard() {
  renderAuthState();
  if (!adminState.token) return;
  try {
    switchView(adminState.view, false);
    await Promise.all([loadOverview(), loadUsers()]);
  } catch (error) {
    if (error.status !== 401) toast('Nie udało się wczytać panelu', error.message, 'error');
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  const button = loginForm.querySelector('button[type="submit"]');
  setBusy(button, true, 'Logowanie…');
  try {
    const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: byId('email').value.trim(), password: byId('password').value }) });
    if (result.principal?.role !== 'ADMIN') throw new Error('To konto nie ma uprawnień administratora.');
    setToken(result.accessToken);
    await bootDashboard();
  } catch (error) {
    loginError.textContent = error.message === 'INVALID_CREDENTIALS' ? 'Niepoprawny e-mail lub hasło.' : error.message || 'Nie udało się zalogować.';
  } finally { setBusy(button, false); }
});

document.querySelector('.side-nav').addEventListener('click', (event) => { const button = event.target.closest('[data-view]'); if (button) switchView(button.dataset.view); });
document.addEventListener('click', (event) => { const button = event.target.closest('[data-go-view]'); if (button) switchView(button.dataset.goView); });
byId('logout-btn').addEventListener('click', () => logout());
byId('refresh-btn').addEventListener('click', refreshCurrentView);
byId('menu-toggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('is-open'));
byId('search-btn').addEventListener('click', () => { adminState.users.page = 1; loadUsers(); });
byId('search').addEventListener('keydown', (event) => { if (event.key === 'Enter') { adminState.users.page = 1; loadUsers(); } });
byId('user-filter').addEventListener('change', () => { adminState.users.page = 1; loadUsers(); });
byId('prev-page').addEventListener('click', () => { adminState.users.page -= 1; loadUsers(); });
byId('next-page').addEventListener('click', () => { adminState.users.page += 1; loadUsers(); });
byId('telemetry-days').addEventListener('change', loadTelemetry);
byId('audit-limit').addEventListener('change', loadAudit);
byId('message-audience').addEventListener('change', () => {
  byId('message-form-info').textContent = '';
  updateMessageAudience();
});
byId('message-form').addEventListener('submit', (event) => { event.preventDefault(); submitMessage(); });
byId('messages-refresh').addEventListener('click', loadMessages);
byId('close-drawer').addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
usersTable.addEventListener('click', (event) => { const button = event.target.closest('[data-user-open]'); if (button) openUser(button.dataset.userOpen).catch((error) => toast('Nie udało się otworzyć profilu', error.message, 'error')); });
userDetails.addEventListener('click', async (event) => {
  const saveButton = event.target.closest('[data-save-open]');
  const flagButton = event.target.closest('[data-flag-user]');
  const unflagButton = event.target.closest('[data-unflag-user]');
  const resetPasswordButton = event.target.closest('[data-reset-password]');
  const copyButton = event.target.closest('[data-copy-value]');
  const messageButton = event.target.closest('[data-message-user]');
  if (saveButton) await openSave(saveButton.dataset.saveOpen);
  if (flagButton) openFlagModal(flagButton.dataset.flagUser, flagButton.dataset.name);
  if (unflagButton) await setUserFlag(unflagButton.dataset.unflagUser, false);
  if (resetPasswordButton) openPasswordResetModal(resetPasswordButton.dataset.resetPassword, resetPasswordButton.dataset.name);
  if (copyButton) {
    const copied = await copyText(copyButton.dataset.copyValue);
    toast(copied ? 'Skopiowano identyfikator' : 'Nie udało się skopiować', '', copied ? 'success' : 'error');
  }
  if (messageButton) composeMessageForUser(messageButton.dataset.messageUser, messageButton.dataset.name);
});
document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
saveForm.addEventListener('submit', (event) => { event.preventDefault(); submitSave(); });
byId('reload-conflict').addEventListener('click', () => { if (adminState.conflictSave) openSave(adminState.conflictSave.id, adminState.conflictSave); });
byId('flag-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const reason = byId('flag-reason').value.trim();
  if (!reason) { toast('Podaj powód oznaczenia', '', 'error'); return; }
  await setUserFlag(adminState.flagTarget.userId, true, reason);
  closeModal('flag-modal');
});
byId('password-reset-form').addEventListener('submit', (event) => { event.preventDefault(); submitPasswordReset(); });
byId('copy-generated-password').addEventListener('click', async () => {
  const copied = await copyText(byId('generated-password').textContent);
  toast(copied ? 'Hasło skopiowane' : 'Nie udało się skopiować', '', copied ? 'success' : 'error');
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeDrawer(); closeModal('save-modal'); closeModal('flag-modal'); closeModal('password-reset-modal'); } });
window.addEventListener('hashchange', () => switchView(location.hash.replace('#',''), false));

bootDashboard();
