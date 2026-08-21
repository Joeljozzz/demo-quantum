# ⚛ The Penny Game — Classical vs Quantum

A beautiful interactive web app demonstrating **Meyer's Quantum Penny Game** (1999).
Play the classical version, then watch a quantum computer win every time using Hadamard gates.

## 🎮 Pages

| Page | Description |
|------|-------------|
| `index.html` | Landing page — intro & explanation |
| `classical.html` | Classical game: You vs random computer (~50% each) |
| `quantum.html` | Quantum game: You vs Hadamard strategy (~100% quantum win) |

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
│   └── styles.css    # All styles (dark space theme)
├── js/
│   ├── common.js     # Shared: particles, storage, coin utils
│   ├── classical.js  # Classical game logic
│   └── quantum.js    # Quantum state + game logic
├── package.json
├── vercel.json       # Vercel static site config
└── .gitignore
```

## 📚 Reference
- D.A. Meyer, *"Quantum Strategies"*, Physical Review Letters 82, 1052 (1999)
- [Wikipedia: Quantum game theory](https://en.wikipedia.org/wiki/Quantum_game_theory)

