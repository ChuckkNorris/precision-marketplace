# Development Plan Example

A worked, abridged example of the artifacts defined in [plan-contract.md](../../../shared/plan-contract.md), for `docs/plans/proj-1234-order-rate-limiting/`. Shown **mid-run**: T-001 verified, T-002 in progress and blocked, T-003 not started.

Note the two-tier split. `api.plan.md` is what the user approves at the gate; `api.instructions.md` is what the Developer works from. Design sections follow the plan template for each application's `type` — [backend](../../pe-plan/references/backend-technical-plan-template.md) for `api`, [frontend](../../pe-plan/references/frontend-technical-plan-template.md) for `web`.

Real plans carry more tasks and fuller call stacks; the shape is what matters here.

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
- 429 responses carrying `Retry-After`
- Per-key limits configurable without deploy
- Web client surfaces throttling to the user instead of failing opaquely

## Out of scope
- Rate limiting on read endpoints
- Per-IP limiting for unauthenticated traffic
- Replacing the existing `legacy/throttle.ts` used by the reporting service.
  It is dead for order paths but live for reporting; removing it is its own ticket.

## Design
Limiter state lives in Redis, already a dependency of `api` for sessions
(`api.instructions.md` Current state: `src/shared/redis.ts:12`). An in-process bucket
would not hold across the three API replicas.

`web` consumes the throttled endpoints and today treats any non-2xx as a generic
failure — a cross-application integration point, so it is recorded here rather than
in either app plan.

Middleware sits after authentication and before request validation — the limiter
keys on API key, so it needs an authenticated principal, and rejecting before
validation keeps throttled requests cheap.

## Risks
| Risk | Likelihood | Mitigation |
| Redis unavailable fails all writes closed | Low | Fail open, log at ERROR; availability outranks limiting |
| Limits set too low, blocking legitimate importers | Medium | Ship at 2x observed p99 volume; config change needs no deploy |

## Rollback
`RATE_LIMIT_ENABLED=false` disables the middleware without a deploy. Full revert is
git-only; no migration to unwind.

## Open questions
- [x] Q1 — Fail open or closed when Redis is unavailable? · Blocks T-002
      **Resolved:** fail open. Decided by user — availability outranks limiting.
- [ ] Q2 — Per API key or per organization? · Blocks T-002
      Ticket says "per customer", which maps to neither cleanly.

## Blockers
Q2 unresolved. T-002 cannot proceed — the bucket key derivation depends on the answer.

## Verification
| App | Command | Last run | Result |
| api | `pnpm -C apps/api test src/config/schema.test.ts` | after T-001 | pass |
```

---

## `api.plan.md` — the human tier

What the user reads at the approval gate. No manifest, no reconnaissance, no task mechanics.

```markdown
# api — Order Rate Limiting

## Tasks
- [x] T-001 — Add rate limit configuration · `a1b2c3d`
- [~] T-002 — Redis-backed token bucket
- [ ] T-003 — Rate limit middleware

## Endpoints
Behavior added to two existing endpoints; no new routes.

### Create Order (`POST /api/orders`)

Unchanged contract on success. Throttled callers now receive 429 instead of being served.

#### Metadata
- Authorization unchanged: API key, enforced by `authenticate`. The limiter keys on
  `principal.apiKey`, so it must run after authentication.
- Registered before request validation — rejecting early keeps throttled requests cheap.
- Governed by `rateLimit.enabled`; disabled leaves the path byte-for-byte as today.

#### Endpoint Flow
- `authenticate` resolves the API key to a principal
- `rateLimit` consumes one token from that key's bucket
- Under limit — proceeds to validation and the existing handler
- At limit — 429 returned; validation and handler never run
- Redis unreachable — fails open, request proceeds, ERROR logged

#### Request Headers
Unchanged. `Authorization: ApiKey <key>` required as today.

#### Query String Parameters
None.

#### Request Body
Unchanged from the existing endpoint.

#### Response Body
Success unchanged. Throttled:
```json
{ "error": "rate_limited", "retryAfterSeconds": 37 }
```
`X-RateLimit-Limit` and `X-RateLimit-Remaining` on every response;
`Retry-After` on 429 only.

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

### Update Order (`PATCH /api/orders/:id`)

Identical treatment to `POST /api/orders`: same middleware registration, same bucket
and key, same 429 body and headers. Writes to one order share the caller's single bucket.

## Database Changes
None. Bucket state lives in Redis under `ratelimit:{apiKey}` with a 120s TTL — not a
persisted entity, so there is no migration and nothing to backfill.

## Interface Updates
`src/config/schema.ts` gains a `rateLimit` section (`enabled`, `requestsPerMinute`,
`burst`). No enum changes. `src/legacy/throttle.ts` is untouched — it serves reporting,
per Current state.

## Test scenarios
| Scenario | Level | Expected |
|---|---|---|
| Under limit | unit | 200, `X-RateLimit-Remaining` decrements |
| At limit | unit | 429, `Retry-After` present and > 0 |
| Bucket refills after window | unit | 200 after TTL elapses |
| Redis unreachable | unit | Fails open, 200, ERROR logged |
| Two keys, one throttled | integration | Second key unaffected |
| Disabled by flag | integration | No limiting, no headers |

## AI Instructions
Execution detail for this application: [api.instructions.md](./api.instructions.md)
```

---

## `api.instructions.md` — the agent tier

What the Developer works from. Everything needed to execute, nothing needed only to approve.

```markdown
# api — Order Rate Limiting · Instructions

## Current state
*Reconnaissance by the Explorer. Facts as of exploration; never edited by a later stage.*

### Affected areas
| Path | Role in this change |
| `src/app.ts` | Middleware registration; order routes mounted at :47 |
| `src/middleware/auth.ts` | Runs before any limiter would; supplies `principal.apiKey` |
| `src/config/schema.ts` | zod config schema the limiter settings must join |

### Patterns to follow
- `src/middleware/auth.ts:34` — middleware signature `(req, res, next)`, rejects by throwing `HttpError`.
- `src/config/schema.ts:8` — config sections are zod objects with defaults; startup fails on invalid input.

### Integration points
`src/shared/redis.ts:12` exports a connected client, already used for sessions.
Order routes are consumed by the `web` application — recorded in `overview.md` Design.

### Existing test coverage
vitest, colocated `*.test.ts`. Middleware tests use supertest against a built app
instance. Nothing anywhere in the repo covers throttling or 429 handling.

### Absent abstractions
No rate limiter, no token bucket, no shared helper for Redis Lua scripts.

### Constraints and hazards
`src/legacy/throttle.ts` looks like a limiter but serves the reporting service only.
It is not wired to order routes and its Redis keys use an incompatible prefix.

## File manifest
| Action | Path | Purpose |
|---|---|---|
| create | `src/middleware/rateLimit.ts` | Token-bucket middleware |
| create | `src/middleware/rateLimit.test.ts` | Unit tests |
| create | `src/shared/tokenBucket.ts` | Redis-backed bucket |
| modify | `src/app.ts` | Register middleware on order routes |
| modify | `src/config/schema.ts` | Add rate limit config |

## Task details

### T-001 — Add rate limit configuration
- **Depends on:** none
- **Files:** modify `src/config/schema.ts`
- **Reference:** `src/config/schema.ts:8` for the zod section pattern.
- **Change:** Add `rateLimit: { enabled: boolean, requestsPerMinute: number, burst: number }`,
  defaults `false` / `100` / `20`.
- **Acceptance:** Config loads with defaults when unset; invalid values fail startup with a named error.
- **Verify:** `pnpm -C apps/api test src/config/schema.test.ts`
- **Notes:** Used the existing zod schema pattern at `src/config/schema.ts:8` rather than
  a new validator, per the precedent cited in Current state.

### T-002 — Redis-backed token bucket
- **Depends on:** T-001 · **Blocked by Q2**
- **Files:** create `src/shared/tokenBucket.ts`
- **Reference:** `src/shared/redis.ts:12` for the connected client; `overview.md` Q1 for the
  Redis-down behavior this must implement.
- **Change:** `consume(key, tokens)` via a Lua script for atomicity. Returns
  `{ allowed, remaining, retryAfterSeconds }`. Fails open on Redis error.
- **Acceptance:** Concurrent consumes never over-issue; refill is time-based, not request-based;
  Redis errors return `allowed: true` and log ERROR.
- **Verify:** `pnpm -C apps/api test src/shared/tokenBucket.test.ts`
- **Notes:** Lua script drafted; fail-open path implemented per Q1. Key derivation left
  unwritten pending Q2.

### T-003 — Rate limit middleware
- **Depends on:** T-002
- **Files:** create `src/middleware/rateLimit.ts`, `src/middleware/rateLimit.test.ts`; modify `src/app.ts`
- **Reference:** `src/middleware/auth.ts:34` for the signature and rejection style;
  `src/app.ts:47` for where order routes mount; `api.plan.md` **Endpoints → Create Order**
  for the 429 body, headers, and callstack this must produce.
- **Change:** Middleware registered after `authenticate`, before validation, on order write routes only.
- **Acceptance:** All six scenarios in `api.plan.md` **Test scenarios** pass.
- **Verify:** `pnpm -C apps/api test src/middleware/rateLimit.test.ts`
```

---

## `web.plan.md` (excerpt)

```markdown
# web — Order Rate Limiting

## Tasks
- [ ] T-004 — Surface 429 in the order mutation hook
- [ ] T-005 — RateLimitNotice component
- [ ] T-006 — Wire notice into OrderForm

## Components

### RateLimitNotice (`src/modules/orders/components/RateLimitNotice.tsx`)

New. Inline warning with a live countdown until the caller may retry.

#### Props
- `retryAfterSeconds` — seconds remaining before retry is permitted. `number`, > 0.
- `onElapsed` — invoked once when the countdown reaches zero. `() => void`.

#### Component Hierarchy and Structure
```yaml
orders:
  OrderForm:
    - RateLimitNotice:
    - CustomerField:
    - OrderItemsField:
    - SubmitButton:
```

#### States
| State | Treatment |
|---|---|
| Counting down | Warning rendered above the fields, countdown ticking |
| Elapsed | `onElapsed` fires; parent unmounts the notice |
| Remounted while visible | Countdown resets in place; no second notice stacks |

#### Accessibility
`role="status"` `aria-live="polite"` — announced without stealing focus. Countdown
renders at 1s but announces only at 30s/10s/0 to avoid flooding the screen reader.

#### Wireframe
```
┌─ New Order ─────────────────────────────┐
│  ⚠ Rate limit reached.                   │
│    Retrying available in 0:37            │
│                                          │
│  Customer  [ Acme Corp            ▾ ]   │
│  Items     [ 3 items              ▾ ]   │
│                                          │
│              [ Cancel ]  [ Submit ]      │
│                            (disabled)    │
└──────────────────────────────────────────┘
```

### OrderForm (`src/modules/orders/components/OrderForm.tsx`)

Existing. Owns throttle state and renders the notice; the notice itself is stateless
beyond its countdown.

#### Props
Unchanged.

#### Component Hierarchy and Structure
As above — `OrderForm` gains `RateLimitNotice` as its first child.

#### States
| State | Treatment |
|---|---|
| Idle | Unchanged |
| Submitting | Unchanged |
| Throttled | Notice shown, submit disabled with `aria-describedby` pointing at it |
| Cooldown elapsed | Notice clears, submit re-enabled, focus stays where the user left it |
| Other error | Unchanged — existing generic failure treatment |

### useCreateOrder (`src/modules/orders/hooks/useCreateOrder.ts`)

Existing mutation hook. Distinguishes 429 from generic failure and exposes the retry window.

#### Props
Not a component. Returns `{ ...existing, throttledFor: number | null }` —
`retryAfterSeconds` from the 429 body, `null` otherwise.

#### Component Hierarchy and Structure
No hierarchy. Consumed by `OrderForm` and by `src/modules/import/BulkImport.tsx`,
which shares the hook and inherits the change.

## Integrations
`POST /api/orders` and `PATCH /api/orders/:id` now return 429 with `Retry-After` and a
`retryAfterSeconds` body field — see `api.plan.md` **Endpoints**. No new endpoints are
consumed, and no request shape changes.

## Affected flows
Order submission (`src/modules/orders/`). Bulk import (`src/modules/import/`) shares
the same mutation hook and inherits the change without its own task.

## Test scenarios
| Scenario | Level | Expected |
|---|---|---|
| Successful submit | unit | Unchanged; no notice rendered |
| 429 response | unit | Notice rendered with the server's `retryAfterSeconds`, submit disabled |
| Countdown elapses | unit | Notice unmounts, submit re-enabled |
| Non-429 failure | unit | Existing generic error treatment, no notice |
| Throttle during bulk import | integration | Import surfaces the same notice |

## AI Instructions
Execution detail for this application: [web.instructions.md](./web.instructions.md)
```

---

## The escalation that produced Q1

What the Planner returned to the orchestrator alongside the plan. The orchestrator asked it with
the harness's question tool and wrote the answer back into **Open questions** above.

```yaml
escalations:
  - id: Q1
    header: Redis down
    question: When Redis is unavailable, should the limiter fail open or fail closed?
    why: >
      Determines whether a Redis outage degrades to unlimited traffic or blocks all
      order writes. Changes the error path in T-002 and the test matrix.
    blocks: [T-002]
    options:
      - label: Fail open
        description: >
          Requests pass unlimited during an outage. Availability preserved; the API is
          briefly unprotected, which is the condition the limiter exists to prevent.
        recommended: true
      - label: Fail closed
        description: >
          Requests rejected during an outage. Limits always hold, but a Redis blip
          becomes a full order-writes outage.
      - label: Fail open with alarm
        description: >
          Fail open plus a paging alert. Same risk window, faster human response.
          Needs alerting wiring the plan does not currently cover.
```

## Reading the state

`overview.md` says `blocked`, and the pair of `api` files shows exactly where. `api.plan.md`'s
checklist has T-001 carrying a SHA, T-002 at `[~]`, T-003 untouched. `api.instructions.md` says why:
T-002's Notes record how far it got and which question stopped it. Q1 shows a resolved decision with
its owner; Q2 shows what is still outstanding. An agent resuming with no memory of the run recovers
all of that from the files alone — which is the point of tracking status in the plan rather than
beside it.
