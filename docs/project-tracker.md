# PlayUtsav Project Tracker

## Summary
- Purpose: Build a multi-device family engagement platform with configurable games, team play, scoring, and marketplace-ready templates.
- Current baseline (2025-10-11): Monorepo scaffold in place (React PWA, React TV build, shared packages, NestJS + Prisma API).

## Change Log
- 2025-10-12 – Sprint 2 foundations: quiz round APIs, host/player quiz UI, dynamic theme studio, locale lab, and scoreboard updates.
- 2025-10-11 – Stack confirmed (React PWA, Redux Toolkit, Tailwind, react-intl, Socket.IO client, NestJS + Prisma) and initial monorepo scaffold created.
- 2025-10-10 – Requirements expanded to include multi-language support, vibrant theming, local-only mode, marketplace, analytics, music/sudoku/bingo games.
- 2025-10-09 – Initial concept captured: family-friendly engagement app with team management, scoring, admin dashboard, template-driven games (quiz, family feud, logo ID, movie titles).

## Requirements & Scope Adjustments
- Audience: Kids 4+ to adults 50; enforce family-safe content policy.
- Modes: Online real-time play + local-only mode (bundled backend, offline content).
- Devices: Responsive web, mobile-friendly PWA, LG webOS packaged TV app, desktop via browser (Electron/Tauri optional later).
- Games (initial + early roadmap): Quiz, family-feud-like, logo recognition, movie image guess, music clip guess, sudoku puzzles, bingo.
- Customization: Admin dashboard for themes, locales, template authoring/import; marketplace for signed content packs.
- Analytics: Engagement metrics, monetization insights, export capability.
- Monetization (future SaaS): Subscriptions, premium packs, marketplace rev-share, sponsored themes.

## Assumptions
- Backend reachable on LAN for local-only deployments; TVs act strictly as clients.
- Music clips supplied are royalty-free or user-provided; no bundled licensed IP without clearance.
- Marketplace packages remain data + declarative rules (no arbitrary code execution).
- Max concurrent sessions (early) = 2; architecture must scale later.
- Primary locales at launch: English plus down-select (TBD by stakeholder).

## Risks
- **Content licensing** – music, logos, and movie stills may require rights management.
- **DPAD UX** – ensuring intuitive navigation on TVs may need additional usability testing.
- **Template complexity** – creating accessible tooling for non-technical admins is non-trivial.
- **Offline sync** – divergence between local-only content and online marketplace updates can cause inconsistencies.
- **Performance on low-end devices** – especially TVs with limited CPU/memory.

## TODO / Backlog Snapshot
- Wire Socket.IO gateway and client hooks for sessions, teams, and scoring. ✅
- Flesh out Prisma models (teams, rounds, themes, locales, plugins) and connect controllers. ▶ In progress (quiz state in-memory; DB round model TBD).
- Implement Redux slices for sessions, teams, themes, and locale management. ✅
- Add theme switcher UI and dynamic CSS variable loader. ✅
- Integrate react-intl locale loader with fallback strategy; add secondary locale pack. ✅
- Build host/player screens (lobby, game board, scoreboard) for web and TV variants. ✅ Sprint 2 expands with quiz panels & scoreboards.
- Scaffold admin dashboard (template import/export, theme editor).
- Set up automated testing (Jest/unit, Playwright E2E, k6 perf harness).
- Define marketplace package schema and signing utility.

## Enhancements & Future Ideas
- Add user analytics dashboard with configurable KPIs and export filters.
- Implement template preview simulator in the admin UI.
- Provide printable offline packs (PDF) for each game type.
- Offer optional voice narration/assistive prompts for accessibility.
- Explore AR-based rounds (mobile) for scavenger hunts.

## Sprint Plan (Rolling)
- **Sprint 1 – Core Foundations (Week 1)**
  - Complete Prisma schema, migrations, and REST endpoints for sessions/teams.
  - Implement Socket.IO gateway + client hooks (join, lobby updates).
  - Deliver web host/player lobby screens with Redux integration.
- **Sprint 2 – Games & Theming (Week 2)**
  - Build quiz game flow end-to-end (host controls, timers, scoring).
  - Add theme editor UI + apply CSS variable updates across web/TV.
  - Introduce locale switcher with second language pack; verify RTL support.
- **Sprint 3 – TV Experience & Offline (Week 3)**
  - Expand TV UI (lobby, scoreboard, DPAD enhancements) and test on emulator.
  - Package local-only backend bundle (Docker or desktop app) with SQLite.
  - Add basic analytics event tracking for sessions and rounds.
- **Sprint 4 – Marketplace & Advanced Games (Week 4)**
  - Define marketplace package spec + signing/verification pipeline.
  - Implement music clip, sudoku, and bingo modules with rule engines.
  - Deliver admin import/export flows and marketplace catalog browser.

## Tracking Cadence
- Update this document at the start/end of each sprint.
- Record major decisions and requirement changes in the Change Log section with dates.
- Cross-link tasks to issue tracker (e.g., GitHub) when available.
