/* ============================================================
   Shared utilities — particles, storage, live profile board,
   coin animation helpers, cleanup, and theme management
   ============================================================ */

const STORAGE_KEYS = {
  theme: 'pennygame_theme',
  profile: 'pennygame_profile_v2',
  leaderboard: 'pennygame_leaderboard_v2',
  activity: 'pennygame_activity_v2',
};

const LIVE_CHANNEL_NAME = 'pennygame_live_sync_v1';
const LIVE_CLEANUP_MS = 60 * 60 * 1000;
const LIVE_ACTIVITY_TTL_MS = 24 * 60 * 60 * 1000;
const LIVE_LEADERBOARD_LIMIT = 12;

/* ---- Server sync (GitHub-backed JSON file, shared across ALL visitors) ---- */
const SERVER_API = {
  leaderboard: '/api/leaderboard',
  record: '/api/record',
};
const SERVER_POLL_MS = 8000;

// null = not checked yet, true = server sync live, false = local-only fallback
let serverConfigured = null;
let serverPollTimer = null;
let serverLeaderboard = null;
let serverActivity = null;

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function createId(prefix = 'pg') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePlayerName(value) {
  const cleaned = String(value ?? '').replace(/[<>"`]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Guest Player';
  return cleaned.slice(0, 28);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';
  return new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatRelativeTime(value) {
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta) || delta < 0) return 'just now';
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getStoredObject(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

function setStoredObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op for private mode / quota errors
  }
}

/* ---- Particle background ---- */
function initParticles(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const {
    count = 120,
    color1 = '#0f2747',
    color2 = '#0b9ea0',
    color3 = '#5b7bbd',
    speed = 0.24,
  } = opts;

  let W = 0;
  let H = 0;
  let particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function createParticle() {
    const roll = Math.random();
    const color = roll < 0.33 ? color1 : roll < 0.66 ? color2 : color3;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: randBetween(0.4, 2.0),
      vx: randBetween(-speed, speed),
      vy: randBetween(-speed, speed),
      alpha: randBetween(0.08, 0.55),
      color,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: randBetween(0.01, 0.04),
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: count }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.twinkle += p.twinkleSpeed;
      const a = p.alpha * (0.55 + 0.45 * Math.sin(p.twinkle));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      if (p.y < -5) p.y = H + 5;
      if (p.y > H + 5) p.y = -5;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
}

/* ---- Score storage ---- */
const Storage = {
  getScores(key) {
    return getStoredObject(key, { player: 0, computer: 0, rounds: 0 });
  },
  saveScores(key, scores) {
    setStoredObject(key, scores);
  },
  resetScores(key) {
    localStorage.removeItem(key);
  },
};

/* ---- Coin helpers ---- */
function flipCoinEl(coinEl, finalState, duration = 1200) {
  return new Promise((resolve) => {
    coinEl.classList.add('flipping');
    setTimeout(() => {
      coinEl.classList.remove('flipping');
      if (finalState === 'T') coinEl.classList.add('show-tails');
      else coinEl.classList.remove('show-tails');
      resolve();
    }, duration);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ---- Confetti burst ---- */
function launchConfetti(colors = ['#0f2747', '#0b9ea0', '#5b7bbd', '#d7e4f4', '#7aa6d8']) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 144 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 80,
    w: 6 + Math.random() * 8,
    h: 10 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: 3 + Math.random() * 5,
    vx: (Math.random() - 0.5) * 4,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.2,
    alpha: 1,
  }));

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of pieces) {
      p.y += p.vy;
      p.x += p.vx;
      p.rot += p.rotSpeed;
      if (frame > 80) p.alpha -= 0.015;
      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
    frame += 1;
    if (alive) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();
}

/* ---- Theme helpers ---- */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

function updateThemeToggleLabel() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? 'Light' : 'Dark';
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  if (saved === 'dark') applyTheme('dark');
  else applyTheme('light');

  const bindThemeToggle = () => {
    updateThemeToggleLabel();
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(STORAGE_KEYS.theme, next);
      updateThemeToggleLabel();
      queueLiveRefresh();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindThemeToggle, { once: true });
  } else {
    bindThemeToggle();
  }
}

/* ---- Live registration + leaderboard ---- */
let liveChannel = null;
let liveRefreshQueued = false;
let liveCleanupTimer = null;

function getPlayerProfile() {
  return getStoredObject(STORAGE_KEYS.profile, null);
}

function getActivePlayerName() {
  return getPlayerProfile()?.name || 'Guest Player';
}

function savePlayerProfile(profile) {
  setStoredObject(STORAGE_KEYS.profile, profile);
  emitLiveUpdate('profile');
  queueLiveRefresh();
  return profile;
}

function setPlayerName(name) {
  const current = getPlayerProfile();
  const safeName = normalizePlayerName(name);
  const profile = {
    id: current?.id || createId('player'),
    name: safeName,
    createdAt: current?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return savePlayerProfile(profile);
}

function getLeaderboard() {
  return getStoredObject(STORAGE_KEYS.leaderboard, []);
}

function saveLeaderboard(entries) {
  setStoredObject(STORAGE_KEYS.leaderboard, entries);
  emitLiveUpdate('leaderboard');
}

function getActivityFeed() {
  return getStoredObject(STORAGE_KEYS.activity, []);
}

function saveActivityFeed(entries) {
  setStoredObject(STORAGE_KEYS.activity, entries);
  emitLiveUpdate('activity');
}

function pruneLeaderboard(entries) {
  return entries
    .filter((entry) => entry && entry.name)
    .sort((a, b) => (b.wins - a.wins) || (b.rounds - a.rounds) || (new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()))
    .slice(0, LIVE_LEADERBOARD_LIMIT);
}

function pruneActivity(entries) {
  const cutoff = Date.now() - LIVE_ACTIVITY_TTL_MS;
  return entries
    .filter((entry) => entry && entry.createdAt && new Date(entry.createdAt).getTime() >= cutoff)
    .slice(0, 24);
}

function cleanupLiveData() {
  saveLeaderboard(pruneLeaderboard(getLeaderboard()));
  saveActivityFeed(pruneActivity(getActivityFeed()));
  try {
    localStorage.setItem(`${STORAGE_KEYS.activity}_cleanup`, new Date().toISOString());
  } catch {
    // no-op
  }
  queueLiveRefresh();
}

function upsertLeaderboardEntry({ playerName, mode, winner }) {
  const name = normalizePlayerName(playerName);
  const key = name.toLowerCase();
  const now = new Date().toISOString();
  const leaderboard = getLeaderboard();
  let entry = leaderboard.find((item) => item.key === key);

  if (!entry) {
    entry = {
      id: createId('leader'),
      key,
      name,
      rounds: 0,
      wins: 0,
      losses: 0,
      classical: { rounds: 0, wins: 0, losses: 0 },
      quantum: { rounds: 0, wins: 0, losses: 0 },
      createdAt: now,
      lastActive: now,
      lastMode: mode,
      lastOutcome: winner,
    };
    leaderboard.push(entry);
  }

  entry.name = name;
  entry.rounds += 1;
  entry.lastActive = now;
  entry.lastMode = mode;
  entry.lastOutcome = winner;

  const bucket = mode === 'quantum' ? entry.quantum : entry.classical;
  bucket.rounds += 1;
  if (winner === 'player') {
    entry.wins += 1;
    bucket.wins += 1;
  } else {
    entry.losses += 1;
    bucket.losses += 1;
  }

  saveLeaderboard(pruneLeaderboard(leaderboard));
  return entry;
}

function appendActivityEntry(entry) {
  const feed = getActivityFeed();
  feed.unshift(entry);
  saveActivityFeed(pruneActivity(feed));
}

/** Pull the shared cross-user board from the server (GitHub-backed JSON).
 *  Silently falls back to local-only mode if the API isn't reachable or
 *  isn't configured (e.g. running via plain `npx serve` with no /api
 *  routes, or GITHUB_TOKEN not set yet). */
async function fetchServerBoard() {
  try {
    const res = await fetch(SERVER_API.leaderboard, { cache: 'no-store' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    if (json.configured === false) {
      serverConfigured = false;
      return null;
    }
    serverConfigured = true;
    serverLeaderboard = Array.isArray(json.leaderboard) ? json.leaderboard : [];
    serverActivity = Array.isArray(json.activity) ? json.activity : [];
    return json;
  } catch {
    serverConfigured = false;
    return null;
  }
}

/** Push a finished round to the server so it's visible to every visitor,
 *  not just this browser. Non-blocking — the local UI already updated. */
async function postServerRound(payload) {
  try {
    const res = await fetch(SERVER_API.record, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    if (json.configured === false) {
      serverConfigured = false;
      return null;
    }
    serverConfigured = true;
    serverLeaderboard = Array.isArray(json.leaderboard) ? json.leaderboard : serverLeaderboard;
    serverActivity = Array.isArray(json.activity) ? json.activity : serverActivity;
    return json;
  } catch {
    // Keep whatever serverConfigured state we already had — a single
    // failed request shouldn't flip a working server back to "local only".
    return null;
  }
}

function startServerPolling() {
  if (serverPollTimer) clearInterval(serverPollTimer);
  serverPollTimer = setInterval(async () => {
    const before = serverConfigured;
    await fetchServerBoard();
    if (serverConfigured) queueLiveRefresh();
    else if (before !== serverConfigured) queueLiveRefresh();
  }, SERVER_POLL_MS);
}

function updateSyncStatus() {
  const nodes = document.querySelectorAll('[data-sync-status]');
  if (!nodes.length) return;

  let text;
  if (serverConfigured === true) text = 'Live · synced across all players';
  else if (serverConfigured === false) text = 'Local device only (server sync not set up)';
  else text = 'Checking live sync…';

  nodes.forEach((node) => { node.textContent = text; });
}

function recordRound({ mode, winner, playerName, resultCoin, summary }) {
  const safeName = normalizePlayerName(playerName || getActivePlayerName());
  const activitySummary = summary || `${safeName} ${winner === 'player' ? 'won' : 'lost'} a ${mode} round.`;
  const createdAt = new Date().toISOString();

  // Always update the local view immediately so the UI feels instant.
  upsertLeaderboardEntry({ playerName: safeName, mode, winner });
  appendActivityEntry({
    id: createId('activity'),
    createdAt,
    playerName: safeName,
    mode,
    winner,
    resultCoin,
    summary: activitySummary,
  });

  // Also push to the shared server board (GitHub-backed JSON file) so
  // every visitor — not just this browser — sees the round. Fire and
  // forget: don't block the UI on the network round-trip.
  postServerRound({ playerName: safeName, mode, winner, resultCoin, summary: activitySummary })
    .then(() => queueLiveRefresh());

  queueLiveRefresh();
  return { playerName: safeName, mode, winner, resultCoin, summary: activitySummary };
}

function renderLeaderboard(target) {
  const el = resolveElement(target);
  if (!el) return;

  const entries = serverConfigured === true && Array.isArray(serverLeaderboard)
    ? serverLeaderboard
    : getLeaderboard();
  if (!entries.length) {
    el.innerHTML = '<div class="empty-state">No players yet. Register a name to claim the first spot.</div>';
    return;
  }

  el.innerHTML = entries.map((entry, index) => {
    const winRate = entry.rounds ? Math.round((entry.wins / entry.rounds) * 100) : 0;
    const modeLabel = entry.lastMode === 'quantum' ? 'Quantum' : 'Classical';
    const modeWins = entry.lastMode === 'quantum' ? entry.quantum.wins : entry.classical.wins;
    const modeRounds = entry.lastMode === 'quantum' ? entry.quantum.rounds : entry.classical.rounds;

    return `
      <div class="leaderboard-row">
        <div class="leaderboard-rank">${index + 1}</div>
        <div>
          <div class="leaderboard-name">${escapeHtml(entry.name)}</div>
          <div class="leaderboard-meta">${entry.wins}W · ${entry.losses}L · ${entry.rounds} rounds · ${winRate}% win rate</div>
          <div class="leaderboard-meta">Last: ${modeLabel} · ${modeWins}/${modeRounds} · ${formatRelativeTime(entry.lastActive)}</div>
          <div class="leaderboard-bar" style="width:${Math.max(8, winRate || 0)}%"></div>
        </div>
        <div class="leaderboard-stats">
          <div>${entry.wins}/${entry.rounds || 0}</div>
          <div class="leaderboard-meta">wins</div>
        </div>
      </div>`;
  }).join('');
}

function renderActivityFeed(target) {
  const el = resolveElement(target);
  if (!el) return;

  const entries = serverConfigured === true && Array.isArray(serverActivity)
    ? serverActivity
    : getActivityFeed();
  if (!entries.length) {
    el.innerHTML = '<div class="empty-state">Live activity will appear here once people start playing.</div>';
    return;
  }

  el.innerHTML = entries.map((entry) => {
    const modeLabel = entry.mode === 'quantum' ? 'Quantum' : 'Classical';
    const outcomeClass = entry.winner === 'player' ? 'activity-win' : 'activity-loss';
    const outcomeText = entry.winner === 'player' ? 'win' : 'loss';
    const resultText = entry.resultCoin === 'H' ? 'Heads' : 'Tails';

    return `
      <div class="activity-item">
        <div class="activity-mode">${modeLabel}</div>
        <div class="activity-copy">
          <strong>${escapeHtml(entry.playerName)}</strong>
          <span>${escapeHtml(entry.summary)} · ${resultText} · ${formatRelativeTime(entry.createdAt)}</span>
        </div>
        <div class="activity-result ${outcomeClass}">${outcomeText}</div>
      </div>`;
  }).join('');
}

function resolveElement(target) {
  if (!target) return null;
  if (typeof target === 'string') return document.querySelector(target);
  if (target instanceof HTMLElement) return target;
  return null;
}

function syncPlayerWidgets() {
  const profile = getPlayerProfile();
  const name = profile?.name || 'Guest Player';
  const joinedText = profile ? `Registered · updated ${formatRelativeTime(profile.updatedAt)}` : 'Register your name to appear on the live board';
  const chipText = profile ? name : 'Guest Player';

  document.querySelectorAll('[data-player-input]').forEach((input) => {
    if (document.activeElement === input) return;
    input.value = profile?.name || '';
  });

  document.querySelectorAll('[data-player-chip]').forEach((chip) => {
    chip.textContent = chipText;
  });

  document.querySelectorAll('[data-player-status]').forEach((status) => {
    status.textContent = joinedText;
  });
}

function bindRegistrationForms() {
  document.querySelectorAll('[data-player-form]').forEach((form) => {
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector('[data-player-input]');
      const nextName = input ? input.value : '';
      setPlayerName(nextName);
      syncPlayerWidgets();
      renderAllLiveWidgets();
    });
  });
}

function renderAllLiveWidgets() {
  bindRegistrationForms();
  syncPlayerWidgets();
  document.querySelectorAll('[data-leaderboard]').forEach((node) => renderLeaderboard(node));
  document.querySelectorAll('[data-activity-feed]').forEach((node) => renderActivityFeed(node));
  updateThemeToggleLabel();
  updateSyncStatus();
}

function queueLiveRefresh() {
  if (liveRefreshQueued) return;
  liveRefreshQueued = true;
  requestAnimationFrame(() => {
    liveRefreshQueued = false;
    renderAllLiveWidgets();
  });
}

function emitLiveUpdate(type) {
  const message = { type, at: new Date().toISOString() };
  if (liveChannel) {
    try {
      liveChannel.postMessage(message);
    } catch {
      // no-op
    }
  }
}

function ensureLiveSync() {
  if (!liveChannel && 'BroadcastChannel' in window) {
    try {
      liveChannel = new BroadcastChannel(LIVE_CHANNEL_NAME);
      liveChannel.addEventListener('message', () => queueLiveRefresh());
    } catch {
      liveChannel = null;
    }
  }

  window.addEventListener('storage', (event) => {
    if (!event.key) return;
    if (event.key === STORAGE_KEYS.theme) {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
      if (savedTheme === 'dark') applyTheme('dark');
      else applyTheme('light');
      updateThemeToggleLabel();
    }
    if ([STORAGE_KEYS.profile, STORAGE_KEYS.leaderboard, STORAGE_KEYS.activity, STORAGE_KEYS.theme].includes(event.key)) {
      queueLiveRefresh();
    }
  });

  cleanupLiveData();
  if (liveCleanupTimer) clearInterval(liveCleanupTimer);
  liveCleanupTimer = setInterval(cleanupLiveData, LIVE_CLEANUP_MS);
}

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  ensureLiveSync();
  renderAllLiveWidgets();

  // Check server sync once on load, render again once we know the
  // real cross-user state, then keep polling for other players' rounds.
  fetchServerBoard().then(() => {
    renderAllLiveWidgets();
    startServerPolling();
  });
});

window.PennyGameLive = {
  getProfile: getPlayerProfile,
  getActivePlayerName,
  setPlayerName,
  getLeaderboard,
  getActivityFeed,
  recordRound,
  cleanupLiveData,
  renderAllLiveWidgets,
  renderLeaderboard,
  renderActivityFeed,
  fetchServerBoard,
  isServerConfigured: () => serverConfigured,
};
