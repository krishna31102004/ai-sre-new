# Glassbox SRE frontend: design spec (phase 1)

Single source of design truth for every builder brief. If a skill disagrees with this file, this file wins.
Direction: incident command center crossed with Linear and Vercel. One hero element per page, everything else quiet. Motion explains causality: alert, investigate, answer.

## 0. Global rules (apply to every brief)

- Stack stays React 18, Vite, Tailwind 3, Radix, lucide. Only new dependency: `motion` (import from `motion/react`). No GSAP, Lenis, Locomotive, Three.js, WebGL, lottie. Native scrolling only.
- Every number shown comes from `src/mockData.ts`. Never type a benchmark number into a component. Benchmark copy and the limitations list are not reworded.
- No em dashes in visible copy. No purple or pink gradients. Glass (backdrop blur) only on the nav and the hero proof card.
- Every animation has a `prefers-reduced-motion` fallback that shows the final state instantly (use `useReducedMotion()` from motion; the global CSS rule in `styles.css` stays).
- Animate only `transform` and `opacity` (plus SVG `pathLength`). Reserve layout space up front so nothing shifts.
- Accessibility: visible focus ring (existing 2px accent outline), AA contrast, one `h1` per page, ordered headings, `aria-label` on icon-only buttons, 44px minimum touch height under 900px.

## 1. Tokens

Colors (update the rgb triplets in `:root` of `styles.css`; keep the existing Tailwind names and add the new ones to `tailwind.config.js`):

| Token | Value | Use |
|---|---|---|
| `canvas` | `5 7 13` (#05070d) | page background |
| `panel` | `10 15 28` (#0a0f1c) | cards, tables |
| `elevated` | `15 22 38` (#0f1626) | raised rows, sheet |
| `line` | white, used at 7% (`border-white/[0.07]`), strong 12% | all borders |
| `accent` | `76 141 255` (#4c8dff) | the one blue: links, primary button, 100% figure |
| `healthy` | `52 211 153` (#34d399) | resolved, correct |
| `firing` | `248 113 113` (#f87171) | firing, wrong |
| `ink` | `230 237 247` (#e6edf7) | primary text |
| `ink-2` | `154 167 189` (#9aa7bd) | secondary text |
| `ink-3` | `124 137 163` (#7c89a3) | muted text, eyebrows (AA on canvas) |

`warning` stays as is, only for existing severity badges. Update `--line` to `rgba(255,255,255,0.07)` and `theme-color` to `#05070d`. Remove the fixed radial gradient layer in `Shell`; the canvas is flat.

Type:
- UI: Inter 400/500/600. Data: JetBrains Mono 400/500, always `tabular-nums`, 13px for table and inline data.
- Display (landing headlines and the 404 title only): **Instrument Serif 400**, self-hosted at `public/fonts/instrument-serif-400.woff2` (latin subset), `font-display: swap`, Tailwind family `display`. One weight.
- Landing `h1`: `clamp(44px, 6.4vw, 84px)`, line-height 0.98, tracking -0.02em. Landing `h2`: 36px (28px under 640), line-height 1.1, tracking -0.01em, display font.
- App page `h1`: Inter 600, 28px, tracking -0.02em. Body 15/24. Small 13/20.
- Eyebrow: 11px mono, uppercase, tracking 0.14em, `ink-3`. At most one per section.

Spacing: 4px base. Container `max-w-[1200px]`, side padding 24px (16px under 640). Landing sections: 96px vertical (64px under 768). Card padding 24 (16 mobile). Radius: cards 12px, controls 8px, pills full. Cards are `bg-panel` with a 7% border and no shadow; hover raises the border to 12%.

Motion:
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for everything. Export `EASE = [0.23, 1, 0.32, 1]` from `src/motion.ts` together with `DUR = { press: 0.12, fast: 0.16, base: 0.2, slow: 0.3 }`.
- Press: `scale(0.97)` over 120ms on buttons and button-like links. Hover: color and border only, 160ms.
- Maximum 300ms for all UI motion. Only the hero intro and the live demo may run longer.
- Entrances on scroll: opacity 0 to 1 and y 12 to 0, 300ms, once, `viewport={{ once: true, amount: 0.3 }}`. Staggers 60ms.

Brand motif, the signal line: an ECG-like SVG polyline (flat, small bump, one sharp spike, flat), stroke 1.5px `accent` at 60% with the spike segment in `firing`. Component `SignalLine` in `src/components/SignalLine.tsx` with props `variant: "hero" | "loader"`. Hero: draws once with `pathLength` 0 to 1 over 1.6s, then stays static. Loader: 120x16px, a 24px bright segment travels left to right every 1.2s (CSS `stroke-dashoffset`), used for pending lanes and `LoadingState`. Used nowhere else.

## 2. Shell and nav

- Header: sticky, 56px tall, `bg-canvas/70`, `backdrop-blur-md`, bottom border 7%. Inner container as above.
- Left: logo (keep the existing Signal icon tile at 28px and the wordmark "Glassbox SRE" in `ink`, Inter 600 15px), links to `/`.
- Links in this order: Overview `/`, Investigations `/investigations` (also active on `/investigations/:id`), Pipeline `/pipeline`, Benchmark `/benchmark`, Status `/status`. 14px Inter 500, `ink-2`, hover `ink`, active `ink`. No icons in desktop links.
- Active indicator: one shared pill behind the active link (`motion.span` with `layoutId="nav-active"`, `bg-white/[0.06]`, radius 8), 200ms, EASE.
- Right: demo pill, then a 36px GitHub icon button (`aria-label="View source on GitHub"`, opens https://github.com/krishna31102004/ai-sre-new in a new tab). Remove the "Read-only" badge.
- Demo pill (only when `DEMO_MODE`): replaces the two-line banner. 11px mono, `ink-2`, 7% border, full radius, 6px accent dot, text `Demo mode · sample data`. Radix tooltip: "Running on sample data. Full setup on GitHub." where "GitHub" links to the repo.
- Under 900px (add Tailwind screen `nav: "900px"`): links and GitHub button hide; a 40px menu icon button (`aria-label="Open menu"`) opens a Radix Dialog sheet from the right, width `min(320px, 86vw)`, `bg-elevated`, slide x 100% to 0 in 200ms, overlay black 60%. Rows 48px tall, 16px text, active row has the accent dot. Sheet also holds the GitHub link. Closes on navigation. The demo pill stays in the header and shortens to `Demo` under 480px.
- Routes: `/` landing, `/investigations` table, `/investigations/:id`, `/pipeline`, `/status`, `/benchmark`, `/system` redirects to `/status` (`<Navigate replace />`), `*` renders 404. Lazy-load every page except the landing page.
- Route transition: wrap routes in `AnimatePresence mode="wait"` keyed by pathname; enter opacity 0 to 1 and y 6 to 0 over 180ms, exit opacity to 0 over 120ms. Scroll to top on pathname change (not on hash change). Delete the old `.route-fade` class.
- `main`: on `/` it is full width with no padding (the landing page owns its sections). On other routes keep a 1200px container, 24px side padding, 32px top.

## 3. Landing page (`src/pages/LandingPage.tsx`)

Section order: Hero, Live demo, Why heuristics fail, Architecture, Numbers band, Stack chips, Footer. Each section component lives in `src/landing/`.

### 3a. Hero

- Height `min-h-[calc(100svh-56px)]`, capped at 760px on desktop, content vertically centered. Must fit one viewport at 1280x720 and 390x844.
- Backdrop (hero only): dot grid, 1px dots at 6% white on a 24px pitch, masked with a radial gradient so it fades out by 70% radius. Nothing else.
- Desktop (1024 and up): 12-column grid. Text in columns 1 to 7, proof card in columns 9 to 12, both centered vertically. The hero SignalLine spans the full container width, 48px tall, pinned 32px above the hero bottom.
- Under 1024: single column, proof card after the CTAs, SignalLine hidden under 640.
- Pill: `Autonomous incident response agent`, 12px mono, 7% border, full radius, 6px `healthy` dot.
- `h1`: "The on-call engineer's first five minutes, automated." Put these two alternatives in a code comment above it: "From alert to cited root cause before the pager is acknowledged." and "Every alert gets an investigation, not just a page."
- Subline (17px, `ink-2`, max width 560px): "When a Prometheus alert fires, Glassbox finds the bad commit, pulls the right runbook, computes real impact, and posts a cited brief to Slack."
- CTAs, 44px tall: primary `Watch it investigate` (solid accent, text #05070d, smooth-scrolls to `#demo`, instant under reduced motion); secondary `See the pipeline` (7% border, links `/pipeline`); text link `View on GitHub` with an arrow-up-right icon.
- Proof card (glass: `bg-white/[0.03]`, blur, 12% border, radius 16, padding 24): eyebrow `Commit top-1`; two columns. Left `100%` in 56px mono 600 `accent`; right `13.3%` in 56px mono 600 `ink-3`; under each a 2px bar on a 7% track whose fill width equals the value (accent, and `ink-3`); under the bars 12px labels `gpt-6-luna` and `deterministic heuristics`. Caption 12px `ink-2`: "gpt-6-luna vs deterministic heuristics, 15-scenario benchmark (15/15 in 4 of 4 runs)". Link `How we measured` to `/benchmark`. Under 640 the figures are 40px.
- Numbers and bars are at final value on first paint. No count-up, no fade on the card.
- Intro (allowed to exceed 300ms, total 900ms, runs once): pill at 0ms, headline as 3 line-level blocks staggered 70ms, subline at 250ms, CTA row at 350ms; each opacity 0 to 1 and y 12 to 0 over 500ms EASE. The SignalLine draws from 200ms. The proof card does not animate.

### 3b. Live investigation demo (`#demo`)

Section header: eyebrow `Replay of a recorded investigation`, `h2` "Watch one alert become an answer." Controls on the right of the header: `Replay` button (rotate-ccw icon) and a segmented `1x | 2x` toggle (`aria-pressed`).

Frame: one panel, radius 16, 7% border, `bg-panel`, padding 24. All four rows are in the layout from the start at fixed minimum heights; pending items render as dim outlines (7% border, 40% opacity) so nothing shifts.

- Row 1: alert card (left, 60%) and triage chip (right).
- Row 2: three lane cards in a 3-column grid (stacked under 768): `Commit correlation`, `Runbook RAG`, `Impact estimation`. Each has a title, a status line, and a result block.
- Row 3: synthesis bar, full width, 44px.
- Row 4: Slack-style brief card, with the threaded reply indented 32px beneath it.

Data: add one export `demoReplay` to `mockData.ts`, built from the existing investigation `ccfce077-9822-4ee7-ab97-ba56100c74fd` and its detail (no new facts). Add `const AD_TOTAL_REQUESTS = 5797` and interpolate it into the two existing strings that contain 5797 so the rendered text is unchanged.

Timeline at 1x (seconds; 2x halves every value). One clock drives everything: a `useReplayClock(speed)` hook using `requestAnimationFrame` that returns elapsed seconds; each element's state is derived from elapsed time.

| t | Beat |
|---|---|
| 0.0 | Alert card appears (opacity and y 8, 300ms): mono `OTelDemoAdServiceErrors`, `frontend`, red `firing` badge. A `firing` ring pulses twice from its dot (scale 1 to 2.4, opacity 0.5 to 0, 700ms each). |
| 1.2 | Connector to the triage chip draws (300ms). Chip shows the loader SignalLine and `Triage`. |
| 2.2 | Triage resolves: "Frontend ad failure with visible 500s". |
| 2.6 | All three lanes activate in the same frame: border goes to 12%, loader SignalLine runs in each, status `running`. |
| 4.8 | Commit lane resolves: mono `41080eb`, title "Seed frontend ad failure ground truth scenario", evidence line "frontend deployment preceded the alert by 15 minutes", green check. |
| 5.4 | Runbook lane resolves: mono `otel-demo.frontend-ad-failure`, `Signals`, score `0.98`. |
| 6.0 | Impact lane resolves: `8 / 5797 requests`, amber `ticket` severity badge. |
| 6.6 | Synthesis bar fills left to right (scaleX 0 to 1, 800ms), label `Evidence synthesis`, then `3 findings, each cited`. |
| 8.0 | Brief card slides in (y 16 to 0 and opacity, 400ms). Header: app avatar tile, `Glassbox SRE`, `APP` tag. Body: 5 lines from the stored brief (status, suspect commit, runbook, impact, confidence 0.90), revealed with a 60ms stagger. |
| 10.4 | Threaded reply appears (y 8 and opacity, 300ms): green check, `Resolved`, "Resolved webhook received after the alert window drained." |
| 12.0 | Hold on the final state. |
| 14.0 | End. Final state stays. `Replay` gets an accent border. |

Lane resolve order matches the recorded event order (commit, runbook, impact). Each resolve is a 200ms crossfade from the loader to the result.
Autoplay once when 40% of the frame is in view (`useInView`, `once`). Pause the clock when the tab is hidden. `Replay` restarts from 0. Reduced motion: render the final state at once, no autoplay, hide the speed toggle, keep `Replay` disabled with `aria-disabled`.

### 3c. Why heuristics fail

Eyebrow `Why heuristics fail`. `h2`: "Deterministic ranking ties. Reading the change resolves it." Sub (15px `ink-2`): "Three commits to the same service landed in the same window. Recency and service match score them identically."

Data: new export `heuristicTie` in `mockData.ts`, three rows with `score: 0.9`:
- `d56b8b31` "Seed frontend accessibility distractor", note `accessibility labels, benign`
- `41080eb5` "Seed frontend ad failure ground truth scenario", `correct: true`
- `bcc8aa32` "Seed frontend banner copy distractor", note `banner copy, benign`

One list of three rows (64px each, 8px gap, max width 760px): rank number, mono short SHA, title, score chip `0.90`. Column label above the list reads `Deterministic rank` at first.
Initial order: d56b8b31, 41080eb5, bcc8aa32. All three score chips identical in `ink-2`.
On scroll into view (60% visible, once) after a 600ms pause: rows reorder with motion `layout` (300ms EASE, 60ms stagger) to 41080eb5, d56b8b31, bcc8aa32. The correct row gets a 2px `healthy` left border and a green check with `ground truth`; the two distractors drop to 55% opacity and show their note. The column label crossfades to `After reading the diff`, rank numbers update. Score chips do not change. Reduced motion: render the reordered state directly.

### 3d. Architecture at a glance

Eyebrow `Architecture`. `h2`: "Six hops from alert to answer." One row of six nodes joined by 1px connectors with a small arrowhead: Prometheus, FastAPI, Redis, LangGraph, Postgres + pgvector, Slack. Node: 12px mono label, 7% border, radius 8, 40px tall, lucide icon 14px. The LangGraph node is taller and contains three stacked 6px bars labelled `3 parallel nodes`. Under 900px the row becomes a vertical list with connectors on the left. Below: link `Open the interactive pipeline` to `/pipeline`. Entrance: nodes fade in left to right, 60ms stagger, once.

### 3e. Numbers band

Full-width band with top and bottom 7% borders, four cells (2x2 under 768), divided by 7% vertical lines. Value 40px mono 600 `ink`; label 13px `ink-2`. From a new `landingStats` export derived from `benchmarkModes`:
- `100%`, "commit top-1 (15/15, 4 of 4 runs)"
- `100%`, "runbook hit"
- `100%`, "impact classification"
- `about $0.007`, "per full benchmark run" (derived by rounding the stored cost to 3 decimals)

Muted line under the band (13px `ink-3`): "1 live-captured and 14 synthetic-replay scenarios. See limitations." with "See limitations" linking to `/benchmark`. No count-up.

### 3f. Stack chips

One wrapped row, centered, of 12px mono chips (7% border, radius full, 28px tall, `ink-2`): Python, FastAPI, Redis, Postgres + pgvector, LangGraph, OpenAI gpt-6-luna, Slack Bolt, Prometheus, OpenTelemetry, React. No icons, no hover effect.

### 3g. Footer

Top border 7%, padding 40px. Left: wordmark and "Built by Krishna Balaji" linking to a `LINKEDIN_URL` constant declared at the top of `LandingPage.tsx` (placeholder `https://www.linkedin.com/`, with a comment that it is editable). Middle: links to Overview, Investigations, Pipeline, Benchmark, Status. Right: GitHub link and the note "Demo mode: this site runs on recorded sample data." 13px `ink-3`.

## 4. Benchmark page (restyle only)

Keep every string and number exactly as rendered today, including the header, the two-sentence summary, the footnote line and the six limitations.
- Delete `useCountUp`. Values render final on first paint, derived from `benchmarkModes` (top-1 of the gpt-6-luna row and of the replay-fast row, formatted with the existing `metric` helper).
- Scoreboard hero: one panel, two halves split by a 7% vertical line (stacked under 768). Each half: figure in mono 600 at `clamp(64px, 11vw, 128px)`, line-height 1; `100.0%` in `accent`, `13.3%` in `ink-3`; a 2px bar under each (fill equals the value); the existing caption text under the bar. Bars may grow from scaleX 0 to 1 in 300ms on mount; figures do not animate.
- Comparison table: header row 11px mono uppercase `ink-3`, no wrapping, no clipped headers. The gpt-6-luna row gets `bg-accent/[0.06]` and a 2px accent left border. Render the "(baseline)" part of the gpt-4.1-mini label as a small badge (same words, same row). First column sticky on the left under 768 with a `bg-panel` background and a right border. Remove the row fade-in delay. Table scrolls horizontally inside its card only.
- Limitations: a compact footnote block, 13px/20px `ink-2`, max width 760px, items (a) to (f) as a list with hanging letters, heading `Limitations` in eyebrow style.

## 5. 404

Centered in the viewport below the nav. Flat SignalLine (no spike) 160px wide in `ink-3`, mono `404` 13px, display-font title "No alert fired here." at 44px, sub "This route does not exist." and two buttons: `Overview` (primary) and `Investigations` (secondary).

## 6. Pipeline overflow fix (only change allowed in `PipelinePage.tsx`)

The diagram's natural size stays 1100x648. Wrap the existing grid in a scaler: measure the available inner width with a `ResizeObserver`; at 768px viewport and up apply `transform: scale(s)` with `transform-origin: top left`, where `s = min(1, available / natural width including the row-label gutter)`, and set the wrapper height to `648 * s` so no horizontal scroll or clipping occurs. If the connector layout reads DOM rects, divide them by `s` so connectors stay aligned; change nothing else about nodes, overlay or connectors. Under 768: no scaling, the diagram sits in a bordered (12%) rounded region with `overflow-x: auto`, and a 12px `ink-3` note above it: "Best viewed on desktop. Scroll sideways to explore."

## 7. Meta and OG

- `index.html`: title `Glassbox SRE · Autonomous incident response agent`. Description (under 160 chars): "Autonomous incident response agent. Finds the bad commit, runbook and impact for a Prometheus alert. 100% vs 13.3% commit top-1 on a 15-scenario benchmark."
- Open Graph and Twitter (`summary_large_image`) tags with `/og.png`, 1200x630. Keep `favicon.svg`. Add `apple-touch-icon.png` (180x180: canvas background, the logo tile centered).
- Fonts: Inter 400/500/600 and JetBrains Mono 400/500 via the existing Google Fonts link with `display=swap`. Preload only `/fonts/instrument-serif-400.woff2`.
- OG image: a lazy hidden route `/og` renders a fixed 1200x630 frame on canvas: logo and wordmark top left, the headline in the display font at 76px, bottom left `100%` (accent) and `13.3%` (`ink-3`) in mono 88px with their labels, the hero SignalLine along the bottom. Numbers come from `mockData.ts`. Capture it to `public/og.png` with headless Chrome.

## 8. Budgets

Lighthouse desktop performance 90 or higher, FCP under 1.5s, CLS 0, added JS under 120 KB gzip. `npm run build` passes with zero TypeScript errors. No horizontal scroll or overlap at 390, 768, 1024, 1280, 1440.

## 9. Phase 2

Sections 0, 1 and 8 still apply. Model scores are always labelled "pre-rank score", never "confidence". No visible copy contains "Seed", "distractor" or "ground truth"; commit text is always the human summary from `commitLabel(sha)` with the raw title in the `title` attribute.

### 9a. Shared primitives (`src/components/primitives.tsx`, built in P1, reused by P2 to P4)

- `Panel`: `bg-panel`, 1px `line` border, radius 12, padding 20 (16 under 768).
- `Eyebrow`: 11px mono uppercase, tracking 0.08em, `ink-3`.
- `StatusDot`: 6px dot plus 12px mono uppercase label. firing: `firing` colour, dot opacity pulses 1 to 0.4 over 2s (static under reduced motion). resolved: `healthy`. Anything else: `ink-3`.
- `ServiceChip`: 22px tall, 12px mono `ink-2`, 1px `line` border, radius 6, 8px side padding.
- `ScoreBar`: 48px by 2px track (white 7%), `accent` fill, then the number in 12px mono with 2 decimals. Props `value`, `label` (default "pre-rank score", used as aria-label and `title`).
- `CommitSummary`: 7-char SHA in 12px mono `accent`, then the summary in 14px `ink`, single line, truncated.
- `FilterChips`: 28px pills, 12px, 1px `line` border, `ink-2`; selected is `bg-white/[0.08]` and `ink`; `aria-pressed`; `.press`; optional count in `ink-3`.
- Focus everywhere: `focus-visible` 2px `accent` ring, 2px offset.
- Page heading on every app page: display font 32px (26px under 768), then one 14px `ink-2` subtitle.

### 9b. Investigation detail

Order, top to bottom:

1. Back link "Investigations" with a left arrow, 13px `ink-3`.
2. Header: alert name as the page heading. Below it one wrapping row: `StatusDot`, `ServiceChip`, then 12px mono `ink-3` "Started {time} · Resolved {time} · Duration 6m 14s". Firing: "Started {time} · Not resolved", no duration. The disabled Slack and LangSmith buttons with their tooltips sit at the right (below the row under 768).
3. Tabs: Brief, Timeline, Raw. Text tabs, 13px, 40px tall, a bottom 1px `line`; the active tab is `ink` with a 2px `accent` underline that slides (`layoutId`, 200ms, instant under reduced motion). Arrow keys move between tabs. State lives in `?tab=`. Tab content swaps with no animation.

Brief tab:

- Suspect commit hero: `bg-elevated` panel, 2px `accent` left border, padding 24. Left: Eyebrow "Suspect commit", 14px mono SHA, the summary in the display font at 28px (20px under 768), then "Top evidence": up to 3 evidence lines from the top finding, each an 11px mono `ink-3` kind tag, a 13px `ink-2` summary and a 12px mono `ink-3` reference. Right, 200px wide (stacked below under 768): the score in mono 40px `ink`, label "pre-rank score", a full-width 2px bar, then a validation badge (validated: `healthy` outline; otherwise `ink-3` outline).
- No candidates: same panel with a dashed border and no accent: "No commit candidates in the lookback window." and "The agent reports that instead of guessing."
- Three finding cards, equal height, 3 columns from 1024, 1 column below, gap 16:
  - Commit correlation: "{n} candidates ranked", then up to 3 rows in the HeuristicTie row style (`CommitSummary` plus `ScoreBar`); the top row carries a 2px `healthy` left bar.
  - Runbook: runbook id in 14px mono `ink`, "Section: {section}", `ScoreBar` with label "retrieval score". Empty: "No runbook matched."
  - Impact: three stat blocks in a row (label 11px mono `ink-3`, value 24px mono `ink`): Error rate, Affected requests, Severity. Under Error rate a 2px bar scaled 0 to 5% with the caption "scale 0 to 5%". Severity "page" is `firing`, anything else `ink-2`.
- Replay strip: a Panel. Header: "Replay this investigation", the 11px mono `ink-3` label "Replay, timing compressed", and a secondary Replay button on the right. Body: three lanes (Commits, Runbook, Impact) using the exported `Lane` from `LiveDemo.tsx`, pending until the lane's first event, running until its last, then showing the same value as its finding card. Under the lanes a 2px progress line with a tick per event at its proportional position, and the current event's summary in 13px `ink-2` with its real offset ("+2.4s"). Use the stored event timestamps from the first event to the last one before `resolved`, scaled linearly to 8s. Starts at 30% in view. Reduced motion: final state, no clock.

Timeline tab: a 1px `line` rail with 8px dots (`firing` for the alert, `healthy` for resolved, `accent` otherwise). Each row: a 72px column with the offset from the first event in 12px mono `ink-3` ("+0.0s", "+6m 14s"), the event label in 14px `ink`, the summary in 13px `ink-2`, the source as a `ServiceChip`, the reference in 12px mono. No entrance animation.

Raw tab: a terminal block (`bg-canvas`, 1px `line`, radius 12). Header bar: "rendered brief" in 11px mono `ink-3` and a Copy button that switches to a check for 1.5s. Body: `pre` in 13px/22px mono `ink-2`, wrapping. No fake window dots.

### 9c. Investigations table

- The metric cards become one quiet strip: a single Panel, 4 cells split by `line` dividers (2 by 2 under 768), label 11px mono `ink-3`, value 20px mono `ink-2`. No accent colour.
- Filter row: `FilterChips` All, Firing, Resolved with counts, a 1px by 16px divider, then service chips ("All services" plus each service). Wraps.
- Table from 768: 52px rows. Columns: Status (`StatusDot`), Alert (name in 14px `ink` 500, then `ServiceChip`), Suspect commit (`CommitSummary`), Pre-rank score (`ScoreBar`), Started (relative, absolute in `title`). Header 11px mono uppercase `ink-3`. Firing rows carry a 2px `firing` left border. The whole row is one link; hover is `bg-white/[0.03]` in 120ms and reveals a right chevron in `ink-3`; focus ring inset.
- Under 768: each row is a Panel card. Line 1: `StatusDot` and relative time. Line 2: alert name in 15px. Line 3: `ServiceChip`. Line 4: `CommitSummary`. Line 5: `ScoreBar`.
- Empty: a flat SignalLine 120px wide in `ink-3`, "No investigations match these filters." and a "Clear filters" button. Loading: 5 static 52px skeleton rows with `bg-white/[0.04]` blocks, no shimmer.

### 9d. Benchmark drilldown

Placed under the comparison table and above Limitations. Eyebrow "All 15 scenarios", sub "First pick per mode. Expand a row for the ranked candidates.", then `FilterChips`: All, Heuristics missed, Mini missed, with counts.

- Row, 52px, a full-width button with `aria-expanded`: chevron (rotates 90 degrees in 200ms), the readable title in 14px `ink` with the scenario id under it in 11px mono `ink-3` (id hidden under 768), a "live" badge (`healthy` outline) or "synthetic" badge (`ink-3` outline), then three fixed 88px mode columns headed replay-fast, gpt-4.1-mini and gpt-6-luna (56px columns headed RF, MINI and LUNA under 768). Each cell: a 16px check in `healthy` or an x in `firing`, with an aria-label. The luna cell adds "{n}/4" in 11px mono. If a per-scenario pick is not in the artifacts, show a dash in `ink-3` with the title "not recorded". Never infer one.
- Expanded: height and opacity over 200ms (instant under reduced motion); several rows may be open. Content sits on `bg-canvas` and lists the ranked candidates in the HeuristicTie row style: rank, `CommitSummary`, `ScoreBar`, then small tags for each mode that picked it and an "actual cause" tag in `healthy` on the right commit.

### 9e. Status and Pipeline

Tokens and polish only. Both get the 9a page heading, `Panel` surfaces, Eyebrow labels and the focus ring. Status: each dependency row uses `StatusDot` (ok is `healthy`, down is `firing`) with values in 12px mono; fault-control buttons get `.press` and a hover of `bg-white/[0.06]`. Pipeline: header, note and outer panel borders move to the tokens. Nodes, overlay, connectors and fault-control behaviour are untouched.
