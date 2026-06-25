# Kineviz — scroll-driven story site

A single-page, zero-build recreation of [kineviz.com](https://www.kineviz.com) that
uses scroll-driven effects to *tell the stories* behind GraphXR — real case studies
from law enforcement, gaming integrity, and fraud investigation.

## What's inside

- **Animated graph hero** — a live canvas network (purple / gold / teal nodes) that
  reacts to the cursor, echoing GraphXR's signature look.
- **Sticky word-reveal premise** — "meaning lives in the connections" lights up word
  by word as you scroll.
- **Four scroll-told case studies**, each with a bespoke canvas visual:
  1. Deplatforming an extremist network (network collapse animation)
  2. Dutch police OSINT → geospatial map (grid + drifting hotspots)
  3. Real-time gaming fraud at 40M events/day (streaming particles)
  4. Betting-ring collusion (radial graph with lit cross-links)
- **Animated stat counters**, the "3 minutes vs. 3 days" pull quote, a solutions
  grid, and a graph-backed CTA.
- Fully responsive, respects `prefers-reduced-motion`, pauses offscreen canvases.

## Tech

Static HTML + CSS + vanilla JS for the pages. The live graph visualizations are
real [`@kineviz/gl`](https://www.npmjs.com/package/@kineviz/gl) `GraphCanvas` React
scenes (`gl-src/`), bundled with esbuild into `assets/gl/bundle.js`. The bundle is
**built locally and committed**, so GitHub Pages still just serves static files —
no build or npm token needed in CI.

## Live graph scenes (`gl-src/`)

Each embed on the home page mounts a React scene from `gl-src/scenes/` into a
`.gl-mount` element (see `gl-src/index.tsx`): a cyber-threat globe, a real flight
network, Louvain communities, focus-&-context, and the PaySim fraud investigation.
Runtime data lives in `assets/data/`.

`@kineviz/gl` is a **private** package — `npm install` needs npm auth for the
`@kineviz` org (`.npmrc` scopes it to the npm registry; the token stays in
`~/.npmrc`, never committed).

```bash
npm install          # @kineviz/gl + react + three (private; needs auth)
npm run build:gl     # rebuild assets/gl/bundle.js after editing gl-src/
# node scripts/shot.mjs <url> <out.png>   # headless WebGL screenshot (SwiftShader)
```

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`, which publishes the repo
root to GitHub Pages. Enable **Settings → Pages → Source: GitHub Actions** once.

---

*This is a tribute/demo build matching the spirit and content of kineviz.com.*
