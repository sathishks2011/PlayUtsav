# Scoring API Integration Plan

_Date: October 12, 2025_

## Goals
- Wire the new scoring engine into the services-api layer
- Persist scoring configuration, session scoring state, and history via Prisma
- Provide host-facing APIs for managing scoring behaviour
- Capture scoring events during live sessions and expose aggregated stats

---

## 1. Service Layer Responsibilities

| Service | Responsibilities |
| --- | --- |
| `ScoringConfigService` | CRUD for `ScoringConfiguration`, enforce defaults, map Prisma records to `ScoringConfig`. |
| `SessionScoringService` | Attach configs to sessions, hydrate `ScoringEngine` based on session mode, orchestrate scoring lifecycle (start, update, end). |
| `ScoreCalculationService` | Run engine for each answer submission, persist `ScoringHistory`, update `PlayerScoringStats`, emit events to gateways. |
| `ScoringAnalyticsService` | Produce aggregated metrics (per-question stats, streaks, leaderboards, time-to-answer distributions). |

### Key Flows
1. **Host chooses configuration** → `ScoringConfigService` ensures config exists and sets `SessionScoring` record.
2. **Player submits answer** → `ScoreCalculationService` loads context → `ScoringEngine` → results stored & broadcast to clients.
3. **Session summary** → `ScoringAnalyticsService` gathers stats from histories and player stats.

---

## 2. Prisma Repository Shapes

```ts
// repositories/scoring-config.repository.ts
findByHost(hostId): Promise<ScoringConfiguration[]>
findDefaultByHost(hostId)
create(payload: CreateScoringConfigInput)
update(id, payload)
delete(id)
```

```ts
// repositories/session-scoring.repository.ts
findBySession(sessionId)
createForSession(sessionId, configId)
recordHistory(sessionScoringId, historyPayload)
updatePlayerStats(sessionScoringId, playerId, statsPayload)
listHistory(sessionScoringId, filters)
```

```ts
// repositories/scoring-analytics.repository.ts
getPlayerSummary(sessionScoringId)
getQuestionSummary(sessionScoringId)
getLeaderboard(sessionScoringId, { limit })
getTimeToAnswerDistribution(sessionScoringId)
```

All repositories should return `core` scoring DTOs rather than Prisma types (use mappers).

---

## 3. REST/GraphQL Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET /api/scoring/configs` | List configs for current host |
| `POST /api/scoring/configs` | Create new config (validates rules, persists JSON) |
| `PUT /api/scoring/configs/:id` | Update config |
| `DELETE /api/scoring/configs/:id` | Remove config (guard if used by active sessions) |
| `POST /api/scoring/session/:sessionId/attach` | Attach config to session (creates `SessionScoring`) |
| `POST /api/scoring/session/:sessionId/score` | Trigger scoring for an answer (internal controller hook) |
| `GET /api/scoring/session/:sessionId/history` | Paginated scoring history |
| `GET /api/scoring/session/:sessionId/analytics` | Aggregated metrics (response time, streaks, leaderboard) |

_Future enhancement_: GraphQL resolvers mirroring the REST API.

---

## 4. Session Lifecycle Hooks

| Event | Hook | Action |
| --- | --- | --- |
| Session created | `SessionService.create` | Apply default config if host has one, create `SessionScoring` record. |
| Question started | `QuizGateway.broadcastQuestion` | Ensure scoring engine cached for session. |
| Answer submitted | `AnswerService.submit` | Build `ScoringContext`, call engine, persist results, broadcast updates. |
| Question ended | `AnswerService.closeQuestion` | Finalize question stats, optionally emit summary. |
| Session ended | `SessionService.complete` | Generate session summary/analytics snapshot, mark `SessionScoring` closed. |

Implement caching layer (e.g., in-memory Map keyed by sessionId) to reuse `ScoringEngine` per session.

---

## 5. Follow-Up Work & Considerations

- **Testing**: Unit tests for services, repository integration tests using Prisma test DB, contract tests for REST endpoints.
- **Validation**: Schema validation on config payloads (e.g., Zod) before persisting JSON.
- **Authorization**: Ensure host-only access to config management and session scoring data.
- **Telemetry**: Emit logging/metrics (time to score, failure cases) for observability.
- **Migration Plan**: Generate Prisma migration for new tables; backfill defaults for existing sessions.
- **UI Alignment**: Coordinate with web app to surface config management and analytics dashboards.
- **Real-time Updates**: Hook into existing WebSocket gateways to push score updates and analytics snapshots to host view.
