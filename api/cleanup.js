/* ============================================================
   GET /api/cleanup
   Prunes stale activity (>24h) and trims the leaderboard,
   committing the change back to data/live-board.json.

   Invoked hourly by the Vercel Cron in vercel.json. Note: on
   Vercel's free "Hobby" plan, Cron Jobs currently only run once
   per day — that's a platform limit, not something this code
   controls. As a safety net, /api/record.js also runs this same
   cleanup opportunistically on every recorded round if an hour
   has passed since the last cleanup, so stale data is nudged out
   even without Cron access.
   ============================================================ */

const { getDataFile, putDataFile, isConfigured } = require('./_lib/github');

const LEADERBOARD_LIMIT = 12;
const ACTIVITY_LIMIT = 30;
const ACTIVITY_TTL_MS = 24 * 60 * 60 * 1000;

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

module.exports = async function handler(req, res) {
  if (!isConfigured()) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: false, configured: false });
    return;
  }

  try {
    const { data, sha } = await getDataFile();
    const beforeLeaderboard = JSON.stringify(data.leaderboard);
    const beforeActivity = JSON.stringify(data.activity);

    data.leaderboard = pruneLeaderboard(data.leaderboard);
    data.activity = pruneActivity(data.activity);

    const changed =
      beforeLeaderboard !== JSON.stringify(data.leaderboard) ||
      beforeActivity !== JSON.stringify(data.activity);

    if (changed) {
      data.lastCleanupAt = new Date().toISOString();
      await putDataFile(data, sha, 'chore(data): hourly cleanup of live board');
    }

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, configured: true, changed, lastCleanupAt: data.lastCleanupAt });
  } catch (err) {
    console.error('[api/cleanup] failed:', err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ ok: false, error: 'Cleanup failed' });
  }
};

