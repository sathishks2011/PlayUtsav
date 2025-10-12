# PlayUtsav Authentication & Role Architecture

## Goals
- Introduce secure, role-based access so different personas (platform admin, event host, guest player) see tailored experiences.
- Support gradual rollout: start with core roles (admin/host/player), keep room for future vendor or sponsor types.
- Preserve frictionless join flow for guests using session codes.
- Reuse existing services while laying groundwork for Sprint 3+ features.

## Personas & Roles
- **Platform Administrator** (product owner): manages hosts, global settings, templates, analytics. Requires full dashboard access.
- **Event Host** (organiser/vendor): configures sessions, teams, rounds, content. Needs an authenticated host portal separate from the player landing.
- **Guest Player**: joins via session code (no auth), sees player-only UI with game metrics.

## Target Experience
| Persona | Entry Point | Key Screens |
|---------|-------------|-------------|
| Platform Admin | `/admin` | Login → Admin Console (hosts list, templates, analytics) |
| Event Host | `/host` | Login/Sign-up → Host Dashboard (sessions, teams, quiz control, theme studio) |
| Guest Player | `/join` | Session code entry → Player Lobby/Game screen |

## Authentication Strategy
- **Phase 1 (MVP)**: email/password auth with JWT (NestJS + Prisma). Password reset and MFA deferred.
- **Phase 2**: optional OAuth providers (Google/Microsoft) for hosts/admins.
- Access tokens: short-lived JWT in HTTP-only cookies, refresh tokens tracked in Prisma (`UserSession`).

### Data Model Updates (Prisma)
- `User`: add `email`, `passwordHash`, `role` enum (`ADMIN`, `HOST`).
- `HostProfile`: optional relation for branding, contact info, event context.
- `Session`: add `hostId` referencing `User`.
- `UserSession`: manage refresh tokens + metadata.
- Quiz models already introduced (round/options/answers) persist state for analytics.

### API Endpoints (NestJS)
- `POST /auth/login` (email, password) → returns JWT cookie.
- `POST /auth/signup` (host registration, optional admin approval).
- `POST /auth/logout` → clears session.
- `GET /auth/me` → returns profile + role.
- Guarded routes: `@Roles('ADMIN')`, `@Roles('HOST')`; `@Public()` for guest join endpoints.

## Frontend Architecture
### Web (React PWA)
- Route layout:
  - `/join` → player-only join page (current landing trimmed).
  - `/host/login`, `/host/signup`, `/host/dashboard`, `/host/sessions/:id` → host portal.
  - `/admin/login`, `/admin/dashboard` → admin portal.
- Store updates:
  - `authSlice` for profile, role, loading state.
  - Hooks: `useAuth`, `useRequireRole('HOST')`, `useRequireRole('ADMIN')`.
- Components:
  - Shared login form (email/password).
  - Host dashboard layout (sessions list, create session CTA, access to quiz/theme tools).
  - Admin dashboard layout (host management, templates marketplace, analytics overview).
- Player experience: join-only page with quick metrics; optional CTA “Want to host? Sign up”.

### TV Client
- Remains read-only: consumes session/quiz APIs to display scoreboard + quiz prompts.
- Potential future enhancement: display host branding (from `HostProfile`).

## User Flows
### Host Sign-up / Login
1. Visit `/host/login`.
2. No account? Click “Create host account” (admin approval toggle).
3. Submit credentials; receive JWT; redirect to `/host/dashboard`.
4. Dashboard shows session list + creation flows (linked to `Session.hostId`).

### Player Join
1. Visit `/join`.
2. Enter session code → join lobby/quiz UI (no auth).
3. Post-game metrics view accessible without login.

### Admin Console
1. `/admin/login` for platform owner.
2. Manage hosts (approve, suspend), templates, analytics, potentially impersonation for support.

## Implementation Plan
### Backend Tasks
- [ ] Update Prisma schema (`User`, `HostProfile`, `Session.hostId`, `UserSession`).
- [ ] Implement auth service (bcrypt hashing, JWT generation, refresh flow).
- [ ] Add role-based guards and update session/quiz endpoints to verify host ownership.
- [ ] Seed initial admin account via environment variables.
- [ ] Extend Jest tests for auth + role guards.

### Frontend Tasks (Web)
- [ ] Add `authSlice`, API client for login/logout/me.
- [ ] Build host login/signup pages and dashboard shell.
- [ ] Relocate join form to `/join`; existing landing becomes host CTA.
- [ ] Create admin dashboard skeleton (host management table, template cards).
- [ ] Add protected route components.

### TV Tasks
- [ ] Update prompts to reference `/join`.
- [ ] Optionally show host branding/metadata.

## Security & Compliance
- Hash passwords with bcrypt (≥12 rounds).
- Rate-limit auth endpoints.
- Use HTTPS, same-site cookies.
- Plan for audit logging (admin actions) in future iteration.

## Open Questions
- Should host sign-up be invite-only or open with email verification?
- Do hosts need sub-accounts/team members?
- How to handle billing tiers (free vs premium hosts)?
- Should admins be able to impersonate hosts for support?
- Timeline for SSO integrations?

---
This document captures the target architecture before implementation. Update as requirements evolve.
