# Development Plan Contract

Defines the artifacts under `docs/plans/<feature-slug>/`. The Explorer records current state, the Planner designs against it, the Developer implements and records progress, the Reviewer audits. All four treat this contract as binding.

`<feature-slug>` is kebab-case, derived from the ticket ID and summary (e.g. `proj-1234-order-rate-limiting`).

## Files

| File | Written by | Purpose |
|---|---|---|
| `brief.md` | Orchestrator | Normalized requirement, whatever its source. On a light-track run, also the Developer's task checklist. |
| `overview.md` | Planner (orchestrator on a light-track run), then Developer | Requirements, scope, cross-cutting design, risks, open questions, run state. |
| `<app-name>.plan.md` | Planner, then Developer | One per application in scope. Task checklist and the design a human approves at the gate. |
| `<app-name>.instructions.md` | Explorer, then Planner, then Developer | One per application in scope. Agent-facing execution detail: current state, file manifest, per-task instructions. |
| `<app-name>.findings.md` | Reviewer | One per application in scope. Verdict and ranked findings from the adversarial pass. |

**Two tiers per application.** `<app-name>.plan.md` is written for the human approving the plan — what is being built and how it behaves. `<app-name>.instructions.md` is written for the agent implementing it with no prior context — where the code lives, which files to touch, and what to do per task. Splitting them means the approver does not read reconnaissance and manifest rows, and the Developer does not pay for prose it cannot act on.

Plan files are per-application by design — never a fixed "backend plan / frontend plan" pair. A repo with one `fullstack` application produces one plan file.

**Reconnaissance opens the instructions file.** Each Explorer creates its own application's `<app-name>.instructions.md` containing only `## Current state`; the Planner appends the manifest and task instructions beneath it, and writes `<app-name>.plan.md` separately. One set of files per application, so concurrent Explorers never contend for the same path.

**A light-track run produces `brief.md`, `overview.md`, and `<app-name>.findings.md` only** — no plan or instructions file, since no Planner runs. Task status lives in `brief.md`; everything else here applies unchanged.

**Progress is tracked in the plan itself.** There is no separate progress file. Task status lives in the checklist at the top of the plan that defines the task; run-level state lives in `overview.md`. Every fact has exactly one home, so nothing can drift out of sync.

## Task status markers

| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress — implementation begun, `Verify` not yet passing |
| `[x]` | Complete — `Verify` passed |

The Developer sets `[~]` when it begins a task and `[x]` only once that task's `Verify` command passes. **Update the marker as status changes, never batched at the end** — the checklist is the resumption record, and a `[~]` left behind by a lost context is what tells the next agent where work was interrupted.

## `## Tasks` in `brief.md`

A light-track run has no plan, so the Developer appends its checklist to `brief.md`. Checklist and task detail are one entry, not two — only the Developer reads it, so the plan's split by audience buys nothing here. The orchestrator never writes this section.

```markdown
## Tasks
- [x] T-001 — Retry transient webhook failures · `a1b2c3d`
  - **Files:** modify `src/clients/webhook.ts`
  - **Acceptance:** a 503 retries three times, then surfaces the failure
  - **Verify:** `dotnet test --filter WebhookClientTests`
  - **Notes:** appended by the Developer — what the brief did not anticipate
```

The rules under **Task format** apply unchanged, except that there is no file manifest: the brief's **In scope** bounds the diff.

## `overview.md`

```markdown
# <Feature Title>

**Ticket:** <id or "none"> · **Apps in scope:** <names> · **Test strategy:** <from config>
**Status:** planning | awaiting-approval | in-progress | in-review | complete | blocked
**Branch:** <branch or "none">

## Requirement
What is being asked, in the requester's terms. Two paragraphs maximum.

## In scope
Bulleted, concrete, verifiable.

## Out of scope
Explicit. The Developer treats anything listed here as forbidden, not merely
deprioritized. Adjacent problems noticed during planning belong here, not in scope.

## Design
Cross-cutting decisions only — anything spanning more than one application, or
any choice a reader would otherwise question. Per-app detail belongs in the app plan.
Integration points crossing an application boundary are recorded here, since they
belong to no single app plan.

## Risks
| Risk | Likelihood | Mitigation |

## Rollback
How to revert if this ships broken. Name the feature flag, or state that revert is by git alone.

## Open questions
Tracked with the same markers as tasks. **Any unresolved entry blocks whatever it names.**
Never guess an answer and never soften a question into an assumption to keep the pipeline moving.

- [x] Q1 — Per API key or per organization? · Blocks T-002
      **Resolved:** per organization. Decided by user.
- [ ] Q2 — Should throttled requests count toward the daily quota? · Blocks nothing

Questions reach the user through the orchestrator per [escalation.md](./escalation.md).
Record who decided — an auto-accepted recommendation is marked as such, never as a user decision.

## Blockers
Empty when unblocked. Any entry halts the workflow.

## Verification
Exit-gate evidence, appended by the Developer and confirmed by the Reviewer before it
reviews.

| App | Command | Last run | Result |
```

`overview.md` carries **no per-task list**. Task status belongs to the plan file that defines the task.

## `<app-name>.plan.md`

Human-facing: what is being built and how it behaves. Section order, and who owns each:

| Section | Written by |
|---|---|
| `## Tasks` | Planner; Developer maintains the markers |
| Design sections, from the app's plan template | Planner |
| `## Test scenarios` | Planner |
| `## AI Instructions` | Planner — a one-line pointer to `<app-name>.instructions.md`, nothing more |

Nothing an approver cannot act on belongs here. Reconnaissance, file manifests, and per-task
mechanics go in the instructions file. Call stacks stay with the endpoint or flow they describe —
they are how a reviewer catches a design error, not implementation trivia.

The checklist sits first so status is the first thing any reader sees:

```markdown
# <app-name> — <Feature Title>

## Tasks
- [x] T-001 — Add rate limit configuration · `a1b2c3d`
- [~] T-002 — Redis-backed token bucket
- [ ] T-003 — Rate limit middleware
```

Each entry is `<marker> <task-id> — <title>`, with the commit's short SHA appended once complete. The Planner writes every entry as `[ ]`; the Developer maintains the markers.

Then the **design sections**, structured by the plan template for the app's `type`:

| `type` | Template |
|---|---|
| `backend`, `service` | [backend-technical-plan-template.md](../skills/pe-plan/references/backend-technical-plan-template.md) |
| `frontend`, `mobile` | [frontend-technical-plan-template.md](../skills/pe-plan/references/frontend-technical-plan-template.md) |
| `fullstack` | Both, backend sections first, in the one plan file |
| `library`, `infrastructure` | No template — document public API surface changes, consumer impact, and migration path |

A template supplies design sections only. The file heading, `Tasks`, and `AI Instructions` come from this contract, and `Current state`, `File manifest`, and `Task details` come from the instructions file; the template's own title and requirement summary are dropped, because `overview.md` already carries them.

- Emit every template section, in template order. A section with nothing to record is marked `None` with a reason, never omitted — an absent section is indistinguishable from an overlooked one. Only headings the template marks *(If applicable)* may be dropped outright.
- `<Additional…Section>` placeholders are an instruction, not an option. Expand them wherever an agent implementing with no prior context would otherwise have to derive something.
- Sections the template does not name come after the ones it does.

Required in every plan beyond the template:

| Section | Contents | Applies to |
|---|---|---|
| `## Extensibility` | Per unit introduced: the set it belongs to and its other members, or `one-off` with the reason. Per shared unit: the one set it serves and what it deliberately excludes. Where shared behavior is seated, and what adding the next member touches. | all |
| `## Test scenarios` | Table of scenario, level, expected. Happy path, boundary, failure, and authorization each named individually. | all |
| `#### Failure modes` | Per endpoint: each failure condition with the status code and body it produces. | `backend`, `service` |
| `#### States`, `#### Accessibility`, `#### Wireframe` | Per component: loading, error, and empty treatments; accessibility requirements; a low-fidelity wireframe for each new or changed flow. | `frontend`, `mobile` |

Finally `## AI Instructions` — one line pointing at `<app-name>.instructions.md`. It exists so a
reader of the plan knows where the execution detail went, and carries no detail itself.

## `<app-name>.instructions.md`

Agent-facing. Written for a Developer starting with no context beyond this file.

| Section | Written by |
|---|---|
| `## Current state` | Explorer, before any design exists. **Never edited afterward.** |
| `## File manifest` | Planner |
| `## Task details` | Planner; Developer appends `Notes` |

First `## Current state`, per [pe-explore](../skills/pe-explore/SKILL.md) — affected areas, patterns to follow with `path:line` citations, integration points, test coverage, absent abstractions, hazards.

**Current state is write-once.** It records what was true before design began, which is what makes the Planner's obligation to justify deviating from a cited precedent checkable. A later stage that edits it to fit the design destroys that. Facts that turn out to be wrong are corrected with a dated correction line appended to the section, never by rewriting the original claim.

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
- Task IDs are globally unique across the plan directory, not per file.
- Every task in the details section has a matching checklist entry in `<app-name>.plan.md`, and vice versa.
- `Reference` names the files to read before starting, and the plan sections carrying the contract this task implements. A task whose `Reference` sends the Developer hunting is under-specified.
- `Verify` must be a runnable command drawn from the app's configured `commands`. "Manually check" is not a verification.
- `Acceptance` states observable behavior, never implementation detail.
- Tasks touching a path absent from the file manifest are invalid.
- A task no single agent can complete in one sitting is too large — split it.
- `Notes` records what the plan did not anticipate, beside the task it concerns. The Planner never writes it.

## Resuming

An agent resuming after a context reset reads `overview.md` for run state, `<app-name>.plan.md` for task status, and `<app-name>.instructions.md` for current state and task detail — `brief.md` for both on a light-track run — then continues without re-deriving anything. These files are authoritative over any agent's recollection — a populated `## Current state` means exploration is done and must not be repeated.
