---
name: pe-develop
description: Plan and implement a change end to end for an enterprise-grade codebase, using a subagent per stage. Takes a ticket reference, a pull request, or a plain-language description. Runs the plan-implement-review pipeline. Resumes an in-flight run from its plan directory. Use to develop any feature, change, or fix.
---

# Precision Engineering Development Workflow

Orchestrate the stages below, delegating each to its subagent. You own sequencing, gates, git, cross-application alignment, and routing — **not** the work itself. Never do a stage's work yourself, even when it looks faster than delegating.

Each subagent invokes its own procedure skill and reads the configuration itself. Pass it the plan directory, its own application name, and the facts only you hold — never procedure, never restated config.

**Argument:** a ticket reference, a pull request reference, or a plain-language description.

## Stages

Every change runs every stage. There is no abbreviated path — a change too small to plan is still planned, and the plan is correspondingly small.

| # | Stage | Owner | Procedure | Produces |
|---|---|---|---|---|
| 0 | Resolve context | orchestrator | — | `brief.md`, `overview.md`, `run-context.md` |
| 1 | Branch | orchestrator | — | feature branch |
| 2 | Plan | one Planner per app | `pe-plan` | `<app>.plan.md`, aligned interface contract |
| 3 | Plan gate | orchestrator | — | gate |
| 4 | Implement | one Developer per app | `pe-implement` | commits, green gate |
| 5 | Review | one Reviewer per app | `pe-review` | `<app>.findings.md` |
| 6 | Pull request | orchestrator | — | PR |

### 0 - Resolve context

1. Read [`.agents/precision-engineering.config.md`](../../precision-engineering.config.md) against [configuration-schema.md](../../shared/configuration-schema.md). **If absent, stop and tell the user to run `/pe-setup`.** Never infer commands or conventions. A config whose `version` is older than the schema does **not** stop the run: proceed on the documented defaults for the keys it lacks, and note the drift and `/pe-setup` in your first report.
2. **Locate the run.** Look for a plan directory under `docs/plans/` whose `overview.md` records the current branch — given a pull request reference, check out its branch first.
3. **No plan directory — a new run.** Normalize the argument into a brief per [ticket-ingestion.md](../../shared/ticket-ingestion.md); derive `<feature-slug>`, create `docs/plans/<feature-slug>/`, and write `brief.md`; determine applications in scope, asking per [escalation.md](../../shared/escalation.md) when ambiguous, since a wrong scope wastes the entire pipeline; then seed `overview.md` — requirement, in and out of scope, apps in scope, status `planning`.
4. **A plan directory — a resume.** Take applications in scope from `overview.md`'s **Apps in scope**. Never re-derive it: the plan was built against that scope, and a fresh judgment that disagrees with it invalidates the plan.
5. Write `run-context.md` per [plan-contract.md](../../shared/plan-contract.md) — plan directory, branch, and ticket. On a resume, carry any existing `## Port allocations` section forward unchanged: reallocating strands the containers still holding those ports.
6. **Preflight, then start the installs.** Run every `runtime.preflight` command first and report any failure before going further — a missing tool or a stopped container daemon fails every Developer at stage 4 instead of here. Then, under `sequential`, run each in-scope application's `commands.install` in the background: they are among the slowest commands in the run and nothing before stage 4 needs them. Report a failure; never hold planning waiting on one. Under `parallel`, skip the installs — each worktree installs its own dependencies, so a warm install in the main checkout is work thrown away.

**Steps 1, 2, 5, and 6 run on every invocation.** A resumed run needs config, scope, dispatch settings, and warm installs exactly as a new one does.

**Seed `overview.md` before any subagent runs.** It is the resume record, and a run that dies before it exists cannot be continued.

#### Resuming

Continue from the located run's status:

| Status | Continue at |
|---|---|
| `planning` | Stage 2 |
| `awaiting-approval`, plan gate approved in `## Gates` | Stage 4 |
| `awaiting-approval`, feedback present | Planner revision per **Continuation** |
| `in-progress` | Stage 4, from the first task marked `[~]` or `[ ]` |
| `in-review` | Stage 5 |
| `complete` | Stage 6 |
| `blocked` | Resolve the `## Blockers` entries first. Never resume past one. |

### 1 - Branch

Create the branch from `git.branchPattern` off `git.pr.base` **before any artifact is written**, so plan and implementation share one branch and one pull request. Record it in `overview.md`.

On a dirty working tree: stop and ask, or unattended, stop and report.

### 2 - Plan

Run one Planner per in-scope application, concurrently. Each explores its own application and writes only that application's `<app>.plan.md` — current state, design, integration points, and tasks. That file is the whole gate artifact; the Developer decides low-level mechanics itself at stage 4. Each Planner returns the interfaces it needs from the other applications, its cross-cutting design, risks, and rollback, and its open questions.

**Then align the plans before the gate — this is the stage's second half, not a formality.** A mismatch caught here costs a Planner revision; the same mismatch caught at stage 5 costs a remediation cycle, and one missed there ships broken.

1. Reconcile every returned interface into `overview.md` **Interface contract**, numbered, naming its producer and consumer tasks.
2. Ask every returned question per [escalation.md](../../shared/escalation.md) and record the answers in `overview.md`.
3. Route the answers and the reconciled contract back to the affected Planners in **one** revision — wherever a question was answered, producer and consumer describe an interface differently, only one side declares it, or no task exists for something another plan depends on. Never resolve a mismatch yourself: you did not read either codebase.
4. Record the design, risks, and rollback the Planners returned, and set status `awaiting-approval`.

### 3 - Plan gate

Apply `workflow.gates.plan` per **Gate resolution**. The artifact is the plan summary and its task count; published to a pull request, it is the plan commit itself, titled per `git.pr.planTitlePattern` and opened as a draft.

**An open question is not gate-ready.** Where one could not be answered — an unattended run under `workflow.escalation.unattended: block` — record it under **Blockers**, set status `blocked`, and stop rather than presenting a plan whose design is still undecided.

### 4 - Implement

**Schedule tasks, not applications.** Serializing a whole application because one of its later tasks waits on another idles every independent task behind it — usually most of the stage. Build the schedule from the plans' `Depends on` tags:

| Edge | Means | Effect |
|---|---|---|
| `contract:` | Needs only an interface already fixed under **Interface contract** | Not a barrier. Both sides run concurrently. |
| `runtime:` | Needs the other application's code built, running, or seeding data | A barrier. The dependent task waits. |

Cut the schedule into waves: a task joins the current wave when every unmet dependency it carries is `contract:`. Run one Developer per application per wave, all concurrently, each given only that wave's task IDs. An application with tasks in later waves gets its Developer **continued**, not respawned — its context is the point.

**Under `sequential`**, run one Developer at a time in wave order. Nothing is allocated; the repository runs on its default ports.

**Under `parallel`**, allocate to every subagent that needs a stack, before spawning it:

1. A slot, numbered from 1 so the defaults stay free for whoever is working by hand. A slot is held for the run's life and never recycled — reusing one races the teardown that freed it.
2. Each port as `default + slot × runtime.portBlockSize`, then check the whole set is mutually distinct and disjoint from every default. An overlap is a `portBlockSize` too small for the repository's defaults: stop and report it rather than allocating on top of one.
3. Bind-probe each port and stop on an occupied one, naming it — a half-bound stack fails later and less clearly.
4. Append the allocations to `run-context.md` per [plan-contract.md](../../shared/plan-contract.md), then spawn — never while a subagent is reading that file.

Give each Developer its own worktree plus its slot's environment, with `{port:<name>}` substituted through `runtime.env`. **Git refuses to check out one branch in two worktrees**, so each slot's worktree gets its own branch off the run's branch, named `<branch>-<slot>`. Merge every slot branch back into the run's branch at the end of its wave, then delete the branch and remove its worktree, so the next wave, the Reviewers, and the pull request all see one history and one checkout. A conflict there means two Developers wrote the same application's files, which is a scheduling defect — report it rather than resolving it blind.

Where the harness cannot provide a worktree, `parallel` is unavailable: run `sequential` instead and report why.

Sweep anything carrying this run's prefix — stacks, worktrees, and slot branches — at the start of this stage and again at stage 6. A Developer that died mid-wave cleaned up nothing: its containers still hold its ports and its worktree still holds its branch. This sweep is the only cleanup that survives a dead subagent.

A `runtime:` edge the plan tagged `contract:` breaks the build. Stop the affected Developers, re-run that wave sequentially, and report it — it is a plan defect, not a scheduling one.

Set status `in-progress` when the stage starts, and record each Developer's returned exit-gate rows in the `overview.md` verification table as it finishes — concurrent Developers return their results rather than writing that file. Apply `workflow.gates.implementation` per **Gate resolution** before stage 5.

### 5 - Review

**Confirm the gate evidence first** — yours, because you own git. Every row of the `overview.md` verification table must be green and still valid at `HEAD`; that is the gate, and the Reviewer reads it rather than re-runs it.

A row behind `HEAD` is still valid where nothing since touched what it covers. A row is stale when `git diff --name-only <row-commit>..HEAD -- <app-path>` is non-empty, and the row for any application whose tests exercise another end to end is always stale, since those cover paths outside their own. **Name each application's stale rows for its Reviewer, which re-runs them in its own isolated stack and returns the confirming commit for you to record.** Anything red goes back to the Developer before review starts.

Then run **one Reviewer per in-scope application, concurrently**, each told its own application and the commit under review. Under `parallel`, a Reviewer re-running rows gets its own slot per stage 4's allocation. Reviewers change nothing: every finding — a defect, a missed requirement, a standards or documentation gap — comes back to you as a report to route.

**Reconcile what comes back yourself.** No Reviewer saw another application:

- The run verdict is the worst across applications. **You own `overview.md` status**: `complete` when every application approves, `in-review` otherwise.
- A defect at a shared interface is routed to every application it touches, cited as the Reviewer that raised it and its ID — `api F-003`.
- Two Reviewers judging one interface differently means the contract is ambiguous. That is a plan defect: route it to the Planner, not the Developer.

On `changes-required`, route each application's blocking findings back to its Developer with the finding IDs, then re-run this stage for the affected applications only: re-confirm their gate evidence at the new commit and continue the same Reviewers, naming the remediation range — previously reviewed commit to `HEAD` — so each re-judges the fix instead of the branch. Non-blocking findings are reported to the user; route them to the Developer only if the user asks for them.

Cap at two remediation cycles. A third means the plan is wrong: stop and route to the Planner. Unattended, record the trigger under **Blockers**, set status `blocked`, and stop rather than starting a plan no one can approve.

### 6 - Pull request

The body comes from `overview.md` — requirement, scope, out of scope, risks, rollback — omitting sections the run did not produce, with the plan directory linked.

**A draft PR already open from stage 3:** update its body and mark it ready for review. **Otherwise:** push and open it with `git.pr` settings.

Apply `workflow.gates.pullRequest` per **Gate resolution** before publishing: attended, present the title and body and stop, because publishing is not undone by deleting the branch. Unattended, the pull request *is* the presentation — open or update it as a draft and stop, leaving ready-for-review and merge to the human. Report the URL.

## Gate resolution

A gate set to `approve` means a human decides. **Which channel carries that decision is a property of the run, not the config** — so one configuration serves an interactive session and a cloud agent alike. Detect attendance per [escalation.md](../../shared/escalation.md); `workflow.gates.channel` overrides it only when set.

| Run | Do |
|---|---|
| Attended | Present the artifact and **stop**. The answer arrives in this conversation. |
| Unattended | Commit the artifacts, push, and open or update the draft pull request. Record the gate `pending` in `## Gates` with the URL, set the matching status, and **stop**. Approval arrives later per **Continuation**. |

Never downgrade a gate because its channel is inconvenient: an unattended run does not proceed on `auto` reasoning, and an attended one does not publish to avoid asking.

## Subagent dispatch

Each stage's subagent runs on the `model` declared for that stage's step in `workflow.steps`:

| Step | Stage | Subagent |
|---|---|---|
| `plan` | 2 | Planner |
| `implement` | 4 | Developer |
| `review` | 5 | Reviewer |

Set a model on the launch **only where the config declares one**, passing the declared value as written rather than composing one. A step with no `model` runs on your own session's model: pass `inherit` where the launch accepts it, and omit the launch's model parameter where it does not. Never infer a model from a role, and never fall back to another when the harness rejects one — that is a config error, so report it, name the step, and stop.

The model is applied at launch, so a continued subagent keeps the one it started with and a config edited mid-run takes effect on the next fresh spawn. Concurrent Planners, Developers, and Reviewers each launch on their own step's model.

## Continuation

Cloud, scheduled, and headless runs re-enter through stage 0's resume check, and resolve their pending gates by a signal on the pull request rather than by a turn in this conversation.

1. **Claim the run.** Apply `workflow.continuation.claimLabel` before working. Already present: exit immediately, unless the platform's timeline shows it applied more than `claimTimeoutMinutes` ago — a claim that old belongs to an agent that died, so reclaim it and note the takeover. Read that age from the platform, never from anything an agent wrote: a crashed agent's own timestamp is exactly what cannot be trusted.
2. **Read the signal.** `workflow.continuation.approveToken` in a comment approves the pending gate; `reviseToken`, or any other comment carrying plan feedback, means revise. Record state, resolver, and the comment URL in `## Gates`.
3. **Revise, never restart.** Feedback routes to the Planner owning the application it names, per [pr-feedback.md](../../shared/pr-feedback.md), and re-runs stage 2's alignment. Re-commit, leave the gate `pending`, and stop — a revision is not an approval.
4. **Release the claim on every exit path** — finishing, stopping at a gate, stopping on a blocker, and failing. A stuck claim is recovered by removing the label by hand.

The claim prevents wasted parallel work, not corruption: two agents on one branch already collide at push time, where git rejects the non-fast-forward. That is why reclaiming an expired one is safe.

**Authorization is not yours.** Whoever invoked you has already decided the commenter may approve. Record who; never judge whether they could.

A gate already `approved` in `## Gates` is never re-run: continue from status instead. Stop and report after `workflow.continuation.maxTriggers` resolutions on one plan directory.

## Escalation

Subagents cannot prompt the user; you can. Any stage may return escalations: batch them, ask with the harness's native question tool in the subagent's own wording and options, record the answers in `overview.md`, then route them back to the subagent that raised them. Never answer one yourself, never rewrite its options — route back and say so if they are unusable — and never pick the recommended option to keep things moving. Only what an escalation's `blocks` field names is blocked; continue everything else.

Full contract, including the payload shape, `workflow.escalation.unattended`, and when a subagent should escalate at all: [escalation.md](../../shared/escalation.md).

## Follow-up routing

Route every follow-up to the subagent that owns the artifact, continuing the existing agent so its context is reused. Spawn fresh only when no prior agent exists for that artifact.

| Request concerns | Route to |
|---|---|
| Plan content, scope, task breakdown, current state of the codebase | that application's Planner |
| Implementation, defects, fixing review findings, docs, naming, readability | that application's Developer |
| Review verdict, disputed findings | that application's Reviewer |
| Branch, commits, PR | orchestrator |

Any change to one plan re-runs stage 2's alignment before implementation resumes. When the owning agent's context is gone, re-hydrate a fresh instance from the plan directory — `overview.md` run state and the app plans' task checklists are authoritative over any agent's recollection.

## Guardrails

- You resolve only what you use: scope, git, gates, strategy, and each step's `model`. Subagents read the config themselves against the schema's resolution rules — never restate it to them, and never pass a model as context, since it is applied when you launch the subagent.
- Every `model` a step declares launches with it applied, or the run stops with it named. A declared model in neither the launch nor the report was dropped.
- **Only you write `overview.md`** — status, design, interface contract, risks, rollback, verification rows, blockers, and gates. Subagents return those facts; you record them.
- No stage begins on an unaligned interface contract. Stage 2 reconciles it, and every later change to a plan re-runs that reconciliation.
- The exit gate runs once, in stage 4, and is confirmed by commit SHA thereafter. A stale row is re-run by that application's Reviewer, never by you.
- Gates are the only pause points. Never invent one, never skip one.
- Every gate resolution is recorded in `## Gates` with who resolved it and the signal. An unrecorded approval cannot be audited and will be re-asked on the next resume.
- Every stage runs on every change. Never skip planning because a change looks small.
- Never advance past a red gate, an unresolved blocker in `overview.md`, or a task still marked `[~]`.
- Every artifact lands in `docs/plans/<feature-slug>/`. That directory is the audit record for the run, and the only state a later invocation inherits.
- Report honestly. A stage skipped, a test failing, a finding unresolved — say so plainly.

## Running a single stage

Each stage's procedure skill is independently invocable — `/pe-plan` on an unfamiliar area, `/pe-review` on the current branch — without the pipeline, its gates, or its git handling.
