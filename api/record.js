/* ============================================================
   POST /api/record
   Records one finished round (classical or quantum) into the
   shared data/live-board.json file, committed via the GitHub
   Contents API — so every visitor's result is tracked, not
   just the local browser's.

   Body: { playerName, mode: 'classical'|'quantum',
           winner: 'player'|'computer', resultCoin: 'H'|'T',
           summary?: string }
   ============================================================ */

const { getDataFile, putDataFile, isConfigured } = require('./_lib/github');

const LEADERBOARD_LIMIT = 12;
const ACTIVITY_LIMIT = 30;
const ACTIVITY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1h — opportunistic cleanup

function normalizeName(name) {
  const cleaned = String(name ?? '')
    .replace(/[<>"`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'Guest Player';
  return cleaned.slice(0, 28);
}

function pruneLeaderboard(entries) {
  return entries
    .filter((e) => e && e.name)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.rounds - a.rounds ||
        new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    )
    .slice(0, LEADERBOARD_LIMIT);
}

function pruneActivity(entries) {
  const cutoff = Date.now() - ACTIVITY_TTL_MS;
  return entries
    .filter((e) => e && e.createdAt && new Date(e.createdAt).getTime() >= cutoff)
    .slice(0, ACTIVITY_LIMIT);
}

/** Runs the same cleanup as the hourly cron, but inline, so the
 *  board stays tidy even if Cron Jobs aren't available on the
 *  current hosting plan. */
function maybeCleanup(data) {
  const last = data.lastCleanupAt ? new Date(data.lastCleanupAt).getTime() : 0;
  if (Date.now() - last >= CLEANUP_INTERVAL_MS) {
    data.leaderboard = pruneLeaderboard(data.leaderboard);
    data.activity = pruneActivity(data.activity);
    data.lastCleanupAt = new Date().toISOString();
  }
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body || {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (!isConfigured()) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: false, configured: false });
    return;
  }

  const body = readBody(req);
  const playerName = normalizeName(body.playerName);
  const mode = body.mode === 'quantum' ? 'quantum' : 'classical';
  const winner = body.winner === 'player' ? 'player' : 'computer';
  const resultCoin = body.resultCoin === 'T' ? 'T' : 'H';
  const summary =
    typeof body.summary === 'string' && body.summary.trim()
      ? body.summary.trim().slice(0, 140)
      : `${playerName} ${winner === 'player' ? 'won' : 'lost'} a ${mode} round.`;

  async function applyUpdate() {
    const { data, sha } = await getDataFile();
    maybeCleanup(data);

    const now = new Date().toISOString();
    const key = playerName.toLowerCase();
    let entry = data.leaderboard.find((e) => e.key === key);

    if (!entry) {
      entry = {
        id: `leader-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        key,
        name: playerName,
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
      data.leaderboard.push(entry);
    }

    entry.name = playerName;
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

    data.leaderboard = pruneLeaderboard(data.leaderboard);

    data.activity.unshift({
      id: `activity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      playerName,
      mode,
      winner,
      resultCoin,
      summary,
    });
    data.activity = pruneActivity(data.activity);

    await putDataFile(
      data,
      sha,
      `chore(data): ${playerName} ${winner === 'player' ? 'won' : 'lost'} a ${mode} round`
    );
    return data;
  }

  // Concurrent writers racing to commit the same file will 409/422 on a
  // stale `sha`. Refetch + retry a few times with jitter before giving up —
  // a single retry isn't enough once multiple people play at once, and a
  // silent failure here is exactly what makes rounds "vanish" server-side
  // while still looking fine in the player's own local UI.
  const MAX_ATTEMPTS = 5;

  try {
    let data;
    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        data = await applyUpdate();
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (err.status === 409 || err.status === 422) {
          const backoff = 60 + Math.random() * 120 * attempt;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw err;
      }
    }
    if (lastErr) throw lastErr;

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, configured: true, ...data });
  } catch (err) {
    console.error('[api/record] failed:', err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ ok: false, error: 'Failed to record round' });
  }
};

