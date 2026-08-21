/* ============================================================
   Common utilities — particles, coin animation helpers, storage
   ============================================================ */

/* ---- Starfield / Particle Background ---- */
function initParticles(canvasId, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const {
    count  = 120,
    color1 = '#06b6d4',
    color2 = '#8b5cf6',
    color3 = '#f59e0b',
    speed  = 0.3,
  } = opts;

  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randBetween(a, b) { return a + Math.random() * (b - a); }

  function createParticle() {
    const roll = Math.random();
    const color = roll < 0.33 ? color1 : roll < 0.66 ? color2 : color3;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: randBetween(0.4, 2.2),
      vx: randBetween(-speed, speed),
      vy: randBetween(-speed, speed),
      alpha: randBetween(0.1, 0.8),
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
      const a = p.alpha * (0.5 + 0.5 * Math.sin(p.twinkle));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(a * 255).toString(16).padStart(2, '0');
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

/* ---- Score Storage ---- */
const Storage = {
  getScores(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || { player: 0, computer: 0, rounds: 0 };
    } catch { return { player: 0, computer: 0, rounds: 0 }; }
  },
  saveScores(key, scores) {
    try { localStorage.setItem(key, JSON.stringify(scores)); } catch {}
  },
  resetScores(key) {
    localStorage.removeItem(key);
  },
};

/* ---- Coin helpers ---- */
function flipCoinEl(coinEl, finalState, duration = 1200) {
  return new Promise(resolve => {
    coinEl.classList.add('flipping');
    setTimeout(() => {
      coinEl.classList.remove('flipping');
      if (finalState === 'T') {
        coinEl.classList.add('show-tails');
      } else {
        coinEl.classList.remove('show-tails');
      }
      resolve();
    }, duration);
  });
}

/* ---- Sleep helper ---- */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---- Shuffle / random pick ---- */
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ---- Confetti burst (simple canvas-based) ---- */
function launchConfetti(colors = ['#f59e0b', '#fcd34d', '#06b6d4', '#8b5cf6', '#f87171']) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 160 }, () => ({
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
    frame++;
    if (alive) requestAnimationFrame(animate);
    else canvas.remove();
  }
  animate();
}

