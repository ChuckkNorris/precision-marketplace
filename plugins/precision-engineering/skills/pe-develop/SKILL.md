---
name: pe-develop
description: Plan and implement a change end to end for an enterprise-grade codebase, using a subagent per stage. Takes a ticket reference, a pull request, or a plain-language description. Runs the full explore-plan-implement-review pipeline, or a light track straight to implement and review for small changes. Resumes an in-flight run from its plan directory. Use to develop any feature, change, or fix.
---

# Precision Engineering Development Workflow

Orchestrate the stages below, delegating each to its subagent. You own sequencing, gates, git, and routing — **not** the work itself. Never do a stage's work yourself, even when it looks faster than delegating.

Each subagent invokes its own procedure skill; you do not need to restate procedure to it. Pass context, not instructions.

**Argument:** a ticket reference, a pull request reference, or a plain-language description.

## Tracks

**light** skips Explore, Plan, and the plan gate — stages 0, 1, 5, 6, 7 only. **full** runs everything. A run qualifies for light only when *every* one of these holds:

- One application in scope.
- No new dependency, no schema change, no change to a public API or contract.
- No cross-cutting design decision — the how is obvious once the what is stated.
- Small diff, local blast radius.
- A reviewer could judge it against `brief.md` alone.

Any doubt, or any "mostly", means **full**.

Propose the track at the end of stage 0 and **ask the user to confirm** per [escalation.md](../../shared/escalation.md), naming the checks that decided it. The user may force either track. Unattended, take the judged track without asking and record the deciding checks in `overview.md` — the track question never stalls a run.

**Promote mid-run.** Light-track work that breaches any check stops immediately: tell the user and restart on the full track from stage 2. Never finish a large change on the light track because it is already underway.

Light-track artifacts are `brief.md`, `overview.md`, and the `<app>.findings.md` files — no plan or instructions files. The Developer derives its task checklist into `brief.md` and works from there; the Reviewer judges scope against the brief in place of the plan.

## Stages

| # | Stage | Owner | Procedure | Produces | Light |
|---|---|---|---|---|---|
| 0 | Resolve context | orchestrator | — | `brief.md`, `overview.md` | ✓ |
| 1 | Branch | orchestrator | — | feature branch | ✓ |
| 2 | Explore | Explorer | `pe-explore` | `<app>.instructions.md` — `## Current state` | — |
| 3 | Plan | Planner | `pe-plan` | `<app>.plan.md`, rest of each `<app>.instructions.md` | — |
| 4 | Plan gate | orchestrator | — | gate | — |
| 5 | Implement | Developer | `pe-implement` | commits, green gate | ✓ |
| 6 | Review | Reviewer | `pe-review` | `<app>.findings.md` | ✓ |
| 7 | Pull request | orchestrator | — | PR | ✓ |

### 0 - Resolve context

1. **Resume first.** Look for a plan directory under `docs/plans/` whose `overview.md` records the current branch — given a pull request reference, check out its branch first. Found one: honour the resume table below and skip the rest of this stage. Those files are authoritative over anything you would otherwise re-derive.
2. Read [`.agents/precision-engineering.config.md`](../../precision-engineering.config.md) against [configuration-schema.md](../../shared/configuration-schema.md). **If absent, stop and tell the user to run `/pe-setup`.** Never infer commands or conventions.
3. Normalize the argument into a brief per [ticket-ingestion.md](../../shared/ticket-ingestion.md).
4. Derive `<feature-slug>`, create `docs/plans/<feature-slug>/`, write `brief.md`.
5. Determine applications in scope. When ambiguous, ask per [escalation.md](../../shared/escalation.md) — a wrong scope wastes the entire pipeline.
6. Resolve skills per the schema's resolution rules. Pass resolved config, scope, and skill list into every subagent; **subagents do not re-read config.**
7. Judge the track against the checks above and confirm it per **Tracks**.
8. Seed `overview.md` — requirement, in and out of scope, status `planning`, and the deciding track checks. The Planner fills in design, risks, and rollback; on the light track no Planner runs, so also write `## Rollback` as revert by git alone, which the light checks guarantee.

**Seed `overview.md` before any subagent runs.** It is the resume record, and a run that dies before it exists cannot be continued.

#### Resuming

| Status found | Resume at |
|---|---|
| *(no plan directory)* | Stage 0, from step 2 |
| `planning` | Stage 2 — Explore, unless `## Current state` is already populated |
| `awaiting-approval`, plan gate approved | Stage 5 |
| `awaiting-approval`, feedback present | Planner revision per **Continuation** |
| `in-progress` | Stage 5, from the first task marked `[~]` or `[ ]` |
| `in-review` | Stage 6 |
| `complete` | Stage 7 |
| `blocked` | Resolve the `## Blockers` entries first. Never resume past one. |

### 1 - Branch

Create the branch from `git.branchPattern` off `git.pr.base` **before any artifact is written**, so plan and implementation share one branch and one pull request. Record it in `overview.md`.

On a dirty working tree: stop and ask, or unattended, stop and report.

### 2 - Explore

Run one Explorer per in-scope application, concurrently when more than one is in scope. Each writes `## Current state` into its own application's `<app>.instructions.md`, so concurrent Explorers never contend for a path.

### 3 - Plan

One Planner covering all in-scope applications, so cross-application design stays coherent.

Each application gets two files: `<app>.plan.md` for the human at stage 4, and `<app>.instructions.md` for the Developer at stage 5. Present the former at the gate; the latter is not review material.

### 4 - Plan gate

**Resolve escalations first.** If the Planner returned questions, ask them per [escalation.md](../../shared/escalation.md), record the answers in `overview.md`, and route back to the Planner to revise the plan before presenting it. A plan with unresolved questions is not ready for approval, whatever the gate setting.

Then apply `workflow.gates.plan` per **Gate resolution**. The artifact is the plan summary, task count, and file manifest; published to a pull request, it is the plan commit itself, titled per `git.pr.planTitlePattern` and opened as a draft.

### 5 - Implement

Run applications **concurrently** when their file manifests share no path and no task's `Depends on` reaches another application — the plan states both, so this is a check, not a judgment. Otherwise run them sequentially in dependency order.

Each concurrent Developer commits its own application's tasks. An overlap surfacing mid-stage stops both and restarts the stage sequentially.

Set status `in-progress` when the stage starts. Apply `workflow.gates.implementation` per **Gate resolution** before stage 6.

On the light track, pass the Developer `brief.md` in place of a plan and say the run is light, so it derives its own checklist.

### 6 - Review

**Confirm the gate evidence first** — yours, because you own git. Every row of the `overview.md` verification table must be green at a commit equal to `HEAD`; that is the gate, and the Reviewer reads it rather than re-runs it. Anything else goes back to the Developer before review starts.

Then run **one Reviewer across every application in scope**, telling it the commit under review. It changes nothing: every finding — a defect, a missed requirement, a standards or documentation gap — comes back to you as a report to route. **You own `overview.md` status**: `complete` when every application approves, `in-review` otherwise.

On the light track, tell the Reviewer the run is light and pass `brief.md` in place of the plan — the same handoff stage 5 makes to the Developer.

On `changes-required`, route blocking findings **back to the Developer** with the finding IDs, then re-run this stage: re-confirm the gate evidence at the new commit and continue the same Reviewer, naming the remediation range — previously reviewed commit to `HEAD` — so it re-judges the fix instead of the branch. Non-blocking findings are reported to the user; route them to the Developer only if the user asks for them.

Cap at two remediation cycles. A third means the plan is wrong: stop and route to the Planner — on the light track, that is the signal to promote and plan properly. Unattended, record the trigger under **Blockers**, set status `blocked`, and stop rather than starting a plan no one can approve.

### 7 - Pull request

The body comes from `overview.md` — requirement, scope, out of scope, risks, rollback — omitting sections the run did not produce, with the plan directory linked.

**A draft PR already open from stage 4:** update its body and mark it ready for review. **Otherwise:** push and open it with `git.pr` settings.

Apply `workflow.gates.pullRequest` per **Gate resolution** before publishing: attended, present the title and body and stop, because publishing is not undone by deleting the branch. Unattended, the pull request *is* the presentation — open or update it as a draft and stop, leaving ready-for-review and merge to the human. Report the URL.

## Gate resolution

A gate set to `approve` means a human decides. **Which channel carries that decision is a property of the run, not the config** — so one configuration serves an interactive session and a cloud agent alike. Detect attendance per [escalation.md](../../shared/escalation.md); `workflow.gates.channel` overrides it only when set.

| Run | Do |
|---|---|
| Attended | Present the artifact and **stop**. The answer arrives in this conversation. |
| Unattended | Commit the artifacts, push, and open or update the draft pull request. Record the gate `pending` in `## Gates` with the URL, set the matching status, and **stop**. Approval arrives later per **Continuation**. |

Never downgrade a gate because its channel is inconvenient: an unattended run does not proceed on `auto` reasoning, and an attended one does not publish to avoid asking.

## Continuation

Cloud, scheduled, and headless runs re-enter through stage 0's resume check, and resolve their pending gates by a signal on the pull request rather than by a turn in this conversation.

1. **Claim the run.** Apply the `pe:running` label before working, and exit immediately if it is already present — another agent holds this branch.
2. **Read the signal.** `workflow.continuation.approveToken` in a comment approves the pending gate; `reviseToken`, or any other comment carrying plan feedback, means revise. Record state, resolver, and the comment URL in `## Gates`.
3. **Revise, never restart.** Feedback routes to the Planner per [pr-feedback.md](../../shared/pr-feedback.md). Re-commit, leave the gate `pending`, and stop — a revision is not an approval.
4. **Release the label** when you stop, whatever the outcome.

**Authorization is not yours.** Whoever invoked you has already decided the commenter may approve. Record who; never judge whether they could.

A gate already `approved` in `## Gates` is never re-run: continue from status instead. Stop and report after `workflow.continuation.maxTriggers` resolutions on one plan directory.

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
- Every gate resolution is recorded in `## Gates` with who resolved it and the signal. An unrecorded approval cannot be audited and will be re-asked on the next resume.
- The light track drops planning, never review. Implementation and review run on both tracks.
- Never advance past a red gate, an unresolved blocker in `overview.md`, or a task still marked `[~]`.
- Every artifact lands in `docs/plans/<feature-slug>/`. That directory is the audit record for the run, and the only state a later invocation inherits.
- Report honestly. A stage skipped, a test failing, a finding unresolved — say so plainly.

## Running a single stage

Each stage's procedure skill is independently invocable — `/pe-review` on the current branch, `/pe-explore` on an unfamiliar area — without the pipeline, its gates, or its git handling.
