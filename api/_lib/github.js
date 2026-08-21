/* ============================================================
   GitHub Contents API helper — reads/writes a JSON file in this
   repo so the live leaderboard is shared across ALL visitors,
   not just one browser. Requires these Vercel env vars:

     GITHUB_TOKEN   — a token with "contents: write" access to
                      this repo (fine-grained PAT recommended)
     GITHUB_OWNER   — repo owner/org, e.g. "Joeljozzz"
     GITHUB_REPO    — repo name, e.g. "demo-quantum"
     GITHUB_BRANCH  — branch to commit to (default: "master")

   Never commit the token itself — set it in the Vercel project
   dashboard under Settings → Environment Variables.
   ============================================================ */

const OWNER = process.env.GITHUB_OWNER || '';
const REPO = process.env.GITHUB_REPO || '';
const BRANCH = process.env.GITHUB_BRANCH || 'master';
const TOKEN = process.env.GITHUB_TOKEN || '';
const DATA_PATH = process.env.GITHUB_DATA_PATH || 'data/live-board.json';

const API_BASE = 'https://api.github.com';

function isConfigured() {
  return Boolean(TOKEN && OWNER && REPO);
}

function assertConfigured() {
  if (!isConfigured()) {
    const err = new Error(
      'GitHub sync is not configured. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO in your Vercel project env vars.'
    );
    err.code = 'NOT_CONFIGURED';
    throw err;
  }
}

async function githubRequest(path, options = {}) {
  assertConfigured();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`GitHub API error ${res.status}: ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

function defaultData() {
  return { leaderboard: [], activity: [], lastCleanupAt: null };
}

/** Fetch the current data file + its sha (needed to update it). */
async function getDataFile() {
  try {
    const json = await githubRequest(
      `/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${encodeURIComponent(BRANCH)}`
    );
    const content = Buffer.from(json.content, 'base64').toString('utf-8');
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = defaultData();
    }
    return { data: { ...defaultData(), ...parsed }, sha: json.sha };
  } catch (err) {
    if (err.status === 404) {
      return { data: defaultData(), sha: null };
    }
    throw err;
  }
}

/** Commit an updated JSON file back to the repo. */
async function putDataFile(data, sha, message) {
  const body = {
    message: message || 'chore(data): update live board',
    content: Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  return githubRequest(`/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

module.exports = {
  isConfigured,
  getDataFile,
  putDataFile,
  defaultData,
  DATA_PATH,
  OWNER,
  REPO,
  BRANCH,
};

