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

Plain HTML + CSS + vanilla JS. **No build step, no dependencies.** Fonts via Google
Fonts. That keeps GitHub Pages deployment trivial.

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
