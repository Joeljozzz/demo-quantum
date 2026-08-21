/* ============================================================
   GET /api/leaderboard
   Returns the current cross-user leaderboard + activity feed,
   read straight from data/live-board.json in this git repo.
   ============================================================ */

const { getDataFile, isConfigured } = require('./_lib/github');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  if (!isConfigured()) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: false, configured: false, leaderboard: [], activity: [] });
    return;
  }

  try {
    const { data } = await getDataFile();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ ok: true, configured: true, ...data });
  } catch (err) {
    console.error('[api/leaderboard] failed:', err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ ok: false, error: 'Failed to load live board' });
  }
};

