# Acydon Pulse — Real-Time Background Job Observability

**Acydon Pulse** is a premium, high-fidelity developer landing page and interactive observability console designed for modern background job queues (e.g., Sidekiq, Celery, BullMQ). It gives engineers instant visibility into background task arguments, execution latency, and SQL query performance in real-time.

Built as part of the **Acdyon Technologies Frontend Engineering Challenge** (Part 2: The Premium Home Page), the project focuses on taste, clean typography, responsive design, and honest product demonstration over fabricated marketing claims.

---

## 🚀 Live Demo & Interaction Video
* **Walkthrough Recording**: The visual flow showing browser testing, telemetry details, and the retro override console can be viewed in the walkthrough log inside the artifact folder.
* **Vite Preview**: Run locally using the guide below to interact with the queue.

---

## ✨ Key Features

1. **Integrated Real-Time Queue Simulator**:
   - A live ticker simulator that feeds job logs (successes, warnings, failures) dynamically.
   - Live metrics calculations including total jobs processed, historical failure rates, and rolling average latency.
   - Adjustable stream controls (1x speed, 2x speed, Pause).

2. **Telemetry Details & SQL Profiling**:
   - Clicking any active task row in the console (such as the failed `UpdateSubscription` task) displays deep contextual arguments, attempt counts, and the exact database queries that were executed during the lifecycle.
   - Designed to address the "black box background queue" developer pain point directly.

3. **Restrained, Premium Polish**:
   - Elegant dark theme built around a deep charcoal background with glowing gradients, backdrop blur navigations, and clean margins.
   - Strictly responsive, tested to look shipped on both `390px` mobile screens and `1440px` desktop viewports.

4. **Retro System Override Easter Egg**:
   - Focus the browser window and type the classic Konami code sequence: `↑ ↑ ↓ ↓ ← → ← → B A`.
   - Unlocks a fully interactive terminal overlay complete with canvas Matrix-style digital rain, custom system diagnostics command prompts, and crash logs.

---

## 🛠️ Local Development & Scaffolding

This project is built using a modern bundle system with Vanilla JS and CSS for optimal load speeds, SEO indexing, and ease of deployment.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (installed automatically with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Madhavhk04/Acydon-Pulse.git
   cd Acydon-Pulse
   ```
2. Install local development tools:
   ```bash
   npm install
   ```

### Command Scripts
* **Local Dev Server**: Launches Vite server on your local port (default is `http://localhost:5173/`):
  ```bash
  npm run dev
  ```
* **Production Build**: Compiles static, highly optimized HTML, JS, and CSS files into a `/dist` directory for easy hosting on Vercel, Netlify, or Github Pages:
  ```bash
  npm run build
  ```
* **Build Preview**: Spin up a local server to test the built production bundle:
  ```bash
  npm run preview
  ```

---

## 📁 File Structure
```
├── README.md               # Main instructions and setup documentation
├── DECISIONS.md            # Challenge decisions document (design, trade-offs, AI verify)
├── index.html              # Entry semantic HTML5 template and layout
├── package.json            # Vite scripts and workspace configurations
├── src/
│   ├── main.js             # Simulation engine, tab code copier, easter egg, and interaction listeners
│   ├── style.css           # Premium HSL color scheme variables, animation keyframes, and media queries
│   └── assets/             # Brand logos, icons, and SVG graphic buffers
└── public/                 # Static favicon and icon sets
```

---

## 🛠️ Design & Tech Stack Choices
- **Build Tool**: Vite (Vanilla Javascript template)
- **Styling**: Vanilla CSS (no TailwindCSS or heavy UI frameworks, keeping payload sizes negligible and ensuring maximum flexibility)
- **Aesthetics**: Outfit/Plus Jakarta Sans typography, custom SVGs to bypass external asset latencies, HSL tailormade colors, and glassmorphic elements.
- **Observability Logic**: Deterministic JS state machine loops demonstrating real developer APM console views.
