/* ============================================================
   Shared utilities — particles, storage, coin animation helpers,
   confetti, and theme management
   ============================================================ */

const STORAGE_KEYS = {
  theme: 'pennygame_theme',
};

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

  // Fewer particles on small/low-power (mobile) screens to keep
  // the animation smooth and battery-friendly.
  const isSmallScreen = window.innerWidth < 640;

  const {
    count = isSmallScreen ? 50 : 120,
    color1 = '#004494',
    color2 = '#009CDD',
    color3 = '#6AB023',
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
function launchConfetti(colors = ['#004494', '#009CDD', '#6AB023', '#DADADA', '#33B0E3']) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieceCount = window.innerWidth < 640 ? 70 : 144;
  const pieces = Array.from({ length: pieceCount }, () => ({
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
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindThemeToggle, { once: true });
  } else {
    bindThemeToggle();
  }
}

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
});
