/* ============================================================
   Classical Penny Game — Meyer's Game (classical computer)
   Flow: START → User move 1 (secret) → Computer move (random) → User move 2 (secret) → Reveal
   Heads = User wins · Tails = Computer wins
   ============================================================ */

const SCORE_KEY = 'pennygame_classical_scores';

// ---- State ----
let coinState  = 'H';   // 'H' or 'T'
let userMove1  = null;  // 'flip' | 'keep'
let userMove2  = null;
let compMove   = null;
let gamePhase  = 'start'; // start | user1 | comp | user2 | reveal
let scores     = Storage.getScores(SCORE_KEY);
let history    = [];
let roundNum   = 0;

// ---- DOM refs ----
const coinEl       = document.getElementById('coin');
const phaseTitle   = document.getElementById('phase-title');
const phaseDesc    = document.getElementById('phase-desc');
const choiceWrap   = document.getElementById('choice-wrap');
const statusMsg    = document.getElementById('status-msg');
const btnFlip      = document.getElementById('btn-flip');
const btnKeep      = document.getElementById('btn-keep');
const resultOverlay= document.getElementById('result-overlay');
const resultEmoji  = document.getElementById('result-emoji');
const resultTitle  = document.getElementById('result-title');
const resultSub    = document.getElementById('result-sub');
const resultMoves  = document.getElementById('result-moves');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnClose     = document.getElementById('btn-close-result');
const scoreYou     = document.getElementById('score-you');
const scoreComp    = document.getElementById('score-comp');
const scoreRounds  = document.getElementById('score-rounds');
const scoreBarYou  = document.getElementById('score-bar-you');
const scoreBarComp = document.getElementById('score-bar-comp');
const historyList  = document.getElementById('history-list');
const stepsEl      = document.querySelectorAll('.step-dot');
const btnReset     = document.getElementById('btn-reset');

function getCurrentPlayerName() {
  return window.PennyGameLive?.getActivePlayerName?.() || 'Guest Player';
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initParticles('particles-canvas');
  updateScoreDisplay();
  startNewRound();
});

// ---- Game flow ----
function startNewRound() {
  coinState  = 'H';
  userMove1  = null;
  userMove2  = null;
  compMove   = null;
  gamePhase  = 'user1';

  // Coin always starts Heads
  coinEl.classList.remove('show-tails', 'flipping');

  updateSteps(1);
  setPhase({
    title: 'Your First Move',
    desc:  'The coin starts <strong>HEADS</strong>. Your move is secret — the computer won\'t see it.',
    showButtons: true,
  });
  setStatus('', '');
}

async function handleChoice(choice) {
  btnFlip.disabled = true;
  btnKeep.disabled = true;

  if (gamePhase === 'user1') {
    userMove1 = choice;
    applyCoinMove(choice);
    setStatus('Move locked — computer is deciding...', 'status-locked');
    updateSteps(2);
    await sleep(1400);
    doComputerMove();

  } else if (gamePhase === 'user2') {
    userMove2 = choice;
    applyCoinMove(choice);
    setStatus('Move locked — revealing the coin...', 'status-locked');
    updateSteps(4);
    await sleep(900);
    doReveal();
  }
}

function applyCoinMove(choice) {
  if (choice === 'flip') {
    coinState = coinState === 'H' ? 'T' : 'H';
  }
}

async function doComputerMove() {
  gamePhase = 'comp';
  setPhase({
    title: 'Computer\'s Move',
    desc: 'The computer is making its decision...',
    showButtons: false,
  });

  compMove = randomChoice(['flip', 'keep']);
  await sleep(1200);

  applyCoinMove(compMove);
  setStatus('Computer has moved.', 'status-info-c');
  await sleep(700);

  // user2 phase
  gamePhase = 'user2';
  updateSteps(3);
  setPhase({
    title: 'Your Second Move',
    desc: 'One more chance! Flip or keep the coin — still secret.',
    showButtons: true,
  });
  btnFlip.disabled = false;
  btnKeep.disabled = false;
}

async function doReveal() {
  roundNum++;
  gamePhase = 'reveal';

  const winner = coinState === 'H' ? 'player' : 'computer';
  const playerName = getCurrentPlayerName();

  // Flip coin with animation
  await flipCoinEl(coinEl, coinState, 1200);
  await sleep(300);

  // Update scores
  if (winner === 'player') scores.player++;
  else scores.computer++;
  scores.rounds++;
  Storage.saveScores(SCORE_KEY, scores);
  updateScoreDisplay();

  // Add to history
  addHistoryItem(roundNum, winner, userMove1, compMove, userMove2, coinState, playerName);

  // Update live community board
  window.PennyGameLive?.recordRound?.({
    mode: 'classical',
    winner,
    playerName,
    resultCoin: coinState,
    summary: `${playerName} ${winner === 'player' ? 'won' : 'lost'} a classical round.`,
  });

  // Show result overlay
  showResult(winner, coinState, playerName);
}

function showResult(winner, coin, playerName) {
  const isWin = winner === 'player';
  resultEmoji.textContent = isWin ? 'You' : 'CPU';
  resultTitle.textContent = isWin ? 'You Win!' : 'Computer Wins!';
  resultTitle.style.color = isWin ? 'var(--c-primary)' : '#f87171';
  resultSub.textContent   = coin === 'H'
    ? `${playerName}, the coin landed HEADS — you win this round!`
    : `${playerName}, the coin landed TAILS — computer wins this round!`;

  // Move chips
  resultMoves.innerHTML = `
    <span class="move-chip move-chip-profile">Player: ${escapeHtml(playerName)}</span>
    <span class="move-chip move-chip-${userMove1 === 'flip' ? 'flip' : 'keep'}-c">You: ${userMove1 === 'flip' ? 'Flip' : 'Keep'}</span>
    <span class="move-chip move-chip-keep-c">Computer: ${compMove === 'flip' ? 'Flip' : 'Keep'}</span>
    <span class="move-chip move-chip-${userMove2 === 'flip' ? 'flip' : 'keep'}-c">You: ${userMove2 === 'flip' ? 'Flip' : 'Keep'}</span>
    <span class="move-chip move-chip-keep-c" style="background:rgba(${coin==='H'?'6,182,212':'248,113,113'},0.12);color:${coin==='H'?'var(--q-primary)':'#f87171'};border-color:rgba(${coin==='H'?'6,182,212':'248,113,113'},0.3)">
      Result: ${coin === 'H' ? 'HEADS' : 'TAILS'}
    </span>
  `;

  resultOverlay.classList.add('show');
  if (isWin) launchConfetti();
}

// ---- UI helpers ----
function setPhase({ title, desc, showButtons }) {
  phaseTitle.innerHTML = title;
  phaseDesc.innerHTML  = desc;
  choiceWrap.style.display = showButtons ? 'flex' : 'none';
  if (showButtons) {
    btnFlip.disabled = false;
    btnKeep.disabled = false;
  }
}

function setStatus(msg, cls) {
  if (!msg) { statusMsg.style.display = 'none'; return; }
  statusMsg.style.display = 'block';
  statusMsg.className = 'status-msg ' + cls;
  statusMsg.innerHTML = msg;
}

function updateSteps(active) {
  stepsEl.forEach((dot, i) => {
    dot.classList.remove('active-c', 'done-c');
    if (i + 1 === active) dot.classList.add('active-c');
    else if (i + 1 < active) dot.classList.add('done-c');
  });
}

function updateScoreDisplay() {
  const total = scores.player + scores.computer || 1;
  scoreYou.textContent    = scores.player;
  scoreComp.textContent   = scores.computer;
  scoreRounds.textContent = scores.rounds;
  scoreBarYou.style.width  = (scores.player   / total * 100) + '%';
  scoreBarComp.style.width = (scores.computer / total * 100) + '%';
}

function addHistoryItem(round, winner, u1, comp, u2, coin, playerName) {
  if (!historyList) return;
  const isWin = winner === 'player';
  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <span class="history-round">#${round}</span>
    <span class="history-player">${escapeHtml(playerName)}</span>
    <span class="history-outcome">${coin === 'H' ? 'H' : 'T'}</span>
    <span class="history-text">
      U:${u1[0].toUpperCase()} · C:${comp[0].toUpperCase()} · U:${u2[0].toUpperCase()}
    </span>
    <span class="history-winner ${isWin ? 'history-winner-you' : 'history-winner-comp'}">
      ${isWin ? 'You' : 'CPU'}
    </span>
  `;
  historyList.prepend(item);
}

// ---- Button listeners ----
btnFlip.addEventListener('click', () => handleChoice('flip'));
btnKeep.addEventListener('click', () => handleChoice('keep'));

btnPlayAgain.addEventListener('click', () => {
  resultOverlay.classList.remove('show');
  startNewRound();
});

btnClose.addEventListener('click', () => {
  resultOverlay.classList.remove('show');
  startNewRound();
});

btnReset?.addEventListener('click', () => {
  scores = { player: 0, computer: 0, rounds: 0 };
  Storage.resetScores(SCORE_KEY);
  roundNum = 0;
  history  = [];
  if (historyList) historyList.innerHTML = '';
  updateScoreDisplay();
  startNewRound();
});

