# ⚛ The Penny Game — Classical vs Quantum

A polished interactive web app demonstrating **Meyer's Quantum Penny Game** (1999) with a clean, light-first Mettler Toledo-inspired UI.
Register your name, play the classical or quantum version, and watch the live board update in real time across open tabs.

## 🎮 Pages

| Page | Description |
|------|-------------|
| `index.html` | Landing page — intro & explanation |
| `classical.html` | Classical game: You vs random computer (~50% each) |
| `quantum.html` | Quantum game: You vs Hadamard strategy (~100% quantum win) |

## ✨ What’s New

- Clean navy/teal light theme with a more professional, Claude-like layout
- Name registration flow on every page
- **Cross-user live leaderboard** — tracks every visitor's results, not just your own browser
- Live activity feed of recent rounds across all players
- Round tracking per player and per game mode
- Hourly cleanup of stale activity (server-side + local fallback)
- Theme toggle still available for dark mode

## 🌍 Cross-user live tracking (multiple people, one leaderboard)

By default (no setup), the live board only syncs across tabs in the *same*
browser via `localStorage` + `BroadcastChannel` — good enough for a solo demo,
but it won't show other people's results.

To make the leaderboard **actually shared across everyone who plays the app**,
this repo includes serverless API routes (`/api/leaderboard`, `/api/record`,
`/api/cleanup`) that read and write a real JSON file — `data/live-board.json`
— committed straight to this git repo using the GitHub Contents API. Every
finished round becomes a small commit, so the whole history of plays is
visible and versioned in git.

### Setup (takes ~2 minutes)

1. **Create a GitHub token** with write access to this repo:
   - Fine-grained PAT (recommended): GitHub → Settings → Developer settings →
     Fine-grained tokens → generate one scoped to just this repo with
     **Contents: Read and write** permission.
   - Or a classic PAT with the `repo` scope.
2. In your **Vercel project** → Settings → Environment Variables, add:

   | Name | Example value |
   |------|----------------|
   | `GITHUB_TOKEN`  | `github_pat_...` (the token from step 1) |
   | `GITHUB_OWNER`  | `Joeljozzz` |
   | `GITHUB_REPO`   | `demo-quantum` |
   | `GITHUB_BRANCH` | `master` |

3. Redeploy. The "Live leaderboard" panel on every page will switch from
   *"Local device only"* to *"Live · synced across all players"* automatically
   — the app checks `/api/leaderboard` on load and polls it every ~8s.

If these env vars aren't set, the app **still works perfectly** — it just
quietly falls back to the local, per-browser leaderboard instead of erroring.

### Hourly cleanup

`vercel.json` schedules `/api/cleanup` to run hourly via Vercel Cron. Note:
on Vercel's free **Hobby** plan, Cron Jobs currently execute **at most once
per day** (a platform limit, not something this code controls). As a safety
net, `/api/record.js` also runs the same prune logic inline whenever more
than an hour has passed since the last cleanup — so stale activity (>24h
old) still gets cleared out even without paid Cron access.

## 🧠 The Game Rules

1. Coin starts **Heads** (`|0⟩`)
2. **You** make a secret move: *Flip* or *Keep*
3. **Computer** makes a move
4. **You** make a second secret move
5. Reveal — **Heads = You Win**, **Tails = Computer Wins**

### Classical Computer
Picks randomly → both sides win ~50% of the time.

### Quantum Computer (Meyer's Strategy)
1. Applies **Hadamard gate H** → coin enters superposition `(|0⟩ + |1⟩)/√2`
2. You apply classical move (X or I)
3. Applies **H again** → always collapses to `|0⟩` = **Heads**

No matter what classical move you make, the quantum strategy wins.

## 🚀 Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option 2: Vercel Dashboard
1. Push to GitHub: `git remote add origin <your-repo-url> && git push -u origin main`
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. No build settings needed — it's a static site!

## 💻 Run Locally
```bash
npm install
npm run dev
# Visit http://localhost:3000
```

> `npm run dev` serves static files only — `/api/*` routes won't work with
> plain `serve`. To test the live server sync locally, install the Vercel
> CLI and run `npm run dev:api` (`vercel dev`) instead, with the env vars
> from the section above set in a local `.env` file or your shell.

## 📁 Project Structure
```
game_demo/
├── index.html        # Landing page
├── classical.html    # Classical penny game
├── quantum.html      # Quantum penny game
├── api/
│   ├── _lib/github.js  # GitHub Contents API helper (not a route)
│   ├── leaderboard.js  # GET  — fetch the shared live board
│   ├── record.js       # POST — record a finished round
│   └── cleanup.js      # Hourly cron — prune stale activity
├── data/
│   └── live-board.json # The shared leaderboard/activity, committed via git
├── css/
│   └── styles.css    # Shared styles (light-first navy/teal theme)
├── js/
│   ├── common.js     # Shared: particles, storage, live board, theme, cleanup
│   ├── classical.js  # Classical game logic
│   └── quantum.js    # Quantum state + game logic
├── package.json
├── vercel.json       # Vercel config: static + API functions + cron
└── .gitignore
```

## 📚 Reference
- D.A. Meyer, *"Quantum Strategies"*, Physical Review Letters 82, 1052 (1999)
- [Wikipedia: Quantum game theory](https://en.wikipedia.org/wiki/Quantum_game_theory)

