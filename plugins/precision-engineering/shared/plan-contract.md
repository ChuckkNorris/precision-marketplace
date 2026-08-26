# Development Plan Contract

Defines the artifacts under `docs/plans/<feature-slug>/`. The Explorer records current state, the Planner designs against it, the Developer implements and records progress, the Reviewer audits. All four treat this contract as binding.

This contract carries what more than one agent reads: which files exist, who writes each, task status, `overview.md`, and how a run resumes. **How to author a file is owned by the skill that writes it** — an agent that never writes a file does not pay to learn its section rules.

`<feature-slug>` is kebab-case, derived from the ticket ID and summary (e.g. `proj-1234-order-rate-limiting`).

## Files

| File | Written by | Purpose |
|---|---|---|
| `brief.md` | Orchestrator | Normalized requirement, whatever its source. |
| `overview.md` | Orchestrator, then Planner, then the orchestrator alone | Requirements, scope, cross-cutting design, risks, open questions, gates, run state. |
| `<app-name>.recon.md` | Explorer | One per application in scope. Current state of the code the change touches. Written before any design exists and **never edited after**. |
| `<app-name>.plan.md` | Planner, then Developer | One per application in scope. The design a human approves at the gate, and the task checklist. |
| `<app-name>.findings.md` | Reviewer | One per application in scope. Verdict and ranked findings from the adversarial pass. |

**The plan is the approval artifact.** `<app-name>.plan.md` states what is being built, how it behaves, and where it connects — enough for a human to approve and an agent to implement. Low-level mechanics are the Developer's judgment, not the plan's content. Reconnaissance stays in `<app-name>.recon.md`: it is input to the design, not evidence the design is right, so an approver never has to read past it.

**One writer per path.** Each Explorer owns one application's recon file, and each Developer its own application's plan file — which is what lets those stages run concurrently. Nothing writes a file another stage owns, which is what keeps `## Current state` falsifiable: it was recorded before any design existed to bend it toward. A recon fact that turns out wrong is corrected where it is used — the plan's **Design** or the task's **Notes** — never by editing the recon file. `overview.md` spans applications, so after the plan gate only the orchestrator writes it: subagents return status, verification rows, and blockers for it to record.

**Progress lives in the plan.** Task status sits in the checklist that defines the task, run state in `overview.md`. There is no progress file, so nothing drifts out of sync.

## Task status markers

| Marker | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress — implementation begun, `Verify` not yet passing |
| `[x]` | Complete — `Verify` passed |

The Developer sets `[~]` when it begins a task and `[x]` only once that task's `Verify` command passes. **Update the marker as status changes, never batched at the end** — the checklist is the resumption record, and a `[~]` left behind by a lost context is what tells the next agent where work was interrupted.

**Task anatomy.** Every task carries `Depends on`, `Change`, `Acceptance`, `Verify`, and `Notes`. The Planner writes all but `Notes`, which the Developer appends for what the plan did not anticipate. Task IDs are globally unique across the plan directory, not per file.

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

## Gates
Each gate's standing decision, and the evidence for it. Absent rows are gates not yet reached.

| Gate | State | Resolved by | Signal |
|---|---|---|---|
| plan | approved | @jsmith | <comment URL, or "in session"> |

## Plan feedback
Review comments routed to the Planner, per [pr-feedback.md](./pr-feedback.md). Marked `[x]`
once addressed; an entry left `[ ]` blocks approval exactly as an open question does.

## Blockers
Empty when unblocked. Any entry halts the workflow.

## Verification
Exit-gate evidence. The Developer runs the gate and returns it; the orchestrator records it.

| App | Command | Commit | Result |
|---|---|---|---|
| api | `pnpm -C apps/api test` | `a1b2c3d` | pass |
```

Each row carries the short SHA its command ran against. Review confirms those SHAs against `HEAD` rather than re-running the commands, so a row without its commit is worth nothing.

`overview.md` carries **no per-task list**. Task status belongs to the plan file that defines the task.

**Status:** the orchestrator seeds `planning` and the Planner sets `awaiting-approval`. From the plan gate onward the orchestrator owns every transition — `in-progress`, `in-review`, `complete`, `blocked` — because the stages that follow can run concurrently.

**`overview.md` is the continuation record.** It exists before any subagent runs and carries the branch, so a later invocation — a cloud agent resuming after an approval comment, or an agent recovering from a lost context — finds the run by matching its branch and continues from `Status`, `Gates`, and the task checklists. A run whose `overview.md` was never written cannot be resumed.

## Resuming

An agent resuming after a context reset reads `overview.md` for run state, `<app-name>.recon.md` for current state, and `<app-name>.plan.md` for task status and detail, then continues without re-deriving anything. These files are authoritative over any agent's recollection — an existing `<app-name>.recon.md` means exploration is done and must not be repeated.
