const ACCESS_TOKEN_KEY = 'fox-api-access-token';
const REFRESH_TOKEN_KEY = 'fox-api-refresh-token';
const PRINCIPAL_KEY = 'fox-api-principal';
const DEVICE_ID_KEY = 'fox-api-device-id';
const OAUTH_FLOW_KEY = 'fox-api-oauth-flow';

function getApiBaseUrl() {
  return String(import.meta.env.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');
}

export function isRemoteApiEnabled() {
  return Boolean(getApiBaseUrl());
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalStorage(key) {
  if (!canUseStorage()) {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch (_error) {
    return null;
  }
}

function writeLocalStorage(key, value) {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch (_error) {
    // ignore
  }
}

function removeLocalStorage(key) {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
  } catch (_error) {
    // ignore
  }
}

function parseJson(value) {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function generateDeviceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `device-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export function getDeviceId() {
  const existing = readLocalStorage(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = generateDeviceId();
  writeLocalStorage(DEVICE_ID_KEY, next);
  return next;
}

export function getStoredSession() {
  return {
    accessToken: readLocalStorage(ACCESS_TOKEN_KEY),
    refreshToken: readLocalStorage(REFRESH_TOKEN_KEY),
    principal: parseJson(readLocalStorage(PRINCIPAL_KEY))
  };
}

function setStoredSession({ accessToken, refreshToken, principal }) {
  if (accessToken) {
    writeLocalStorage(ACCESS_TOKEN_KEY, accessToken);
  } else {
    removeLocalStorage(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    writeLocalStorage(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    removeLocalStorage(REFRESH_TOKEN_KEY);
  }

  if (principal) {
    writeLocalStorage(PRINCIPAL_KEY, JSON.stringify(principal));
  } else {
    removeLocalStorage(PRINCIPAL_KEY);
  }
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function createPkcePair() {
  const verifierBytes = new Uint8Array(48);
  crypto.getRandomValues(verifierBytes);
  const verifier = bytesToBase64Url(verifierBytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return {
    verifier,
    challenge: bytesToBase64Url(new Uint8Array(digest))
  };
}

function clearBrowserOAuthCallback() {
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    const nextUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, '', nextUrl);
  }
}

export async function completeOAuthLogin(callbackUrl) {
  if (typeof window === 'undefined') {
    return null;
  }

  const url = new URL(callbackUrl || window.location.href);
  const error = url.searchParams.get('error');
  if (error) {
    removeLocalStorage(OAUTH_FLOW_KEY);
    clearBrowserOAuthCallback();
    throw new Error(error);
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return null;
  }

  const flow = parseJson(readLocalStorage(OAUTH_FLOW_KEY));
  if (!flow?.verifier || Number(flow.createdAt) < Date.now() - 10 * 60 * 1000) {
    removeLocalStorage(OAUTH_FLOW_KEY);
    clearBrowserOAuthCallback();
    throw new Error('OAUTH_FLOW_EXPIRED');
  }

  try {
    const payload = await apiRequest('/api/auth/oauth/exchange', {
      method: 'POST',
      auth: false,
      retry: false,
      body: {
        code,
        codeVerifier: flow.verifier
      }
    });
    setStoredSession(payload);
    return payload.principal;
  } finally {
    removeLocalStorage(OAUTH_FLOW_KEY);
    clearBrowserOAuthCallback();
  }
}

export function consumeOAuthTokensFromUrl() {
  return completeOAuthLogin();
}

export function getCurrentPrincipal() {
  return getStoredSession().principal;
}

async function rawApiRequest(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    throw new Error('REMOTE_API_DISABLED');
  }

  const session = getStoredSession();
  const requestHeaders = {
    ...headers
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth && session.accessToken) {
    requestHeaders.Authorization = `Bearer ${session.accessToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    return await fetch(`${apiBase}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshAccessToken() {
  const { refreshToken } = getStoredSession();
  if (!refreshToken) {
    return false;
  }

  const response = await rawApiRequest('/api/auth/refresh', {
    method: 'POST',
    auth: false,
    body: { refreshToken }
  });

  if (!response.ok) {
    setStoredSession({ accessToken: null, refreshToken: null, principal: null });
    return false;
  }

  const payload = await response.json();
  setStoredSession(payload);
  return true;
}

export async function apiRequest(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const response = await rawApiRequest(path, { method, body, auth });

  if (response.status === 401 && retry && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest(path, { method, body, auth, retry: false });
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API_ERROR_${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function getDeviceLabel() {
  if (typeof navigator === 'undefined') {
    return 'desktop';
  }
  return `${navigator.platform || 'desktop'} / ${navigator.userAgent || 'unknown'}`.slice(0, 64);
}

export async function ensureGuestSession() {
  if (!isRemoteApiEnabled()) {
    return null;
  }

  const current = getStoredSession();
  if (current.accessToken && current.principal) {
    return current.principal;
  }

  const payload = await apiRequest('/api/auth/device', {
    method: 'POST',
    auth: false,
    retry: false,
    body: {
      deviceId: getDeviceId(),
      label: getDeviceLabel()
    }
  });
  setStoredSession(payload);
  return payload.principal;
}

export async function registerAccount({ email, password, displayName }) {
  const payload = await apiRequest('/api/auth/register', {
    method: 'POST',
    auth: false,
    retry: false,
    body: {
      email,
      password,
      displayName,
      deviceId: getDeviceId(),
      migrateDeviceSaves: true
    }
  });
  setStoredSession(payload);
  return payload.principal;
}

export async function loginAccount({ email, password }) {
  const payload = await apiRequest('/api/auth/login', {
    method: 'POST',
    auth: false,
    retry: false,
    body: {
      email,
      password,
      deviceId: getDeviceId(),
      migrateDeviceSaves: true
    }
  });
  setStoredSession(payload);
  return payload.principal;
}

export async function logoutAccount() {
  const session = getStoredSession();
  if (session.refreshToken) {
    try {
      await apiRequest('/api/auth/logout', {
        method: 'POST',
        auth: false,
        retry: false,
        body: {
          refreshToken: session.refreshToken
        }
      });
    } catch (_error) {
      // ignore network logout errors
    }
  }

  setStoredSession({ accessToken: null, refreshToken: null, principal: null });
  try {
    return await ensureGuestSession();
  } catch (_error) {
    return null;
  }
}

export async function fetchMe() {
  if (!isRemoteApiEnabled()) {
    return null;
  }
  try {
    const payload = await apiRequest('/api/auth/me');
    const session = getStoredSession();
    setStoredSession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      principal: payload.principal
    });
    return payload.principal;
  } catch (_error) {
    return null;
  }
}

export async function updateNickname(nickname) {
  const payload = await apiRequest('/api/auth/profile/nickname', {
    method: 'PATCH',
    body: { nickname }
  });
  const session = getStoredSession();
  setStoredSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    principal: payload.principal
  });
  return payload.principal;
}

export async function fetchFriends() {
  return apiRequest('/api/friends');
}

export async function searchFriends(query) {
  const params = new URLSearchParams({ q: String(query || '').trim() });
  return apiRequest(`/api/friends/search?${params}`);
}

export async function sendFriendRequest(targetUuid) {
  return apiRequest('/api/friends/requests', {
    method: 'POST',
    body: { targetUuid }
  });
}

export async function acceptFriendRequest(friendshipId) {
  return apiRequest(`/api/friends/requests/${encodeURIComponent(friendshipId)}/accept`, {
    method: 'POST'
  });
}

export async function removeFriendship(friendshipId) {
  return apiRequest(`/api/friends/${encodeURIComponent(friendshipId)}`, {
    method: 'DELETE'
  });
}

export async function startOAuthLogin(provider) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('REMOTE_API_DISABLED');
  }
  const normalized = String(provider || '').trim().toLowerCase();
  if (!['google', 'steam'].includes(normalized)) {
    throw new Error('OAUTH_PROVIDER_INVALID');
  }

  const { verifier, challenge } = await createPkcePair();
  writeLocalStorage(
    OAUTH_FLOW_KEY,
    JSON.stringify({
      provider: normalized,
      verifier,
      createdAt: Date.now()
    })
  );

  const bridge = window.foxEvolution;
  const redirect = bridge?.openOAuthUrl
    ? 'fox-evolution://oauth/callback'
    : `${window.location.origin}/oauth-success`;
  const params = new URLSearchParams({
    redirect,
    codeChallenge: challenge,
    deviceId: getDeviceId()
  });
  const startUrl = `${base}/api/auth/oauth/${normalized}/start?${params}`;

  if (bridge?.openOAuthUrl) {
    const opened = await bridge.openOAuthUrl(startUrl);
    if (!opened) {
      throw new Error('OAUTH_BROWSER_OPEN_FAILED');
    }
  } else {
    window.location.assign(startUrl);
  }
  return true;
}

export function onOAuthCallback(handler) {
  const bridge = typeof window === 'undefined' ? null : window.foxEvolution;
  if (!bridge?.onOAuthCallback) {
    return () => {};
  }
  return bridge.onOAuthCallback(handler);
}

export async function fetchLeaderboard(category, limit = 10) {
  const normalized = String(category || '').trim().toLowerCase();
  return apiRequest(`/api/leaderboard/${normalized}?limit=${Math.max(1, Math.min(50, Number(limit) || 10))}`, {
    auth: true
  });
}

export async function sendTelemetryEvents(events) {
  if (!isRemoteApiEnabled()) {
    return false;
  }

  const safeEvents = Array.isArray(events)
    ? events
        .filter((event) => event && typeof event.eventType === 'string')
        .slice(0, 100)
        .map((event) => ({
          eventType: event.eventType,
          payload: event.payload || {},
          ts: Number(event.ts) || Date.now()
        }))
    : [];

  if (safeEvents.length === 0) {
    return false;
  }

  try {
    await apiRequest('/api/telemetry/events', {
      method: 'POST',
      body: { events: safeEvents }
    });
    return true;
  } catch (_error) {
    return false;
  }
}
