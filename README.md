PlayUtsav Monorepo

Stack
- Web PWA: Vite + React + vite-plugin-pwa
- TV: React with DPAD navigation (@noriginmedia/norigin-spatial-navigation), packaged for LG webOS
- UI: Tailwind CSS + CSS variables for theming
- State: Redux Toolkit
- i18n: react-intl (ICU; RTL-ready)
- Realtime: Socket.IO client
- Backend: NestJS + Prisma (Postgres for online; SQLite for local-only)

Workspace Layout
- apps/web: PWA web client (mobile-friendly)
- apps/tv: TV client with 10-foot UI and webOS packaging files
- packages/core: Shared types, i18n, theme tokens
- packages/ui: Shared React UI components
- services/api: NestJS API + Prisma schema

Quick Start
1) Install pnpm: https://pnpm.io/installation
2) Install deps: pnpm install
3) Copy env: cp services/api/.env.sample services/api/.env
4) Generate Prisma client: pnpm --filter @svc/api prisma:generate
5) Run API (dev): pnpm dev:api (http://localhost:3000, docs at /docs)
6) Run Web (dev): pnpm dev:web (http://localhost:5173)
7) Run TV (browser dev): pnpm dev:tv (http://localhost:5173)

Testing
- API unit tests: pnpm --filter @svc/api test
- Web unit tests: pnpm --filter @app/web test

webOS Packaging (TV)
- Build TV app: pnpm --filter @app/tv build
- Package: ares-package apps/tv/dist (requires webOS ares-cli)
- Enable Developer Mode on TV; then ares-setup-device, ares-install, ares-launch

Config
- Frontend reads API base URL from public/config.json at runtime.
- Theme tokens live under packages/core/styles.

Notes
- This is a minimal scaffold. Add Socket.IO client and real screens next.
- Set PRISMA_DB_PROVIDER/DATABASE_URL in services/api/.env as needed.
- For webOS packaging, ensure apps/tv/dist contains appinfo.json and assets.
- Wireframes: see docs/wireframes.md.
- Clickable prototype: open docs/prototype/index.html in a browser.

Sprint 2 Highlights
- Quiz round APIs with host/player flows, live Socket.IO updates, and score awards.
- Theme Studio with presets + custom palettes persisted to local storage.
- Locale Lab with live English/Spanish switching.

Backlog Ideas
- Introduce role-based accounts: platform administrators manage vendors/content, event hosts configure sessions, players see join/metrics only.
