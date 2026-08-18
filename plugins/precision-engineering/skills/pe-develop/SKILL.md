---
name: pe-develop
description: Plan and implement a change end to end for an enterprise-grade codebase, using a subagent per stage. Takes a ticket reference or a description. Runs the full explore-plan-implement-review pipeline, or a light track straight to implement and review for small changes. Use to develop any feature, change, or fix.
---

# Precision Engineering Development Workflow

Orchestrate the stages below, delegating each to its subagent. You own sequencing, gates, git, and routing — **not** the work itself. Never do a stage's work yourself, even when it looks faster than delegating.

Each subagent invokes its own procedure skill; you do not need to restate procedure to it. Pass context, not instructions.

**Argument:** a ticket reference or a plain-language description.

## Tracks

**light** skips Explore, Plan, and the plan gate — stages 0, 4, 5, 6, 7 only. **full** runs everything. A run qualifies for light only when *every* one of these holds:

- One application in scope.
- No new dependency, no schema change, no change to a public API or contract.
- No cross-cutting design decision — the how is obvious once the what is stated.
- Small diff, local blast radius.
- A reviewer could judge it against `brief.md` alone.

Any doubt, or any "mostly", means **full**.

Propose the track at the end of stage 0 and **ask the user to confirm** per [escalation.md](../../shared/escalation.md), naming the checks that decided it. The user may force either track. **With no user available** — headless, scheduled, or CI — take the judged track without asking and record the deciding checks in `overview.md`. The track question never stalls a run.

**Promote mid-run.** Light-track work that breaches any check stops immediately: tell the user and restart on the full track from stage 1. Never finish a large change on the light track because it is already underway.

Light-track artifacts are `brief.md`, `overview.md`, and the `<app>.findings.md` files — no plan or instructions files. The Developer derives its task checklist into `brief.md` and works from there; the Reviewer judges scope against the brief in place of the plan.

## Stages

| # | Stage | Owner | Procedure | Produces | Light |
|---|---|---|---|---|---|
| 0 | Resolve context | orchestrator | — | `brief.md` | ✓ |
| 1 | Explore | Explorer | `pe-explore` | `<app>.instructions.md` — `## Current state` | — |
| 2 | Plan | Planner | `pe-plan` | `overview.md`, `<app>.plan.md`, rest of each `<app>.instructions.md` | — |
| 3 | Plan approval | orchestrator | — | gate | — |
| 4 | Branch | orchestrator | — | feature branch | ✓ |
| 5 | Implement | Developer | `pe-implement` | commits, green gate | ✓ |
| 6 | Review | Reviewer | `pe-review` | `<app>.findings.md` | ✓ |
| 7 | Pull request | orchestrator | — | PR | ✓ |

### 0 - Resolve context

1. Read [`.agents/precision-engineering.config.md`](../../precision-engineering.config.md) against [configuration-schema.md](../../shared/configuration-schema.md). **If absent, stop and tell the user to run `/pe-setup`.** Never infer commands or conventions.
2. Normalize the argument into a brief per [ticket-ingestion.md](../../shared/ticket-ingestion.md).
3. Derive `<feature-slug>`, create `docs/plans/<feature-slug>/`, write `brief.md`.
4. Determine applications in scope. When ambiguous, ask per [escalation.md](../../shared/escalation.md) — a wrong scope wastes the entire pipeline.
5. Resolve skills per the schema's resolution rules. Pass resolved config, scope, and skill list into every subagent; **subagents do not re-read config.**
6. Judge the track against the checks above and confirm it per **Tracks**. On **light**, seed `overview.md` — requirement, in and out of scope, `## Rollback` as revert by git alone (the light checks guarantee it: no schema change, no new dependency), status `in-progress` — since no Planner will write it.

### 1 - Explore

Run one Explorer per in-scope application, concurrently when more than one is in scope. Each writes `## Current state` into its own application's `<app>.instructions.md`, so concurrent Explorers never contend for a path.

### 2 - Plan

One Planner covering all in-scope applications, so cross-application design stays coherent.

Each application gets two files: `<app>.plan.md` for the human at stage 3, and `<app>.instructions.md` for the Developer at stage 5. Present the former at the gate; the latter is not review material.

### 3 - Plan approval

**Resolve escalations first.** If the Planner returned questions, ask them per [escalation.md](../../shared/escalation.md), record the answers in `overview.md`, and route back to the Planner to revise the plan before presenting it. A plan with unresolved questions is not ready for approval, whatever the gate setting.

Then, if `workflow.gates.plan` is `approve`: present the plan summary, task count, and file manifest, then **stop**. If `auto`, proceed.

### 4 - Branch

Create the branch from `git.branchPattern` off `git.pr.base`. On a dirty working tree, stop and ask. Set `overview.md` status to `in-progress` and record the branch.

### 5 - Implement

Run applications **concurrently** when their file manifests share no path and no task's `Depends on` reaches another application — the plan states both, so this is a check, not a judgment. Otherwise run them sequentially in dependency order.

Each concurrent Developer commits its own application's tasks. An overlap surfacing mid-stage stops both and restarts the stage sequentially.

If `workflow.gates.implementation` is `approve`, stop for sign-off before stage 6.

On the light track, pass the Developer `brief.md` in place of a plan and say the run is light, so it derives its own checklist.

### 6 - Review

**Confirm the gate evidence first** — yours, because you own git. Every row of the `overview.md` verification table must be green at a commit equal to `HEAD`; that is the gate, and the Reviewer reads it rather than re-runs it. Anything else goes back to the Developer before review starts.

Then run **one Reviewer across every application in scope**, telling it the commit under review. It changes nothing: every finding — a defect, a missed requirement, a standards or documentation gap — comes back to you as a report to route. **You own `overview.md` status**: `complete` when every application approves, `in-review` otherwise.

On the light track, tell the Reviewer the run is light and pass `brief.md` in place of the plan — the same handoff stage 5 makes to the Developer.

On `changes-required`, route blocking findings **back to the Developer** with the finding IDs, then re-run this stage: re-confirm the gate evidence at the new commit and continue the same Reviewer, naming the remediation range — previously reviewed commit to `HEAD` — so it re-judges the fix instead of the branch. Non-blocking findings are reported to the user; route them to the Developer only if the user asks for them.

Cap at two remediation cycles. A third means the plan is wrong: stop and route to the Planner — on the light track, that is the signal to promote and plan properly. With no user available, record the trigger under **Blockers**, set status `blocked`, and stop rather than starting a plan no one can approve.

### 7 - Pull request

If `workflow.gates.pullRequest` is `approve`, present the PR title and body and **stop before pushing** — pushing publishes the work and is not undone by deleting the branch.

On approval: push, open the PR with `git.pr` settings, body generated from `overview.md` (requirement, scope, out of scope, risks, rollback), omitting sections the run did not produce, with the plan directory linked. Report the URL.

## Escalation

Subagents cannot prompt the user; you can. Any stage may return escalations, and handling them is yours: batch them, ask with the harness's native question tool preserving the subagent's own wording and options, record the answers in `overview.md`, then route back to the subagent that raised them.

Full contract, including the payload shape and when a subagent should escalate at all: [escalation.md](../../shared/escalation.md).

- Never answer a subagent's question yourself. You have less context than the agent that raised it.
- Never rewrite its options. If they are unusable, route back and say so rather than inventing better ones.
- Never pick the recommended option to keep things moving. `workflow.escalation.unattended` governs runs with no user, and defaults to blocking.
- Continue work that does not depend on the answer. Only what the escalation's `blocks` field names is blocked.

## Follow-up routing

Route every follow-up to the subagent that owns the artifact, continuing the existing agent so its context is reused. Spawn fresh only when no prior agent exists for that artifact.

| Request concerns | Route to |
|---|---|
| Plan content, scope, task breakdown | Planner |
| Implementation, defects, fixing review findings, docs, naming, readability | Developer |
| Review verdict, disputed findings | Reviewer |
| Current-state questions about the codebase | Explorer |
| Branch, commits, PR | orchestrator |

When the owning agent's context is gone, re-hydrate a fresh instance from the plan directory — `overview.md` run state, the app plans' task checklists, and the instructions files' `## Current state` are authoritative over any agent's recollection.

## Guardrails

- Config is read once, in stage 0, and passed down. Subagents that re-read it drift.
- The exit gate runs once, in stage 5, and is confirmed by commit SHA thereafter. A stage that re-runs it is paying the run's slowest commands for an answer the verification table already holds.
- Gates and the stage 0 track confirmation are the only pause points. Never invent one, never skip one. The light track has no plan gate because it has no plan; every other gate applies to both tracks.
- The light track drops planning, never review. Implementation and review run on both tracks.
- Never advance past a red gate, an unresolved blocker in `overview.md`, or a task still marked `[~]`.
- Every artifact lands in `docs/plans/<feature-slug>/`. That directory is the audit record for the run.
- Report honestly. A stage skipped, a test failing, a finding unresolved — say so plainly.

## Running a single stage

Each stage's procedure skill is independently invocable — `/pe-review` on the current branch, `/pe-explore` on an unfamiliar area — without the pipeline, its gates, or its git handling.
