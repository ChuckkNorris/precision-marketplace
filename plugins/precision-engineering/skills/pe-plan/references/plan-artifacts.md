# Plan Artifacts

How the Planner authors the two files it owns per application. The shared plan contract defines which files exist, who writes them, and the task status markers; this reference defines their sections and section-level rules.

## `<app-name>.plan.md`

Human-facing: what is being built and how it behaves.

| Section | Written by |
|---|---|
| `## Tasks` | Planner; Developer maintains the markers |
| Design sections, from the app's plan template | Planner |
| `## Extensibility`, `## Test scenarios` | Planner |
| `## AI Instructions` | Planner — a one-line pointer to `<app-name>.instructions.md`, nothing more |

Call stacks stay with the endpoint or flow they describe — they are how a reviewer catches a design error, not implementation trivia.

The checklist sits first so status is the first thing any reader sees:

```markdown
# <app-name> — <Feature Title>

## Tasks
- [x] T-001 — Add rate limit configuration · `a1b2c3d`
- [~] T-002 — Redis-backed token bucket
- [ ] T-003 — Rate limit middleware
```

Each entry is `<marker> <task-id> — <title>`, with the commit's short SHA appended once complete. Write every entry as `[ ]`; the Developer maintains the markers from there.

### Design sections

Structured by the plan template for the application's `type`:

| `type` | Template |
|---|---|
| `backend`, `service` | [backend-technical-plan-template.md](./backend-technical-plan-template.md) |
| `frontend`, `mobile` | [frontend-technical-plan-template.md](./frontend-technical-plan-template.md) |
| `fullstack` | Both, backend sections first, in the one plan file |
| `library`, `infrastructure` | No template — document public API surface changes, consumer impact, and migration path |

A template supplies design sections only. The file heading, `Tasks`, and `AI Instructions` come from this reference; `Current state`, `File manifest`, and `Task details` live in the instructions file. The template's own title and requirement summary are dropped, because `overview.md` already carries them.

- Emit the sections that apply, in template order.
- Name every section with nothing to record in a `**Not applicable:**` line with its reason, rather than writing it out as a stub — `**Not applicable:** Query String Parameters — the endpoint takes none.` One line closes the file's top-level sections; one closes each endpoint or component block whose own subsections were dropped.
- `<Additional…Section>` placeholders are an instruction, not an option. Expand them wherever an agent implementing with no prior context would otherwise have to derive something.
- Sections the template does not name come after the ones it does.

### Required beyond the template

| Section | Contents | Applies to |
|---|---|---|
| `## Extensibility` | Per unit introduced: the set it belongs to and its other members, or `one-off` with the reason. Per shared unit: the one set it serves and what it deliberately excludes. Where shared behavior is seated, and what adding the next member touches. | all |
| `## Test scenarios` | Table of scenario, level, expected. Happy path, boundary, failure, and authorization each named individually. | all |
| `#### Failure modes` | Per endpoint: each failure condition with the status code and body it produces. | `backend`, `service` |
| `#### States`, `#### Accessibility`, `#### Wireframe` | Per component: loading, error, and empty treatments; accessibility requirements; a low-fidelity wireframe for each new or changed flow. | `frontend`, `mobile` |

Finally `## AI Instructions` — one line pointing at `<app-name>.instructions.md`. It exists so a reader of the plan knows where the execution detail went, and carries no detail itself.

## `<app-name>.instructions.md`

Agent-facing. Written for a Developer starting with no context beyond this file.

| Section | Written by |
|---|---|
| `## Current state` | Explorer, before any design exists. **Never edited afterward.** |
| `## File manifest` | Planner |
| `## Task details` | Planner; Developer appends `Notes` |

The Explorer's `## Current state` already opens the file; append beneath it. A fact in it that turns out to be wrong gets a dated correction line appended to the section, never a rewrite of the original claim.

Then the **file manifest** — every path the Developer is authorized to touch:

```markdown
## File manifest
| Action | Path | Purpose |
|---|---|---|
| create | `src/middleware/rateLimit.ts` | Token-bucket limiter |
| modify | `src/app.ts` | Register middleware |
| delete | `src/legacy/throttle.ts` | Superseded |
```

Then the task details.

### Task format

Every task is independently implementable and independently verifiable, and carries everything needed to execute it without reading the plan file.

```markdown
### T-003 — Add rate limit middleware
- **Depends on:** T-001
- **Files:** create `src/middleware/rateLimit.ts`; modify `src/app.ts`
- **Reference:** `src/middleware/auth.ts:34` for the middleware signature; `api.plan.md`
  **Endpoints → Create Order** for the response contract.
- **Change:** Token-bucket limiter, 100 req/min per API key, 429 with `Retry-After`.
- **Acceptance:** 101st request within a minute returns 429; counter resets after 60s;
  requests without an API key bypass the limiter.
- **Verify:** `pnpm -C apps/api test src/middleware/rateLimit.test.ts`
- **Notes:** Added by the Developer only — decisions the plan did not anticipate.
```

Rules:

- Every task in the details section has a matching checklist entry in `<app-name>.plan.md`, and vice versa. The two files are written together; a task in one and not the other is the most likely way this split breaks.
- `Depends on` is honest and complete. It is what lets applications with non-overlapping manifests implement concurrently, so an omitted dependency shows up as a race rather than a delay.
- `Reference` names the files to read before starting, and the plan sections carrying the contract this task implements. A task whose `Reference` sends the Developer hunting is under-specified.
- `Verify` must be a runnable command drawn from the app's configured `commands`. "Manually check" is not a verification.
- `Acceptance` states observable behavior, never implementation detail.
- Every path in a task appears in that application's file manifest. Tasks touching a path absent from it are invalid.
- A task no single agent can complete in one sitting is too large — split it.
- `Notes` is the Developer's alone. Never write it.
