const state = {
  token: localStorage.getItem('fox_admin_token') || '',
  selectedUserId: null
};

const loginCard = document.getElementById('login-card');
const dashboardCard = document.getElementById('dashboard-card');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const overviewNode = document.getElementById('overview');
const usersNode = document.getElementById('users');
const userDetailsNode = document.getElementById('user-details');
const auditLogsNode = document.getElementById('audit-logs');
const searchNode = document.getElementById('search');
const saveIdNode = document.getElementById('save-id');
const saveNameNode = document.getElementById('save-name');
const saveStateNode = document.getElementById('save-state');
const saveEditorMsgNode = document.getElementById('save-editor-msg');
const telemetryStatsNode = document.getElementById('telemetry-stats');

function setToken(token) {
  state.token = token;
  if (token) {
    localStorage.setItem('fox_admin_token', token);
  } else {
    localStorage.removeItem('fox_admin_token');
  }
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return null;
  }
  return res.json();
}

function renderAuthState() {
  const isLogged = Boolean(state.token);
  loginCard.classList.toggle('hidden', isLogged);
  dashboardCard.classList.toggle('hidden', !isLogged);
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

async function loadOverview() {
  const data = await api('/api/admin/overview');
  overviewNode.innerHTML = `
    <div class="panel">
      <strong>Users:</strong> ${data.usersTotal} (flagged: ${data.usersFlagged})\n
      <strong>Devices:</strong> ${data.devicesTotal} (flagged: ${data.devicesFlagged})\n
      <strong>Saves:</strong> ${data.savesTotal}\n
      <strong>Top auto-flag reasons:</strong>\n${(data.topFlagReasons || []).map((r) => `- ${r.reason}: ${r.count}`).join('\n') || '- none'}
    </div>
  `;
}

async function loadUsers() {
  const search = searchNode.value.trim();
  const data = await api(`/api/admin/users?search=${encodeURIComponent(search)}&page=1&pageSize=20`);
  usersNode.innerHTML = '';

  for (const user of data.items) {
    const row = document.createElement('div');
    row.className = 'user-row';
    row.innerHTML = `
      <div><strong>${user.displayName}</strong> (${user.email || 'no-email'})</div>
      <div>role=${user.role} | flagged=${user.isFlagged} | saves=${user.savesCount}</div>
      <div class="user-actions">
        <button data-action="open" data-id="${user.id}">Open</button>
        <button data-action="flag" data-id="${user.id}" data-flag="${user.isFlagged ? '0' : '1'}">${user.isFlagged ? 'Unflag' : 'Flag'}</button>
      </div>
    `;
    usersNode.appendChild(row);
  }
}

async function loadUserDetails(userId) {
  state.selectedUserId = userId;
  const user = await api(`/api/admin/users/${userId}`);
  userDetailsNode.textContent = pretty(user);
}

async function setUserFlag(userId, flagged) {
  const reason = flagged ? prompt('Reason for flag:', 'Manual admin flag') || 'Manual admin flag' : '';
  await api(`/api/admin/users/${userId}/flag`, {
    method: 'PATCH',
    body: JSON.stringify({ flagged, reason })
  });
  await Promise.all([loadOverview(), loadUsers()]);
  if (state.selectedUserId === userId) {
    await loadUserDetails(userId);
  }
}

async function loadAuditLogs() {
  const data = await api('/api/admin/audit?limit=30');
  auditLogsNode.textContent = pretty(data.logs);
}

async function loadTelemetryStats() {
  const data = await api('/api/admin/stats/telemetry?days=30');
  telemetryStatsNode.textContent = pretty(data);
}

async function loadSaveEditor(saveId) {
  saveEditorMsgNode.textContent = '';
  const save = await api(`/api/admin/saves/${saveId}`);
  saveIdNode.value = save.id;
  saveNameNode.value = save.name || '';
  saveStateNode.value = pretty(save.state || {});
}

async function submitSaveEditor() {
  const saveId = saveIdNode.value.trim();
  if (!saveId) {
    saveEditorMsgNode.textContent = 'Wpisz save ID';
    return;
  }

  let state;
  try {
    state = JSON.parse(saveStateNode.value || '{}');
  } catch (_error) {
    saveEditorMsgNode.textContent = 'Niepoprawny JSON stanu save';
    return;
  }

  saveEditorMsgNode.textContent = '';
  await api(`/api/admin/saves/${saveId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: saveNameNode.value.trim() || undefined,
      state
    })
  });
  saveEditorMsgNode.textContent = 'Save updated';
}

async function bootDashboard() {
  renderAuthState();
  if (!state.token) {
    return;
  }

  try {
    await Promise.all([loadOverview(), loadUsers(), loadAuditLogs(), loadTelemetryStats()]);
  } catch (_error) {
    setToken('');
    renderAuthState();
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';

  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(result.accessToken);
    await bootDashboard();
  } catch (error) {
    loginError.textContent = 'Login failed';
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  setToken('');
  renderAuthState();
});

document.getElementById('search-btn').addEventListener('click', async () => {
  await loadUsers();
});

document.getElementById('load-save-btn').addEventListener('click', async () => {
  try {
    await loadSaveEditor(saveIdNode.value.trim());
  } catch (_error) {
    saveEditorMsgNode.textContent = 'Nie udało się wczytać save';
  }
});

document.getElementById('save-save-btn').addEventListener('click', async () => {
  try {
    await submitSaveEditor();
  } catch (_error) {
    saveEditorMsgNode.textContent = 'Nie udało się zapisać zmian';
  }
});

usersNode.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) {
    return;
  }
  const action = button.dataset.action;
  const userId = button.dataset.id;

  if (action === 'open') {
    await loadUserDetails(userId);
    return;
  }

  if (action === 'flag') {
    await setUserFlag(userId, button.dataset.flag === '1');
  }
});

bootDashboard();
