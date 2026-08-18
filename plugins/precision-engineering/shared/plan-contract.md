# Development Plan Contract

Defines the artifacts under `docs/plans/<feature-slug>/`. The Explorer records current state, the Planner designs against it, the Developer implements and records progress, the Reviewer audits. All four treat this contract as binding.

This contract carries what more than one agent reads: which files exist, who writes each, task status, `overview.md`, and how a run resumes. **How to author a file is owned by the skill that writes it** — an agent that never writes a file does not pay to learn its section rules.

`<feature-slug>` is kebab-case, derived from the ticket ID and summary (e.g. `proj-1234-order-rate-limiting`).

## Files

| File | Written by | Purpose |
|---|---|---|
| `brief.md` | Orchestrator | Normalized requirement, whatever its source. On a light-track run, also the Developer's task checklist. |
| `overview.md` | Planner (orchestrator on a light-track run), then Developer, then orchestrator | Requirements, scope, cross-cutting design, risks, open questions, run state. |
| `<app-name>.plan.md` | Planner, then Developer | One per application in scope. Task checklist and the design a human approves at the gate. |
| `<app-name>.instructions.md` | Explorer, then Planner, then Developer | One per application in scope. Agent-facing execution detail: current state, file manifest, per-task instructions. |
| `<app-name>.findings.md` | Reviewer | One per application in scope. Verdict and ranked findings from the adversarial pass. |

**Two tiers per application.** `<app-name>.plan.md` is for the human approving at the gate — what is being built and how it behaves. `<app-name>.instructions.md` is for the agent implementing it with no prior context — where the code lives, which files to touch, what to do per task. Neither carries the other's content.

**One writer per path.** Each Explorer owns one application's instructions file, which is what lets stage 1 run concurrently.

**Progress lives in the plan.** Task status sits in the checklist that defines the task, run state in `overview.md`. There is no progress file, so nothing drifts out of sync.

**A light-track run produces `brief.md`, `overview.md`, and the findings files only** — no plan or instructions file, since no Planner runs. Task status lives in `brief.md`; everything else here applies unchanged.

## Task status markers

| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress — implementation begun, `Verify` not yet passing |
| `[x]` | Complete — `Verify` passed |

The Developer sets `[~]` when it begins a task and `[x]` only once that task's `Verify` command passes. **Update the marker as status changes, never batched at the end** — the checklist is the resumption record, and a `[~]` left behind by a lost context is what tells the next agent where work was interrupted.

**Task anatomy.** Every task carries `Depends on`, `Files`, `Reference`, `Change`, `Acceptance`, `Verify`, and `Notes`. The Planner writes all but `Notes`, which the Developer appends for what the plan did not anticipate. Task IDs are globally unique across the plan directory, not per file.

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
Exit-gate evidence, appended by the Developer.

| App | Command | Commit | Result |
|---|---|---|---|
| api | `pnpm -C apps/api test` | `a1b2c3d` | pass |
```

The Developer records the short SHA each command ran against. Review confirms those SHAs against `HEAD` rather than re-running the commands, so a row without its commit is worth nothing.

`overview.md` carries **no per-task list**. Task status belongs to the plan file that defines the task.

**Status:** the Planner sets `awaiting-approval`, the Developer `in-review` at its exit gate, and the orchestrator `complete` or `blocked` once it holds the Reviewer's verdict.

## Resuming

An agent resuming after a context reset reads `overview.md` for run state, `<app-name>.plan.md` for task status, and `<app-name>.instructions.md` for current state and task detail — `brief.md` for both on a light-track run — then continues without re-deriving anything. These files are authoritative over any agent's recollection — a populated `## Current state` means exploration is done and must not be repeated.
