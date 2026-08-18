# Development Plan Example

One application's artifacts from `docs/plans/proj-1234-order-rate-limiting/`, shown **mid-run**: T-001 verified, T-002 in progress and blocked on an open question, T-003 not started. Abridged — [plan-artifacts.md](./plan-artifacts.md) and the plan templates are authoritative on shape; this shows the three files agreeing with each other at one moment.

A second application in scope would add its own `web.plan.md` and `web.instructions.md` in the same shape, structured from the frontend template.

---

## `overview.md`

```markdown
# Order API Rate Limiting

**Ticket:** PROJ-1234 · **Apps in scope:** api, web · **Test strategy:** test-after
**Status:** blocked
**Branch:** feature/PROJ-1234-order-rate-limiting

## Requirement
Bulk importers are saturating `/api/orders`, degrading latency for interactive users.
Per-API-key rate limiting on order write endpoints, with a clear client-facing signal
when a caller is throttled.

## In scope
- Token-bucket limiting on `POST /api/orders` and `PATCH /api/orders/:id`
- 429 responses carrying `Retry-After`, surfaced by the web client

## Out of scope
- Rate limiting on read endpoints; per-IP limiting for unauthenticated traffic
- Replacing `legacy/throttle.ts` — dead for order paths, live for reporting. Its own ticket.

## Design
Limiter state lives in Redis, already an `api` dependency for sessions
(`api.instructions.md` Current state: `src/shared/redis.ts:12`). An in-process bucket
would not hold across the three API replicas. `web` treats any non-2xx as a generic
failure today — a cross-application integration point, so it is recorded here rather
than in either app plan.

## Risks
| Risk | Likelihood | Mitigation |
| Redis unavailable fails all writes closed | Low | Fail open, log at ERROR; availability outranks limiting |
| Limits too low, blocking legitimate importers | Medium | Ship at 2x observed p99; config change needs no deploy |

## Rollback
`RATE_LIMIT_ENABLED=false` disables the middleware without a deploy. Full revert is
git-only; no migration to unwind.

## Open questions
- [x] Q1 — Fail open or closed when Redis is unavailable? · Blocks T-002
      **Resolved:** fail open. Decided by user.
- [ ] Q2 — Per API key or per organization? · Blocks T-002

## Blockers
Q2 unresolved. T-002 cannot proceed — bucket key derivation depends on the answer.

## Verification
| App | Command | Commit | Result |
| api | `pnpm -C apps/api test src/config/schema.test.ts` | `a1b2c3d` | pass |
```

---

## `api.plan.md` — the human tier

```markdown
# api — Order Rate Limiting

## Tasks
- [x] T-001 — Add rate limit configuration · `a1b2c3d`
- [~] T-002 — Redis-backed token bucket
- [ ] T-003 — Rate limit middleware

## Endpoints

### Create Order (`POST /api/orders`)

Unchanged contract on success. Throttled callers now receive 429 instead of being served.

#### Metadata
- Authorization unchanged: API key, enforced by `authenticate`. The limiter keys on
  `principal.apiKey`, so it must run after authentication.
- Registered before request validation — rejecting early keeps throttled requests cheap.

#### Endpoint Flow
- `authenticate` resolves the API key to a principal
- `rateLimit` consumes one token; under limit proceeds, at limit returns 429
- Redis unreachable — fails open per Q1, request proceeds, ERROR logged

#### Response Body
Success unchanged. Throttled: `{ "error": "rate_limited", "retryAfterSeconds": 37 }`
with `Retry-After`; `X-RateLimit-Limit` and `-Remaining` on every response.

#### Callstack
```
POST /api/orders
  authenticate()                    src/middleware/auth.ts:34   -> principal.apiKey
  rateLimit()                       src/middleware/rateLimit.ts (new)
    tokenBucket.consume(key, 1)     src/shared/tokenBucket.ts (new)
      redis.eval(LUA_CONSUME)       src/shared/redis.ts:12
      -> { allowed: false, retryAfterSeconds: 37 }
    res.status(429).json(...)       returns; validation never runs
```

#### Failure modes
| Condition | Status | Body |
|---|---|---|
| Bucket empty | 429 | `{ "error": "rate_limited", "retryAfterSeconds": <int> }` |
| Redis unreachable | as today | Fails open per Q1; ERROR logged with the bucket key |
| Missing API key | 401 | Unchanged — `authenticate` rejects before the limiter runs |

**Not applicable:** Request Headers, Query String Parameters, Request Body — the
endpoint's inputs are unchanged.

*`PATCH /api/orders/:id` receives identical treatment: same middleware, same bucket
and key, same 429 shape.*

## Database Changes
No schema change. Bucket state lives in Redis under `ratelimit:{apiKey}` with a 120s
TTL — not a persisted entity, so there is no migration and nothing to backfill.

## Extensibility
`tokenBucket` is the shared unit: it serves rate limiting only, deliberately not
retry or circuit breaking. Adding a limited endpoint touches the middleware
registration and nothing else.

## Test scenarios
| Scenario | Level | Expected |
|---|---|---|
| Under limit | unit | Request served, `X-RateLimit-Remaining` decremented |
| 101st request in a minute | unit | 429 with `Retry-After`, handler never invoked |
| Bucket refills after 60s | unit | Request served again |
| Redis unreachable | unit | Fails open, ERROR logged |
| Unauthenticated request | integration | 401 from `authenticate`, limiter never runs |

## AI Instructions
Execution detail for this application: [api.instructions.md](./api.instructions.md)
```

---

## `api.instructions.md` — the agent tier

`## Current state` opens this file, written by the Explorer and never edited after. Then:

```markdown
## File manifest
| Action | Path | Purpose |
|---|---|---|
| create | `src/shared/tokenBucket.ts` | Redis token bucket |
| create | `src/middleware/rateLimit.ts` | Limiter middleware |
| modify | `src/config/schema.ts` | `rateLimit` config section |
| modify | `src/app.ts` | Register middleware after `authenticate` |

## Task details

### T-002 — Redis-backed token bucket
- **Depends on:** T-001
- **Files:** create `src/shared/tokenBucket.ts`
- **Reference:** `src/shared/redis.ts:12` for the client and its Lua eval helper;
  `api.plan.md` **Endpoints → Create Order → Callstack** for the call shape.
- **Change:** `consume(key, n)` against a Lua script, returning
  `{ allowed, retryAfterSeconds }`. 120s TTL per bucket.
- **Acceptance:** consuming the last token allows; the next call denies with a
  positive `retryAfterSeconds`; the bucket refills on schedule.
- **Verify:** `pnpm -C apps/api test src/shared/tokenBucket.test.ts`
- **Notes:** Script and TTL done and passing locally. Stopped before key derivation —
  Q2 decides whether the key is the API key or the resolved org. Left `[~]`.
```

The three files agree at every point: the checklist SHA on T-001 matches the verification table's commit, `[~]` on T-002 matches its `Notes`, and `Blockers` names the question those Notes cite. An agent resuming with no memory of the run recovers all of it from the files — which is why status lives in the plan rather than beside it.
