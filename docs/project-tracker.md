# PlayUtsav Project Tracker

## Summary
- Purpose: Build a multi-device family engagement platform with configurable games, team play, scoring, and marketplace-ready templates.
- Current baseline (2025-10-12): Sprint 2 playable MVP with quiz rounds, theming studio, locale lab, responsive web lobby, and TV companion scoreboard.

## Change Log
- 2025-10-12 – Sprint 2 foundations: quiz round APIs, host/player quiz UI, dynamic theme studio, locale lab, TV scoreboard.
- 2025-10-11 – Stack confirmed (React PWA, Redux Toolkit, Tailwind, react-intl, Socket.IO client, NestJS + Prisma) and initial monorepo scaffold created.
- 2025-10-10 – Requirements expanded to include multi-language support, vibrant theming, local-only mode, marketplace, analytics, music/sudoku/bingo games.
- 2025-10-09 – Initial concept captured: family-friendly engagement app with team management, scoring, admin dashboard, template-driven games.

## Requirements & Scope Adjustments
- Audience: Kids 4+ to adults 50; enforce family-safe content policy.
- Modes: Online real-time play + local-only mode (bundled backend, offline content).
- Devices: Responsive web, mobile-friendly PWA, LG webOS TV client, desktop browser.
- Games (initial + roadmap): Quiz, family-feud-like, logo recognition, movie image guess, music clip guess, sudoku puzzles, bingo.
- Customization: Admin dashboard for themes, locales, template authoring/import; marketplace for signed content packs.
- Analytics: Engagement metrics, monetization insights, export capability.
- Monetization (future SaaS): Subscriptions, premium packs, marketplace rev-share, sponsored themes.

## Assumptions
- Backend reachable on LAN for local-only deployments; TVs act strictly as clients.
- Music clips supplied are royalty-free or user-provided.
- Marketplace packages remain declarative (no custom code execution).
- Initial concurrency: up to 2 sessions, 6 players per session (configurable).
- Launch locales: English + Spanish (additional locales planned).

## Risks
- **Content licensing** – music, logos, and movie stills may require rights management.
- **DPAD UX** – intuitive navigation on TV remotes needs usability testing.
- **Template complexity** – tooling must stay accessible for non-technical admins.
- **Offline sync** – divergence between local-only content and marketplace updates.
- **Performance** – must profile low-end Android TV/webOS devices.

## TODO / Backlog Snapshot
- ✅ Socket.IO gateway + client hooks (sessions, quiz, scoring).
- 🔄 Persist quiz rounds/answers in Prisma migrations.
- ✅ Redux slices for session, theme, locale, quiz state.
- ✅ Theme Studio with presets + custom palettes.
- ✅ Locale loader with fallback (en/es), UI switcher.
- 🔄 Expand TV client: lobby list, quiz timer, remote-friendly navigation polish.
- ☐ Admin dashboard (template import/export, theme editor UI).
- ☐ Automated testing: Jest coverage, Playwright flows, k6 stress tests.
- ☐ Marketplace spec and signing pipeline.
- ☐ Offline bundle packaging (Docker/Tauri), analytics dashboards.
- ☐ **Host/Admin Platform UX**: introduce authentication tiers (platform admin vs. event host vs. guest player); move host creation flows behind login; expose player-only join & metrics screens.

## Sprint Plan (Rolling)
- **Sprint 1 – Core Foundations (complete)**
  - Prisma schema, REST endpoints, Socket.IO join flow.
  - Web host/player lobbies with Redux integration.
- **Sprint 2 – Games & Theming (in progress)**
  - Quiz round engine (host + player + scoring) ✅
  - Theme Studio + locale lab ✅
  - Persist quiz rounds/history 🔄
  - TV scoreboard & quiz view 🔄
  - **Deferred to Sprint 3**: Configurable scoring system (points per game, bonuses).
- **Sprint 3 – TV Experience & Offline**
  - DPAD-friendly flows, TV join UX, screen saver mode.
  - Local-only backend bundle (Docker/Tauri) with SQLite.
  - Session analytics telemetry + dashboards.
  - Configurable scoring system (points per game, bonuses).
- **Sprint 4 – Marketplace & Advanced Games**
  - Template marketplace spec + signing/verification pipeline.
  - Additional game engines (music match, sudoku, bingo).
  - Admin import/export flows and moderation tools.

## Tracking Cadence
- Update this tracker at sprint start/end.
- Log major decisions in Change Log with dates.
- Link tasks to issue tracker (GitHub) once repo is live.
