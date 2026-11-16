# Glassbox SRE type, colour and spacing system

Exact spec. Where this file and `DESIGN_SPEC.md` disagree on fonts, text sizes, text colours, spacing, borders or casing, this file wins. Motion, layout structure, copy and data rules in `DESIGN_SPEC.md` still apply. Reference look: Linear and Vercel (restrained, typographic, high contrast, generous spacing).

"Mobile" means viewport under 768px. "Desktop" means 768px and up.

## 1. Font roles

| Family | Files in `public/fonts/` | Weights | Used for |
|---|---|---|---|
| Instrument Serif | `instrument-serif-400.woff2` (exists) | 400 | ONLY the landing hero headline in `src/landing/Hero.tsx`, and the same headline inside `src/pages/OgPage.tsx`. Nowhere else. Do not change how the hero headline looks. |
| Geist | `geist-400.woff2`, `geist-500.woff2`, `geist-600.woff2` | 400, 500, 600 | Everything else: page titles, section titles, card titles, body, labels, buttons, badges, eyebrows, dates, times, statuses, table headers, nav, footer, tooltips. |
| Geist Mono | `geist-mono-400.woff2`, `geist-mono-500.woff2` | 400, 500 | ONLY commit SHAs, numbers and metrics, scores, code, file paths, and machine identifiers (scenario ids, runbook ids, feature-flag names, mode names such as `replay-fast` inside table cells). |

- Source: static woff2 files from the official `github.com/vercel/geist-font` repository (release assets, or the files in the repository at the latest release tag). Rename to the file names above. No npm dependency. If the static weights cannot be obtained from that repository, stop and report; do not use any other source.
- `@font-face` for each file in `src/styles.css`: `font-style: normal`, the single weight, `font-display: swap`.
- `index.html`: remove both Google Fonts `preconnect` links and the Google Fonts stylesheet link. Preload exactly three fonts: `/fonts/instrument-serif-400.woff2` (already there), `/fonts/geist-400.woff2`, `/fonts/geist-600.woff2`.
- Tailwind `fontFamily`: `display` unchanged; `sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"]`; `mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]`. Update `--font-ui` and `--font-mono` in `styles.css` to match. Inter and JetBrains Mono must not appear anywhere in the project.
- `body`: remove the Inter-only `font-feature-settings`. Every Geist Mono element gets `font-variant-numeric: tabular-nums`.
- No uppercase text anywhere on the site. Remove every `uppercase` class and every positive `tracking-[...]` value. Labels and statuses are written in sentence case ("Suspect commit", "Resolved", "Firing", "Pre-rank score", "Done", "Waiting").
- No italic. No weight above 600. Geist Mono never uses 600.

## 2. Type scale

Add these as Tailwind `fontSize` tokens (`text-<name>` for desktop, `text-<name>-m` for mobile where the size differs) and export one class string per step from `src/components/primitives.tsx` as `T.<name>` (for example `T.h1 = "font-sans font-semibold text-h1-m md:text-h1 text-ink"`). Pages use `T.*` only. No `text-[Npx]`, `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `leading-*` or `tracking-*` class may remain in any page or component, with three exceptions: the landing hero headline, `OgPage.tsx` (fixed 1200x630 canvas, sizes stay, fonts follow section 1), and anything inside the pipeline nodes, overlay and connectors.

| Step | Family | Size desktop / mobile | Weight | Line height desktop / mobile | Letter-spacing | Default colour |
|---|---|---|---|---|---|---|
| `display` | Instrument Serif | `clamp(36px, 4.4vw, 64px)` (unchanged) | 400 | 0.98 | -0.02em | `ink` |
| `h1` | Geist | 32px / 26px | 600 | 38px / 32px | -0.03em | `ink` |
| `h2` | Geist | 20px / 18px | 600 | 28px / 26px | -0.02em | `ink` |
| `h3` | Geist | 15px / 15px | 600 | 22px | -0.01em | `ink` |
| `lead` | Geist | 17px / 16px | 400 | 28px / 26px | -0.01em | `ink-2` |
| `body` | Geist | 14px / 14px | 400 | 22px | 0 | `ink-2` |
| `small` | Geist | 13px / 13px | 400 | 20px | 0 | `ink-2` |
| `label` | Geist | 12px / 12px | 500 | 16px | 0 | `ink-3` |
| `data` | Geist Mono | 13px / 13px | 400 | 20px | 0 | `ink` |
| `data-sm` | Geist Mono | 12px / 12px | 400 | 16px | 0 | `ink-3` |
| `data-lg` | Geist Mono | 24px / 22px | 500 | 30px / 28px | -0.02em | `ink` |
| `data-xl` | Geist Mono | 44px / 40px | 500 | 48px / 44px | -0.03em | `ink` |
| `data-hero` | Geist Mono | `clamp(64px, 11vw, 128px)` | 500 | 1 | -0.04em | per element |

Allowed modifiers, only where the mapping tables say so: "(500)" sets weight 500 on `body` or `small`; "(primary)", "(secondary)", "(muted)", "(accent)", "(healthy)", "(firing)", "(warning)" override the colour. Nothing else is overridden.

Base element rules in `styles.css`: `h1` uses the `h1` step, `h2` the `h2` step, `h3` the `h3` step. `.eyebrow` and `.label` become the `label` step (no uppercase, no tracking, Geist).

## 3. Text colours

Change the three ink variables in `:root`. No other text colour is allowed except the semantic colours.

| Token | Name | Value | RGB triplet |
|---|---|---|---|
| `ink` | primary | `#F2F4F8` | `242 244 248` |
| `ink-2` | secondary | `#A3ACBD` | `163 172 189` |
| `ink-3` | muted | `#7C8698` | `124 134 152` |

Semantic text colours stay: `accent` `#4C8DFF`, `healthy` `#34D399`, `firing` `#F87171`, `warning` `#FBBF24`.

Replace every Tailwind palette text class: `text-slate-100`, `text-slate-200`, `text-white`, `text-blue-100` become `text-ink`; `text-slate-300`, `text-slate-400` become `text-ink-2`; `text-slate-500`, `text-slate-600` become `text-ink-3`; `text-emerald-*` becomes `text-healthy`; `text-red-*` becomes `text-firing`; `text-amber-*` becomes `text-warning`. Text on a primary (accent-filled) button stays as it is now.

## 4. Spacing

Use only these values for the listed purposes.

| Purpose | Desktop | Mobile |
|---|---|---|
| Page side padding | 24px | 16px |
| Page max width | 1200px (unchanged) | n/a |
| App page top padding (below nav) | 48px | 32px |
| App page bottom padding | 96px | 64px |
| Landing section gap (end of one section to start of next) | 128px | 80px |
| App page section gap (between top-level blocks) | 40px | 32px |
| Page header block (title group) to first content block | 32px | 24px |
| Card padding (`Panel`) | 24px | 16px |
| Gap between sibling cards in a grid | 16px | 12px |
| Eyebrow label to title | 8px | 8px |
| Title to subtitle | 8px | 8px |
| Section title to its content | 24px | 16px |
| Card title to card content | 16px | 12px |
| Related elements (label to value, icon to text, chip to chip) | 8px | 8px |
| Tight pair (stat label to stat value, SHA to summary on one line) | 4px vertical, 8px horizontal | same |
| Table row height | 52px | n/a (cards) |
| Table cell side padding | 16px | n/a |

`Panel` default padding changes from 20px to 24px desktop (16px mobile).

## 5. Borders and surfaces

Aim: one box, never a box inside a box.

| Level | Where | Background | Border | Radius |
|---|---|---|---|---|
| 0 canvas | page | `#05070D` | none | n/a |
| 1 surface | a container that sits directly on the canvas: `Panel`, table wrapper, scoreboard, mobile investigation card, landing demo frame, HeuristicTie row | `#0A0F1C` (`bg-panel`) | `1px solid rgba(255,255,255,0.07)` (`border-line`) | 12px |
| 2 inset | anything that needs grouping INSIDE a level 1 surface | `rgba(255,255,255,0.03)` (`bg-white/[0.03]`) | none | 8px |
| raised | suspect commit hero, tooltip, mobile nav sheet only | `#0F1626` (`bg-elevated`) | `1px solid rgba(255,255,255,0.07)` | 12px |

Rules:
1. A border is used only on level 1 and raised surfaces, on controls, and as dividers. Nothing inside a level 1 surface has a border.
2. Inside a surface, group with the level 2 background step or with a divider, never with another bordered box.
3. Dividers (table rows, metric strip cells, header bottom, footer top, tab rail): `1px solid rgba(255,255,255,0.07)`.
4. Controls (secondary buttons, icon buttons, filter chips, tabs are excluded): `1px solid rgba(255,255,255,0.12)` (`--line-strong`), radius 8px, buttons 36px tall (hero CTAs keep their current height), filter chips keep their current height and full radius.
5. Badges and chips (`ServiceChip`, live, synthetic, baseline, validated, severity, mode tags, stack chips): no border and no ring. Neutral: `bg-white/[0.06]`, text `ink-2`. Coloured: background is the semantic colour at 12% (`bg-healthy/[0.12]` and so on) with text in that colour. Radius 6px, height 22px, side padding 8px, `label` step.
6. Row hover inside a surface: `bg-white/[0.03]`; on a level 2 inset: `bg-white/[0.05]`.
7. No `shadow-*` on cards (remove `shadow-lift` from `.glass-card`). Shadows only on tooltip, toast and the mobile sheet.
8. State accents stay: the 2px left bars (accent on the suspect commit hero and the gpt-6-luna row, healthy on the actual-cause row, firing on firing rows) are not borders under this rule.

Required un-boxing:
- `detail/FindingCards.tsx`: candidate rows inside the Commit correlation card lose their border and become level 2 insets.
- `detail/ReplayStrip.tsx`: the outer `Panel` is removed. The strip is an un-boxed section on the canvas (an `h2` title row, then the lanes). The lanes are then level 1 surfaces.
- `BenchmarkPage.tsx` expanded drilldown: candidate rows lose their border; they are plain rows split by dividers on the `bg-canvas` inset.
- `landing/LiveDemo.tsx`: cards inside the demo frame (alert card, lanes, brief card, reply card) lose their static border and become level 2 insets. The animated state outline on a lane (pending, running, done) stays exactly as it is.
- `StatusPage.tsx`: fault rows sit in ONE `Panel` split by dividers, not one `Panel` per row.

## 6. Mapping tables

Every text element uses exactly the step listed. If an element is not listed, use the closest step and list it in the report.

### Shell (all pages)

| Element | Step |
|---|---|
| Wordmark "Glassbox SRE" | `h3` |
| Nav links | `body` (500); active `ink`, inactive `ink-2` |
| Mobile sheet links | `h3` |
| Tooltip text, toast text | `small` (primary) |
| Loading and error state text | `body` |
| All buttons (primary, secondary, link buttons) | `body` (500), colour unchanged |

### Landing

| Element | Step |
|---|---|
| Hero pill above headline | `label` (secondary) |
| Hero headline | `display` (unchanged) |
| Hero sub paragraph | `lead` |
| Hero CTAs | `body` (500) |
| Proof card figures (100%, 13.3%) | `data-xl`; colours unchanged |
| Proof card labels and caption | `small` |
| Section eyebrows (all sections) | `label` |
| Section titles (Live demo, Heuristic tie, Architecture) | `h1` |
| Section intro paragraphs | `body` |
| Demo: alert name, lane titles, brief card title, reply card title | `h3` |
| Demo: lane status (Waiting, Running, Done), triage chip, speed and replay controls, "Replay, timing compressed" | `label`; status colour unchanged |
| Demo: commit SHA | `data` (accent) |
| Demo: scores, error rate, counts, offsets | `data` |
| Demo: result lines, brief line values, reply text, synthesis bar summary | `small` (primary for values) |
| Demo: brief line labels, synthesis bar label | `label` |
| Demo: runbook id | `data` |
| HeuristicTie: SHA | `data` (accent) |
| HeuristicTie: change summary | `body` (primary) |
| HeuristicTie: score | `data` |
| HeuristicTie: "actual cause" tag and other tags | `label` |
| HeuristicTie: caption under the rows | `small` |
| Architecture: node names | `small` (500, primary) |
| Architecture: node sub-labels | `label` |
| Architecture: link under the diagram | `body` (500, accent) |
| NumbersBand: values | `data-lg` |
| NumbersBand: "about" prefix | `small` (muted) |
| NumbersBand: labels | `small` |
| NumbersBand: muted line under the band | `small` (muted) |
| Stack chips | `label` (secondary), badge style from section 5 |
| Footer: wordmark | `h3` |
| Footer: links, "Built by", demo note | `small` (muted; links `ink-2`) |

### Investigations (`/investigations`)

| Element | Step |
|---|---|
| Page title | `h1` |
| Subtitle | `body` |
| Metric strip labels | `label` |
| Metric strip values | `data-lg` (secondary) |
| Filter chips | `label`; selected `ink`, unselected `ink-2`; counts `data-sm` |
| Table headers | `label` |
| Status label (`StatusDot`) | `label` in the status colour, sentence case |
| Alert name | `body` (500, primary) |
| Service chip | `label`, badge style |
| Commit SHA | `data` (accent) |
| Commit summary | `small` (primary) |
| Pre-rank score number | `data` |
| Started date | `small` (muted) |
| Empty-state text | `body`; its button `body` (500) |
| Mobile card: same steps as the matching table cell | as above |

### Investigation detail (`/investigations/:id`)

| Element | Step |
|---|---|
| Back link | `small` (muted) |
| Alert name (page title) | `h1` |
| Status label | `label` in the status colour |
| Service chip | `label`, badge style |
| Started, Resolved, Duration line | `small` (muted) |
| Slack and LangSmith buttons | `body` (500) |
| Tabs | `body` (500); active `ink`, inactive `ink-2` |
| Hero eyebrow "Suspect commit", "Top evidence" | `label` |
| Hero SHA | `data` (accent) |
| Hero change summary | `h2` |
| Evidence kind tag | `label` |
| Evidence summary | `small` |
| Evidence reference path | `data-sm` |
| Hero score figure | `data-xl` |
| "Pre-rank score" under the figure | `label` |
| Validation badge | `label`, coloured badge style |
| Finding card titles (Commit correlation, Runbook, Impact) | `h3` |
| "1 candidate ranked", "Section: Signals" | `small` |
| Candidate row SHA | `data` (accent) |
| Candidate row summary | `small` (primary) |
| Runbook id | `data` |
| Score numbers | `data` |
| Impact stat labels | `label` |
| Impact numeric values (error rate, affected requests) | `data-lg` |
| Impact severity value | `h2`; "page" in `firing`, otherwise `ink-2` |
| "scale 0 to 5%" caption | `label` |
| Replay strip title | `h2` |
| "Replay, timing compressed" | `label` |
| Replay button | `body` (500) |
| Lane titles | `h3` |
| Lane status | `label` in the status colour |
| Lane values: SHA, scores, percentages, counts | `data` |
| Lane text lines | `small` |
| Replay event offset ("+20.0s") | `data-sm` |
| Replay event summary | `small` |
| Timeline: offset | `data-sm` |
| Timeline: event label | `body` (500, primary) |
| Timeline: event summary | `small` |
| Timeline: source chip | `label`, badge style |
| Timeline: reference | `data-sm` |
| Raw tab: header "Rendered brief", Copy button | `label` |
| Raw tab: brief text | `data` (secondary), line height 22px |
| Empty states | `body`; second line `small` |

### Benchmark (`/benchmark`)

No number and no wording changes. Only fonts, sizes, casing of labels and colours.

| Element | Step |
|---|---|
| Eyebrow "Evaluation harness" | `label` |
| Page title | `h1` |
| Subtitle | `body` |
| "15 scenarios" badge | `label`, badge style |
| Scoreboard eyebrow | `label` |
| Scoreboard sentence | `body` (primary) |
| Scoreboard figures (100%, 13.3%) | `data-hero`; colours unchanged |
| "vs" | `label` |
| Scoreboard captions | `small` |
| Footnote line under the scoreboard | `small` |
| Comparison table eyebrow | `label` |
| Comparison table headers | `label` |
| Mode names in the first column | `data` |
| "(current, four-run mean)" and similar qualifiers | `small` (muted) |
| "baseline" badge | `label`, badge style |
| Numeric cells | `data`; the top-1 column weight 500 |
| "All 15 scenarios" | `h2` |
| Drilldown sub line | `small` |
| Filter chips | `label`; counts `data-sm` |
| Drilldown column headers (Scenario, Capture, mode names) | `label` |
| Scenario title | `body` (500, primary) |
| Scenario id | `data-sm` |
| live and synthetic badges | `label`, badge style (live coloured healthy) |
| "4/4" | `data-sm` |
| "Ranked candidates" | `label` |
| Candidate rank number | `data-sm` |
| Candidate SHA | `data` (accent) |
| Candidate summary | `small` (primary) |
| Mode-pick tags, "actual cause" tag | `label`, badge style |
| Scenario-level score number | `data` |
| "Limitations" heading | `label` |
| Limitation letters "(a)" to "(f)" | `small` (muted) |
| Limitation text | `small` |

### Status (`/status`)

| Element | Step |
|---|---|
| Eyebrow | `label` |
| Page title | `h1` |
| Subtitle | `body` |
| Health card titles | `h3` |
| Health status label (Ok, Down) | `label` in the status colour |
| Health numeric values (seconds, counts) | `data` |
| Health detail text | `small` |
| "Feature flags" heading | `h2` |
| Flag names | `data` |
| Flag descriptions | `small` |
| Flag state text | `label` |

### Pipeline (`/pipeline`)

| Element | Step |
|---|---|
| Eyebrow | `label` |
| Page title | `h1` |
| Intro text | `body` |
| "Click to explore" note, mobile scroll note | `small` (muted) |
| Nodes, overlay, connectors | not edited; they pick up Geist and Geist Mono through the global font families only |

### 404

| Element | Step |
|---|---|
| "404" | `data` (muted) |
| Title "No alert fired here." | `h1` |
| Sub line | `body` |
| Buttons | `body` (500) |

### OG image (`/og`)

Headline stays Instrument Serif. Wordmark Geist 600. The two figures Geist Mono 500. Their labels Geist 400. Pixel sizes unchanged. Recapture `public/og.png` at 1200x630 after the change.
