# ⚛ The Penny Game — Classical vs Quantum

A polished interactive web app demonstrating **Meyer's Quantum Penny Game** (1999) with a clean,
light-first Mettler Toledo-inspired UI. Play the classical or quantum version, right from your
phone, tablet, or desktop.

## 🎮 Pages

| Page | Description |
|------|-------------|
| `index.html` | Landing page — intro & explanation |
| `classical.html` | Classical game: You vs random computer (~50% each) |
| `quantum.html` | Quantum game: You vs Hadamard strategy (~100% quantum win) |

## ✨ Highlights

- Clean navy/teal light theme with a professional, minimal layout
- Fully mobile-friendly: responsive nav, touch-sized buttons, adaptive layout down to small phones
- Lighter particle background + confetti effect on mobile for smooth performance
- Round tracking and history per player, stored locally on-device
- Theme toggle for dark mode

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

## 📁 Project Structure
```
game_demo/
├── index.html        # Landing page
├── classical.html    # Classical penny game
├── quantum.html      # Quantum penny game
├── css/
│   └── styles.css    # Shared styles (light-first navy/teal theme, mobile-first)
├── js/
│   ├── common.js     # Shared: particles, storage, theme
│   ├── classical.js  # Classical game logic
│   └── quantum.js    # Quantum state + game logic
├── package.json
├── vercel.json       # Vercel config: static hosting + security headers
└── .gitignore
```

## 📚 Reference
- D.A. Meyer, *"Quantum Strategies"*, Physical Review Letters 82, 1052 (1999)
- [Wikipedia: Quantum game theory](https://en.wikipedia.org/wiki/Quantum_game_theory)



