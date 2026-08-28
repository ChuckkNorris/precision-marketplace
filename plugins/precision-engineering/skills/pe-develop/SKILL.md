---
name: pe-develop
description: Plan and implement a change end to end for an enterprise-grade codebase, using a subagent per stage. Takes a ticket reference, a pull request, or a plain-language description. Runs the explore-plan-implement-review pipeline. Resumes an in-flight run from its plan directory. Use to develop any feature, change, or fix.
---

# Precision Engineering Development Workflow

Orchestrate the stages below, delegating each to its subagent. You own sequencing, gates, git, and routing — **not** the work itself. Never do a stage's work yourself, even when it looks faster than delegating.

Each subagent invokes its own procedure skill; you do not need to restate procedure to it. Pass context, not instructions.

**Argument:** a ticket reference, a pull request reference, or a plain-language description.

## Stages

Every change runs every stage. There is no abbreviated path — a change too small to plan is still planned, and the plan is correspondingly small.

| # | Stage | Owner | Procedure | Produces |
|---|---|---|---|---|
| 0 | Resolve context | orchestrator | — | `brief.md`, `overview.md` |
| 1 | Branch | orchestrator | — | feature branch |
| 2 | Explore | Explorer | `pe-explore` | `<app>.recon.md` |
| 3 | Plan | Planner | `pe-plan` | `<app>.plan.md` |
| 4 | Plan gate | orchestrator | — | gate |
| 5 | Implement | Developer | `pe-implement` | commits, green gate |
| 6 | Review | Reviewer | `pe-review` | `<app>.findings.md` |
| 7 | Pull request | orchestrator | — | PR |

### 0 - Resolve context

1. Read [`.agents/precision-engineering.config.md`](../../precision-engineering.config.md) against [configuration-schema.md](../../shared/configuration-schema.md). **If absent, stop and tell the user to run `/pe-setup`.** Never infer commands or conventions. A config whose `version` is older than the schema does **not** stop the run: proceed on the documented defaults for the keys it lacks, and note the drift and `/pe-setup` in your first report.
2. **Locate the run.** Look for a plan directory under `docs/plans/` whose `overview.md` records the current branch — given a pull request reference, check out its branch first.
3. **No plan directory — a new run.** Normalize the argument into a brief per [ticket-ingestion.md](../../shared/ticket-ingestion.md); derive `<feature-slug>`, create `docs/plans/<feature-slug>/`, and write `brief.md`; determine applications in scope, asking per [escalation.md](../../shared/escalation.md) when ambiguous, since a wrong scope wastes the entire pipeline; then seed `overview.md` — requirement, in and out of scope, apps in scope, status `planning`. The Planner fills in design, risks, and rollback.
4. **A plan directory — a resume.** Take applications in scope from `overview.md`'s **Apps in scope**. Never re-derive it: the plan was built against that scope, and a fresh judgment that disagrees with it invalidates the plan.
5. Resolve skills per the schema's resolution rules, read each step's `model` from `workflow.steps`, then write `run-context.md` per [plan-contract.md](../../shared/plan-contract.md) — resolved config, scope, and each application's skill list, in one file. Pass every subagent that file's path and its own application name; **subagents read `run-context.md`, never the config file.** One file written once carries the same no-drift guarantee as restating it in every prompt, at a fraction of the handoff cost. On a resume, carry any existing `## Port allocations` section forward unchanged — this step rewrites the rest of the file, and reallocating strands whatever is still holding the old ports. A model is not context you pass — it is applied when you launch the subagent, per **Subagent dispatch**.
6. **Preflight, then start the installs.** Run every `runtime.preflight` command first and report any failure before going further — a tool that is absent or not responding fails every Developer at stage 5 instead of here. Then, under `sequential`, run each in-scope application's `commands.install` in the background: they are among the slowest commands in the run and nothing before stage 5 needs them, so an install still running when a Developer starts is pure delay. Report a failure; never hold stage 2 waiting on one. Under `parallel`, skip the installs — each worktree installs its own dependencies, so a warm install in the main checkout is work thrown away.

**Steps 1, 2, 5, and 6 run on every invocation.** A resumed run needs config, scope, skills, dispatch settings, and warm installs exactly as a new one does — subagents never re-read config, so a resume that skips this stage reaches Implement with no commands and no standards.

**Seed `overview.md` before any subagent runs.** It is the resume record, and a run that dies before it exists cannot be continued.

#### Resuming

Continue from the located run's status:

| Status | Continue at |
|---|---|
| `planning` | Stage 2 — or stage 3, where every in-scope application already has a `<app>.recon.md` |
| `awaiting-approval`, plan gate approved in `## Gates` | Stage 5 |
| `awaiting-approval`, feedback present | Planner revision per **Continuation** |
| `in-progress` | Stage 5, from the first task marked `[~]` or `[ ]` |
| `in-review` | Stage 6 |
| `complete` | Stage 7 |
| `blocked` | Resolve the `## Blockers` entries first. Never resume past one. |

### 1 - Branch

Create the branch from `git.branchPattern` off `git.pr.base` **before any artifact is written**, so plan and implementation share one branch and one pull request. Record it in `overview.md`.

On a dirty working tree: stop and ask, or unattended, stop and report.

### 2 - Explore

Run one Explorer per in-scope application, concurrently when more than one is in scope. Each writes its own application's `<app>.recon.md`, so concurrent Explorers never contend for a path.

### 3 - Plan

One Planner covering all in-scope applications, so cross-application design stays coherent.

Each application gets one plan file, `<app>.plan.md` — design, integration points, and tasks. It is the whole gate artifact: reconnaissance stays in `<app>.recon.md`, and the Developer decides low-level mechanics itself at stage 5.

### 4 - Plan gate

**Resolve escalations first.** If the Planner returned questions, ask them per [escalation.md](../../shared/escalation.md), record the answers in `overview.md`, and route back to the Planner to revise the plan before presenting it. A plan with unresolved questions is not ready for approval, whatever the gate setting.

Then apply `workflow.gates.plan` per **Gate resolution**. The artifact is the plan summary and its task count; published to a pull request, it is the plan commit itself, titled per `git.pr.planTitlePattern` and opened as a draft.

### 5 - Implement

**Schedule tasks, not applications.** Serializing a whole application because one of its later tasks waits on another idles every independent task behind it — usually most of the stage. Build the schedule from the plans' `Depends on` tags:

| Edge | Means | Effect |
|---|---|---|
| `contract:` | Needs only an interface already fixed under **Interface contract** | Not a barrier. Both sides run concurrently. |
| `runtime:` | Needs the other application's code built, running, or seeding data | A barrier. The dependent task waits. |

Cut the schedule into waves: a task joins the current wave when every unmet dependency it carries is `contract:`. Run one Developer per application per wave, all concurrently, each given only that wave's task IDs. An application with tasks in later waves gets its Developer **continued while it is under its `contextBudget`**, and a fresh one once it is past it — see **Retiring a subagent**.

**Under `sequential`**, run one Developer at a time in wave order. Nothing is allocated; the repository runs on its default ports.

**Under `parallel`**, before spawning each wave:

1. Assign every Developer a slot, numbered from 1 so the defaults stay free for whoever is working by hand. A slot is held for the run's life and never recycled — reusing one races the teardown that freed it.
2. Compute each port as `default + slot × runtime.portBlockSize`, then check the whole set is mutually distinct and disjoint from every default. An overlap is a `portBlockSize` too small for the repository's defaults: stop and report it rather than allocating on top of one.
3. Bind-probe each port and stop on an occupied one, naming it — a half-bound stack fails later and less clearly.
4. Append the allocations to `run-context.md` per [plan-contract.md](../../shared/plan-contract.md), then spawn — never while a Developer is reading that file.

Give each Developer its own worktree plus its slot's environment, with `{port:<name>}` substituted through `runtime.env`. **Git refuses to check out one branch in two worktrees**, so each slot's worktree gets its own branch off the run's branch, named `<branch>-<slot>`. Merge every slot branch back into the run's branch at the end of its wave, then delete the branch and remove its worktree, so the next wave, the Reviewer, and the pull request all see one history and one checkout. A conflict there means two Developers wrote the same application's files, which is a scheduling defect — report it rather than resolving it blind.

Where the harness cannot provide a worktree, `parallel` is unavailable: run `sequential` instead and report why.

Sweep anything carrying this run's prefix — stacks, worktrees, and slot branches — at the start of this stage and again at stage 7. A Developer that died mid-wave cleaned up nothing: whatever `runtime.up` started still holds its ports, and its worktree still holds its branch. This sweep is the only cleanup that survives a dead subagent.

A `runtime:` edge the plan tagged `contract:` breaks the build. Stop the affected Developers, re-run that wave sequentially, and report it — it is a plan defect, not a scheduling one.

**A returned `stackDiagnosis` is yours to route, not to solve.** Spawn a Stack Doctor on the `stackDoctor` step's model, give it the failing command, its output, the application, `run-context.md`, and that Developer's assigned environment — never the plan or the recon. Then act on its verdict:

| Verdict | Do |
|---|---|
| `fixed-by` | Continue the Developer with the fix. |
| `code-defect` | Continue the Developer with the diagnosis; the fix is its task. |
| `environment` | The host is wrong, not the repository. Attended, tell the user and stop; unattended, record it under **Blockers** and set status `blocked`. |
| `flake` | Continue the Developer and tell it to retry once. |
| `undiagnosed` | Re-run that task sequentially with the defaults free, and report. A second `undiagnosed` on the same cause is a blocker, not a third attempt. |

**Never debug the stack yourself.** You own sequencing, gates, git, and routing; a stack that will not start is none of those. Your context is the only one in the run that cannot be retired, so work you absorb is charged for the rest of the run — and reading logs is exactly the work the Stack Doctor exists to keep out of an expensive context. The same applies at stage 6.

### Retiring a subagent

`workflow.steps.<step>.contextBudget` bounds how large a Developer or Reviewer is allowed to get. Once a subagent's context passes its budget, **retire it at the next safe handoff point and spawn a fresh one for the remaining work.**

A handoff point is safe when the plan directory is a complete record of where the work stands: the task is `[x]`, its `Verify` passed, and it is committed with its SHA in the checklist. Mid-task is never safe — the successor would inherit a `[~]` marker and an uncommitted tree. Wave boundaries and remediation hand-offs are always safe, because they already are that.

Give the successor what a resume gets — `run-context.md`, its application's plan and recon, and the remaining task IDs — and nothing of the predecessor's transcript. The checklist, the per-task **Notes**, and the commits are authoritative over any agent's recollection; that is what the markers are for.

Two constraints:

- **`git.commitGranularity: squashed` disables this.** With nothing committed, retiring a subagent discards its work. Carry the subagent through the stage and note that the budget was unenforceable.
- **A budget is a ceiling, not a target.** Never retire a subagent that is under budget to make the schedule look tidier; the re-read is real cost, and a stage that fragments into agents spending their first turns orienting is worse than one long agent.

Set status `in-progress` when the stage starts, and record each Developer's returned exit-gate rows in the `overview.md` verification table as it finishes — concurrent Developers return their results rather than writing that file. Apply `workflow.gates.implementation` per **Gate resolution** before stage 6.

### 6 - Review

**Confirm the gate evidence first** — yours, because you own git. Every row of the `overview.md` verification table must be green and still valid at `HEAD`; that is the gate, and the Reviewer reads it rather than re-runs it.

A row behind `HEAD` is still valid where nothing since touched what it covers. A row is stale when `git diff --name-only <row-commit>..HEAD -- <app-path>` is non-empty, and the row for any application whose tests exercise another end to end is always stale, since those cover paths outside their own. **Name the stale rows for the Reviewer, which re-runs them in its own isolated stack and records the confirming commit.** Anything red goes back to the Developer before review starts.

Then run **one Reviewer across every application in scope**, telling it the commit under review. It changes nothing: every finding — a defect, a missed requirement, a standards or documentation gap — comes back to you as a report to route. **You own `overview.md` status**: `complete` when every application approves, `in-review` otherwise.

On `changes-required`, route blocking findings **back to the Developer** with the finding IDs, then re-run this stage: re-confirm the gate evidence at the new commit and continue the same Reviewer, naming the remediation range — previously reviewed commit to `HEAD` — so it re-judges the fix instead of the branch. Non-blocking findings are reported to the user; route them to the Developer only if the user asks for them.

Cap at two remediation cycles. A third means the plan is wrong: stop and route to the Planner. Unattended, record the trigger under **Blockers**, set status `blocked`, and stop rather than starting a plan no one can approve.

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

## Subagent dispatch

Each stage's subagent runs on the `model` declared for that stage's step in `workflow.steps`:

| Step | Stage | Subagent |
|---|---|---|
| `explore` | 2 | Explorer |
| `plan` | 3 | Planner |
| `implement` | 5 | Developer |
| `review` | 6 | Reviewer |
| `stackDoctor` | 5, 6 | Stack Doctor — on demand, not per stage |

Set a model on the launch **only where the config declares one**. A step with no `model` defaults to `inherit` — inherit the current session. Pass `inherit` where the launch accepts it, and omit the launch's model parameter where it does not; either way the subagent stays on your own session's model. Never infer a model from a role: no step has one until a repository names it. Pass a declared value as written rather than composing one — the values a subagent launch accepts are not always those your own session offers.

A value the harness rejects is a config error: report it, name the step, and stop. Never fall back to another model.

This is a launch-time setting. A continued subagent keeps the model it started with, so a config edited mid-run takes effect on the next fresh spawn — see **Follow-up routing**. Concurrent Explorers and Developers each launch on their own step's model.

## Continuation

Cloud, scheduled, and headless runs re-enter through stage 0's resume check, and resolve their pending gates by a signal on the pull request rather than by a turn in this conversation.

1. **Claim the run.** Apply `workflow.continuation.claimLabel` before working. Already present: exit immediately, unless the platform's timeline shows it applied more than `claimTimeoutMinutes` ago — a claim that old belongs to an agent that died, so reclaim it and note the takeover. Read that age from the platform, never from anything an agent wrote: a crashed agent's own timestamp is exactly what cannot be trusted.
2. **Read the signal.** `workflow.continuation.approveToken` in a comment approves the pending gate; `reviseToken`, or any other comment carrying plan feedback, means revise. Record state, resolver, and the comment URL in `## Gates`.
3. **Revise, never restart.** Feedback routes to the Planner per [pr-feedback.md](../../shared/pr-feedback.md). Re-commit, leave the gate `pending`, and stop — a revision is not an approval.
4. **Release the claim on every exit path** — finishing, stopping at a gate, stopping on a blocker, and failing. A stuck claim is recovered by removing the label by hand.

The claim prevents wasted parallel work, not corruption: two agents on one branch already collide at push time, where git rejects the non-fast-forward. That is why reclaiming an expired one is safe.

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

Route every follow-up to the subagent that owns the artifact. **Continue the existing agent only where its accumulated context is what makes the answer correct** — a Planner revising a design it reasoned through, or a Reviewer re-judging a remediation against the branch it already read. Everywhere else, spawn fresh against the plan directory.

A Developer past its `contextBudget` is retired, not continued. A finished implementation's context is not what makes a follow-up correct — the plan, the checklist with its SHAs, the per-task **Notes**, and the findings file are, and they are on disk. Continuing one to fix a typo or edit a document charges the whole implementation history against a one-file change.

| Request concerns | Route to |
|---|---|
| Plan content, scope, task breakdown | Planner |
| Implementation, defects, fixing review findings | Developer — fresh, unless mid-stage and under budget |
| Docs, naming, readability, any single-file change | Developer — always fresh |
| A runtime stack that will not start, stay up, or serve | Stack Doctor |
| Review verdict, disputed findings | Reviewer |
| Current-state questions about the codebase | Explorer |
| Branch, commits, PR | orchestrator |

When the owning agent's context is gone, re-hydrate a fresh instance from the plan directory — `overview.md` run state, the recon files, and the app plans' task checklists are authoritative over any agent's recollection.

## Guardrails

- Config is read once, in stage 0, and passed down. Subagents that re-read it drift. Stage 0 runs its config, scope, skill, and dispatch resolution on a resume too — a step's `model` is applied when you launch its subagent, never passed as context for it to act on.
- Every `model` a step declares launches with it applied, or the run stops with it named. A declared model in neither the launch nor the report was dropped.
- After the plan gate, **only you write `overview.md`** — status, verification rows, blockers, and gates. Subagents return those facts; you record them. Transcribing what a subagent returns is run state, which you own, not the subagent's work.
- The exit gate runs once, in stage 5, and is confirmed by commit SHA thereafter. A stale row is re-run by the Reviewer, never by you. A stage that re-runs it is paying the run's slowest commands for an answer the verification table already holds.
- Gates are the only pause points. Never invent one, never skip one.
- Never diagnose a runtime stack, in any stage — whatever `runtime.up` starts, and however familiar its technology looks. It routes to the Stack Doctor, whose whole purpose is to keep that work out of a context that cannot be retired.
- Every subagent you spawn is one of the five named in **Subagent dispatch**. A general-purpose agent doing a stage's work is that stage's subagent without its constraints, its skills, or its configured model.
- Every gate resolution is recorded in `## Gates` with who resolved it and the signal. An unrecorded approval cannot be audited and will be re-asked on the next resume.
- Every stage runs on every change. Never skip Explore or Plan because a change looks small.
- Never advance past a red gate, an unresolved blocker in `overview.md`, or a task still marked `[~]`.
- Every artifact lands in `docs/plans/<feature-slug>/`. That directory is the audit record for the run, and the only state a later invocation inherits.
- Report honestly. A stage skipped, a test failing, a finding unresolved — say so plainly.

## Running a single stage

Each stage's procedure skill is independently invocable — `/pe-review` on the current branch, `/pe-explore` on an unfamiliar area — without the pipeline, its gates, or its git handling.
