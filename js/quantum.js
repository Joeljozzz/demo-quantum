/* ============================================================
   Quantum Penny Game — Meyer's Quantum Strategy
   The Quantum Computer applies a Hadamard gate at start & end.
   No matter what the user does (flip or keep), the quantum
   strategy guarantees the coin returns to |0⟩ = HEADS.

   Flow:
   1. Start: |0⟩ (Heads)
   2. Q applies H  →  (|0⟩ + |1⟩)/√2   [superposition]
   3. User applies I or X               [flip or keep]
   4. Q applies H  →  always |0⟩ = Heads
   ============================================================ */

const Q_SCORE_KEY = 'pennygame_quantum_scores';

/* ---- Quantum State ---- */
class QuantumState {
  constructor() { this.reset(); }

  reset() {
    this.alpha = 1;  // amplitude |0⟩ (Heads)
    this.beta  = 0;  // amplitude |1⟩ (Tails)
    this._steps = [];
  }

  applyHadamard(label) {
    const a = (this.alpha + this.beta) / Math.SQRT2;
    const b = (this.alpha - this.beta) / Math.SQRT2;
    this.alpha = a; this.beta = b;
    this._steps.push({ gate: 'H', label, alpha: a, beta: b });
  }

  applyX(label) {
    [this.alpha, this.beta] = [this.beta, this.alpha];
    this._steps.push({ gate: 'X', label, alpha: this.alpha, beta: this.beta });
  }

  applyI(label) {
    this._steps.push({ gate: 'I', label, alpha: this.alpha, beta: this.beta });
  }

  probHeads() { return this.alpha * this.alpha; }
  probTails() { return this.beta  * this.beta;  }

  measure() {
    return Math.random() < this.probHeads() ? 'H' : 'T';
  }

  stateLabel() {
    const a = this.alpha, b = this.beta;
    const fmt = v => Math.abs(v) < 0.001 ? '0' : v.toFixed(3);
    if (Math.abs(b) < 0.001) return `|ψ⟩ = |0⟩`;
    if (Math.abs(a) < 0.001) return `|ψ⟩ = |1⟩`;
    const sign = b >= 0 ? '+' : '−';
    return `|ψ⟩ = ${fmt(Math.abs(a))}|0⟩ ${sign} ${fmt(Math.abs(b))}|1⟩`;
  }
}

/* ---- Game state ---- */
let qState     = new QuantumState();
let qScores    = Storage.getScores(Q_SCORE_KEY);
let qRound     = 0;
let qPhase     = 'start';  // start | user | reveal
let userChoice = null;

/* ---- DOM refs ---- */
const qCoinEl        = document.getElementById('q-coin');
const qPhaseBadge    = document.getElementById('q-phase-badge');
const qPhaseTitle    = document.getElementById('q-phase-title');
const qPhaseDesc     = document.getElementById('q-phase-desc');
const qChoiceWrap    = document.getElementById('q-choice-wrap');
const qStatusMsg     = document.getElementById('q-status-msg');
const qBtnFlip       = document.getElementById('q-btn-flip');
const qBtnKeep       = document.getElementById('q-btn-keep');
const qBtnStart      = document.getElementById('q-btn-start');
const qResultOverlay = document.getElementById('q-result-overlay');
const qResultEmoji   = document.getElementById('q-result-emoji');
const qResultTitle   = document.getElementById('q-result-title');
const qResultSub     = document.getElementById('q-result-sub');
const qResultMoves   = document.getElementById('q-result-moves');
const qBtnAgain      = document.getElementById('q-btn-again');
const qBtnClose      = document.getElementById('q-btn-close');
const qScoreComp     = document.getElementById('q-score-comp');
const qScorePlayer   = document.getElementById('q-score-player');
const qScoreRounds   = document.getElementById('q-score-rounds');
const qBarComp       = document.getElementById('q-bar-comp');
const qBarPlayer     = document.getElementById('q-bar-player');
const qHistoryList   = document.getElementById('q-history-list');
const qBtnReset      = document.getElementById('q-btn-reset');
const stateEq        = document.getElementById('state-equation');
const probFillH      = document.getElementById('prob-fill-heads');
const probFillT      = document.getElementById('prob-fill-tails');
const probPctH       = document.getElementById('prob-pct-heads');
const probPctT       = document.getElementById('prob-pct-tails');
const circuitCanvas  = document.getElementById('circuit-canvas');

function getCurrentPlayerName() {
  return window.PennyGameLive?.getActivePlayerName?.() || 'Guest Player';
}

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', () => {
  initParticles('particles-canvas', { color1: '#06b6d4', color2: '#8b5cf6', color3: '#0ea5e9' });
  updateQScoreDisplay();
  updateStateDisplay();
  drawCircuit('idle');
  setupStartScreen();
});

function setupStartScreen() {
  qPhase = 'start';
  qCoinEl.classList.remove('show-tails', 'coin-superposition');
  qChoiceWrap.classList.add('hidden');
  qBtnStart.classList.remove('hidden');
  qStatusMsg.style.display = 'none';
  qPhaseTitle.textContent = 'Meyer\'s Quantum Penny Game';
  qPhaseDesc.innerHTML = 'The <span class="text-q">Quantum Computer</span> uses <strong>Hadamard gates</strong> to always win — no matter what you choose. Can you beat quantum mechanics?';
  qPhaseBadge.textContent = 'Ready to Play';
}

/* ---- Start a round ---- */
async function startQRound() {
  qState.reset();
  userChoice = null;
  qCoinEl.classList.remove('show-tails', 'coin-superposition');
  qBtnStart.classList.add('hidden');
  qChoiceWrap.classList.add('hidden');

  updateStateDisplay();
  drawCircuit('start');

  // Step 1 — Show starting state
  qPhaseTitle.textContent = 'Coin Starts: HEADS';
  qPhaseDesc.innerHTML    = 'Initial state <span class="quantum-formula">|ψ⟩ = |0⟩</span> — the coin is definitively Heads.';
  qPhaseBadge.textContent = 'Step 1: Initial State';
  setQStatus('', '');
  await sleep(1000);

  // Step 2 — Quantum applies H
  qPhaseTitle.textContent = 'Quantum Computer Applies H Gate';
  qPhaseDesc.innerHTML    = 'The Hadamard gate puts the coin into <span class="text-q">quantum superposition</span> — it\'s simultaneously Heads AND Tails!';
  qPhaseBadge.textContent = 'Step 2: Hadamard Gate';
  setQStatus('<span class="thinking-dots"><span></span><span></span><span></span></span> Applying H gate...', 'status-info-q');
  await sleep(1200);

  qState.applyHadamard('Q: H');
  qCoinEl.classList.add('coin-superposition');
  updateStateDisplay();
  drawCircuit('after-h1');
  setQStatus('Superposition! |ψ⟩ = (|0⟩ + |1⟩)/√2', 'status-info-q');
  await sleep(1200);

  // Step 3 — User's turn
  qPhase = 'user';
  qPhaseTitle.textContent = 'Your Move';
  qPhaseDesc.innerHTML    = 'Flip or keep the coin — but remember, it\'s in <span class="text-qv">quantum superposition</span>. Does your choice matter?';
  qPhaseBadge.textContent = 'Step 3: Your Move';
  setQStatus('Choose wisely... or not!', 'status-info-q');
  qChoiceWrap.classList.remove('hidden');
  qBtnFlip.disabled = false;
  qBtnKeep.disabled = false;
}

/* ---- User choice ---- */
async function handleQChoice(choice) {
  if (qPhase !== 'user') return;
  qPhase = 'processing';
  userChoice = choice;
  const playerName = getCurrentPlayerName();
  qBtnFlip.disabled = true;
  qBtnKeep.disabled = true;
  qChoiceWrap.classList.add('hidden');

  // Apply user's move to quantum state
  if (choice === 'flip') {
    qState.applyX('User: X');
  } else {
    qState.applyI('User: I');
  }
  updateStateDisplay();
  drawCircuit('after-user');

  setQStatus(`You chose to ${choice === 'flip' ? 'Flip' : 'Keep'}. Quantum computer responds...`, 'status-locked');
  await sleep(1000);

  // Step 4 — Quantum applies H again
  qPhaseTitle.textContent = 'Quantum Computer Applies H Again';
  qPhaseDesc.innerHTML    = 'A second Hadamard gate collapses the superposition — <strong>always back to |0⟩</strong>, regardless of your move.';
  qPhaseBadge.textContent = 'Step 4: Second Hadamard';
  setQStatus('<span class="thinking-dots"><span></span><span></span><span></span></span> Applying H gate again...', 'status-info-q');
  await sleep(1200);

  qState.applyHadamard('Q: H');
  updateStateDisplay();
  drawCircuit('complete');

  // Remove superposition effect
  qCoinEl.classList.remove('coin-superposition');
  setQStatus('Superposition collapsed! Result determined...', 'status-info-q');
  await sleep(900);

  // Reveal
  const result = qState.measure();  // Should always be H (~100%)
  qRound++;
  await doQReveal(result, choice, playerName);
}

async function doQReveal(result, userMove, playerName) {
  // The quantum strategy means result is always H
  const winner = result === 'H' ? 'computer' : 'player';  // Heads = Q computer wins in quantum game

  await flipCoinEl(qCoinEl, result, 1100);
  await sleep(400);

  if (winner === 'computer') qScores.computer++;
  else qScores.player++;
  qScores.rounds++;
  Storage.saveScores(Q_SCORE_KEY, qScores);
  updateQScoreDisplay();

  addQHistoryItem(qRound, winner, userMove, result, playerName);

  window.PennyGameLive?.recordRound?.({
    mode: 'quantum',
    winner,
    playerName,
    resultCoin: result,
    summary: `${playerName} ${winner === 'player' ? 'beat' : 'lost to'} the quantum strategy.`,
  });

  showQResult(winner, result, userMove, playerName);
}

function showQResult(winner, coin, userMove, playerName) {
  const isQWin = winner === 'computer';
  qResultEmoji.textContent = isQWin ? 'Quantum' : 'Result';
  qResultTitle.textContent = isQWin ? 'Quantum Wins!' : 'You Beat Quantum!';
  qResultTitle.style.color = isQWin ? 'var(--q-primary)' : 'var(--c-primary)';
  qResultSub.textContent   = isQWin
    ? `${playerName}, heads! The Hadamard strategy collapses perfectly to |0⟩ every time.`
    : `${playerName}, incredible! The quantum collapse didn't favour the computer this round.`;

  qResultMoves.innerHTML = `
    <span class="move-chip move-chip-profile">Player: ${escapeHtml(playerName)}</span>
    <span class="move-chip move-chip-h">Q: H</span>
    <span class="move-chip move-chip-${userMove === 'flip' ? 'flip' : 'keep'}-q">
      You: ${userMove === 'flip' ? 'Flip (X)' : 'Keep (I)'}
    </span>
    <span class="move-chip move-chip-h">Q: H</span>
    <span class="move-chip move-chip-h" style="background:rgba(${coin==='H'?'6,182,212':'139,92,246'},0.12);color:${coin==='H'?'var(--q-primary)':'var(--q-secondary)'};border-color:rgba(${coin==='H'?'6,182,212':'139,92,246'},0.3)">
      ${coin === 'H' ? '|0⟩ HEADS' : '|1⟩ TAILS'}
    </span>
  `;

  qResultOverlay.classList.add('show');
  if (!isQWin) launchConfetti(['#f59e0b', '#fcd34d', '#f97316']);
}

/* ---- Circuit Drawing ---- */
function drawCircuit(phase) {
  if (!circuitCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = circuitCanvas.clientWidth || 280;
  const H = 110;
  circuitCanvas.width  = W * dpr;
  circuitCanvas.height = H * dpr;
  circuitCanvas.style.height = H + 'px';
  const ctx = circuitCanvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const y = H / 2;
  const pad = 28;
  const gateW = 34, gateH = 28;

  // Gate positions
  const x0 = pad;           // init label
  const x1 = pad + 55;      // H gate 1
  const x2 = pad + 130;     // User gate
  const x3 = pad + 205;     // H gate 2
  const x4 = W - pad;       // measure

  // Wire
  ctx.strokeStyle = phase === 'idle' ? '#1e293b' : '#06b6d4';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x4, y);
  ctx.stroke();

  // Init label |0⟩
  ctx.font = '13px "Share Tech Mono", monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText('|0⟩', x0, y + 4);

  // Helper: draw gate box
  function drawGate(x, label, active, color = '#06b6d4') {
    const gx = x - gateW / 2, gy = y - gateH / 2;
    const alpha = active ? 1 : 0.22;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = active ? color + '22' : '#1e293b';
    ctx.strokeStyle = color;
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(gx, gy, gateW, gateH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? color : '#475569';
    ctx.font = `bold 14px "Share Tech Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 5);
    ctx.globalAlpha = 1;
  }

  // H gate 1
  const h1Active = ['after-h1', 'after-user', 'complete'].includes(phase);
  drawGate(x1, 'H', h1Active, '#06b6d4');

  // User gate
  const userGateLabel = phase === 'idle' || phase === 'start' || phase === 'after-h1'
    ? 'U?'
    : (userChoice === 'flip' ? 'X' : 'I');
  const userActive = ['after-user', 'complete'].includes(phase);
  const userColor   = userChoice === 'flip' ? '#f59e0b' : '#8b5cf6';
  drawGate(x2, userGateLabel, userActive, userActive ? userColor : '#475569');

  // H gate 2
  const h2Active = phase === 'complete';
  drawGate(x3, 'H', h2Active, '#06b6d4');

  // Measure symbol
  ctx.globalAlpha = phase === 'complete' ? 1 : 0.25;
  ctx.strokeStyle = '#f59e0b';
  ctx.fillStyle   = 'rgba(245,158,11,0.1)';
  ctx.lineWidth   = 2;
  const mx = x4 - 14, mw = 28, mh = 28, my = y - mh / 2;
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, 4);
  ctx.fill();
  ctx.stroke();
  // meter arc
  ctx.beginPath();
  ctx.arc(x4, y + 4, 8, Math.PI, 0);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x4, y + 4);
  ctx.lineTo(x4 + 6, y - 3);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ---- State Display ---- */
function updateStateDisplay() {
  if (stateEq) stateEq.textContent = qState.stateLabel();

  const pH = qState.probHeads() * 100;
  const pT = qState.probTails() * 100;

  if (probFillH) probFillH.style.width = pH + '%';
  if (probFillT) probFillT.style.width = pT + '%';
  if (probPctH)  probPctH.textContent  = pH.toFixed(0) + '%';
  if (probPctT)  probPctT.textContent  = pT.toFixed(0) + '%';
}

/* ---- Scores ---- */
function updateQScoreDisplay() {
  const total = qScores.computer + qScores.player || 1;
  if (qScoreComp)   qScoreComp.textContent   = qScores.computer;
  if (qScorePlayer) qScorePlayer.textContent = qScores.player;
  if (qScoreRounds) qScoreRounds.textContent = qScores.rounds;
  if (qBarComp)     qBarComp.style.width  = (qScores.computer / total * 100) + '%';
  if (qBarPlayer)   qBarPlayer.style.width = (qScores.player  / total * 100) + '%';
}

function addQHistoryItem(round, winner, uMove, coin, playerName) {
  if (!qHistoryList) return;
  const isQWin = winner === 'computer';
  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <span class="history-round">#${round}</span>
    <span class="history-player">${escapeHtml(playerName)}</span>
    <span class="history-outcome">${coin === 'H' ? 'H' : 'T'}</span>
    <span class="history-text">H → ${uMove[0].toUpperCase()} → H</span>
    <span class="history-winner ${isQWin ? 'history-winner-comp' : 'history-winner-you'}">
      ${isQWin ? 'Q wins' : 'You!'}
    </span>
  `;
  qHistoryList.prepend(item);
}

/* ---- UI helpers ---- */
function setQStatus(msg, cls) {
  if (!qStatusMsg) return;
  if (!msg) { qStatusMsg.style.display = 'none'; return; }
  qStatusMsg.style.display = 'block';
  qStatusMsg.className = 'status-msg ' + cls;
  qStatusMsg.innerHTML = msg;
}

/* ---- Button listeners ---- */
qBtnStart?.addEventListener('click', startQRound);
qBtnFlip?.addEventListener('click', () => handleQChoice('flip'));
qBtnKeep?.addEventListener('click', () => handleQChoice('keep'));

qBtnAgain?.addEventListener('click', () => {
  qResultOverlay.classList.remove('show');
  setupStartScreen();
});

qBtnClose?.addEventListener('click', () => {
  qResultOverlay.classList.remove('show');
  setupStartScreen();
});

qBtnReset?.addEventListener('click', () => {
  qScores = { player: 0, computer: 0, rounds: 0 };
  Storage.resetScores(Q_SCORE_KEY);
  qRound = 0;
  if (qHistoryList) qHistoryList.innerHTML = '';
  updateQScoreDisplay();
  setupStartScreen();
});

