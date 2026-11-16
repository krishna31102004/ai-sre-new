# Frontend revamp audit (phase 1, 2026-11-15)

Design source of truth: `DESIGN_SPEC.md`. This file records what the audit found, what changed per page, and what was deliberately left alone.

## Findings before the revamp

- No landing page. `/` opened directly on the investigations table, so a first-time visitor saw a dashboard with no explanation.
- The benchmark hero counted up from 0, so the first paint showed 0.0% for both figures.
- The nav scrolled sideways on narrow screens and a two-line demo banner pushed content down.
- The pipeline diagram had a fixed 1100px width and forced horizontal scrolling below about 1200px.
- No catch-all route, no meta description, no Open Graph image.
- The eyebrow style, accent blue and a page-wide radial gradient were used on every section, so nothing stood out.

## What changed per page

- **Shell and nav:** new 56px glass header with Overview, Investigations, Pipeline, Benchmark, Status, an animated active pill and a GitHub button. Under 900px it collapses into a Radix Dialog sheet. The demo banner is now a slim pill with a tooltip. Routes fade in 180ms and scroll to top. Pages other than the landing page are lazy-loaded.
- **Landing (`/`, new):** hero with proof card, recorded investigation replay (14s, replay and 1x/2x controls), heuristic tie strip, architecture row, numbers band, stack chips, footer. Every figure comes from `mockData.ts`.
- **Investigations:** moved to `/investigations`. Content unchanged; it inherits the new tokens.
- **Benchmark:** same copy and numbers. Figures render final values on first paint. Scoreboard hero, highlighted gpt-6-luna row, "baseline" badge, sticky first column on mobile, compact limitations block.
- **Pipeline:** overflow fix only. The diagram scales to its container from 768px up; below that it sits in a bordered scroll region with a note. It also inherits the new accent blue and easing through shared tokens.
- **404 (new):** "No alert fired here." with links to Overview and Investigations. `/system` redirects to `/status`.
- **Meta:** title, description, Open Graph and Twitter tags, `og.png` (1200x630), `apple-touch-icon.png`, trimmed font weights, one preloaded display font.

## Bundle

Main JS chunk: 107.30 kB gzip before, 157.22 kB gzip after, so about 49.9 kB added against a 120 kB budget. The only new dependency is `motion`. The self-hosted Instrument Serif file is 21 kB.

## Chosen not to do

- No GSAP, smooth-scroll library, Three.js, WebGL or lottie.
- No Tailwind 4 or shadcn CLI v4 migration.
- No changes to pipeline nodes, overlay or connectors, and no redesign of the investigation detail or status pages (phase 2).
- No count-up animation on any number.
- The "Read-only" nav badge was removed to keep the nav from clipping.

## Not verified in this phase

- Lighthouse was not run, so the performance score, FCP and layout-shift budgets are unmeasured.
- Widths 768, 1024 and 1440 were checked only for the hero and the pipeline diagram, not for every page.
- The post-build animation audits and a second `improve-ui` pass were skipped by decision.

## Open items

- `LINKEDIN_URL` in `src/pages/LandingPage.tsx` is a placeholder (`REPLACE_ME`).
- The `/og` capture route is unlinked but has no `noindex`.
- The replay clock clamps each frame to 0.1s, so the replay does not finish under headless capture tools; it runs normally in a real browser.
