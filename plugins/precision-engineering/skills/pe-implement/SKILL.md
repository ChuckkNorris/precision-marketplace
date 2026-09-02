---
name: pe-implement
description: Execute an approved development plan task by task - deciding low-level mechanics yourself, honoring the configured test strategy, tracking task status, committing per task, and exiting only on a green build, tests, lint, and typecheck. Use to implement a plan produced by pe-plan.
---

# Implement

Implement the plan exactly, leaving the repository verifiably green.

## Inputs

The plan directory and your application — plus the specific task IDs to implement, where the orchestrator scheduled a subset. Given a subset, implement those tasks and no others: the tasks left out are waiting on a barrier you cannot see. Read `.agents/precision-engineering.config.md` against [configuration-schema.md](../../shared/configuration-schema.md) for that application's commands, conventions, and skills; `run-context.md` carries your slot's port allocation. Invoked standalone: locate the plan under `docs/plans/` yourself.

## Method

**Your working document** is `<app-name>.plan.md` — `## Current state` for what the code looks like today, then the design, checklist, and task details. Its structure is not yours to change.

1. Load every skill resolved for the `implement` step and for your application, plus its `conventions`.
2. Read `overview.md` and your application's plan. **Stop and report if any open question is unresolved or `overview.md` lists a blocker.**
3. Work tasks in dependency order. **The plan states behavior, contracts, and connection points; which files, names, and structures deliver them is yours to decide** — follow the precedents `## Current state` cites, and honor every **Interface contract** entry in `overview.md` verbatim: the other application is being built against it, not against your code. For each task:
   - Mark it `[~]` in the checklist **before** starting.
   - Implement per `workflow.testStrategy`:
     - `tdd` — write the test, run it, confirm it fails *for the intended reason*, then implement to green.
     - `test-after` — implement, then write tests covering the acceptance criteria.
     - `none` — implement; existing tests must still pass.
   - Run the task's `Verify` command — the plan chose the cheapest command that catches this task failing, so run that one rather than reaching for the full gate. **Only once it passes**, mark the task `[x]`.
   - Record any decision the plan did not anticipate under that task's **Notes**.
4. Stage only your own application's paths — `git add -A` sweeps in whatever else the tree holds: another Developer's half-finished work where you share a checkout, and generated files such as your slot's environment file where you do not. Commit per `git.commitGranularity` — `per-task` commits after each verified task using `git.commitConvention`; `squashed` defers to the end. Append the short SHA to the task's checklist entry.
5. After the final task, run the exit gate and **return** its results. The orchestrator records status and verification — Developers on other applications may be writing concurrently, so `overview.md` has one writer. Invoked standalone, record it yourself.

**Update markers as status changes, never batched at the end.** The checklist is the resumption record: a task left `[~]` is how the next agent knows where work was interrupted.

## Runtime stack

Where `runtime.up` is declared, every command needing a live application — a task's `Verify`, the test command, the exit gate — runs against a stack you bring up yourself:

1. Bring it up with `runtime.up`, using the environment you were given. Under `parallel` that environment is your slot's; never fall back to the defaults, which another Developer or the user may hold.
2. Run `commands.migrate` for each application your stack needs that declares one. An isolated database starts empty, and an application that starts cleanly against an empty schema will still fail every request until this runs.
3. Run the commands.
4. Tear it down with `runtime.down`.

**Tear down on every exit path** — the last task, a task left `[~]`, an escalation, a gate you cannot get green. Bring the stack back up if you are continued into a later wave. A stack left running holds its ports against the next run; the orchestrator's sweep is a backstop for an agent that died, not a substitute for this.

## Exit gate

Green `build`, `test`, `lint`, and `typecheck` for your application using its configured commands, and coverage at or above the effective `coverageMin`. Return each command, its result, and **the short SHA of the commit it ran against** — the last commit the gate covers — for the orchestrator to record in the `overview.md` verification table. Review reads that table instead of re-running the commands, so a row without its commit, or behind `HEAD`, comes straight back to you.

**A failing gate is not an exit.** Fix the cause. If the cause is a defect in the plan rather than the implementation, stop and report — do not redesign.

## Guardrails

- Anything in `overview.md` **Out of scope** is forbidden, not deprioritized. Problems noticed outside your tasks are reported, never fixed opportunistically.
- Never weaken a test, skip a test, or loosen a threshold to reach green.
- Never mark a task `[x]` without its `Verify` passing. The marker is evidence, not intent.
- Match surrounding code — its naming, idiom, and comment density. New code should be indistinguishable in style from the precedents `## Current state` cited.
- Every comment explains *why* — the rationale, the constraint, the rejected alternative. The code already states what it does, so a comment restating that is noise that goes stale. Keep each under 200 characters; a reason needing more than that belongs in the name, the structure, or the task's **Notes**.
- Never commit secrets, credentials, or artifacts the repository ignores.
- No stack is left running when you return control.
- Blocked mid-task? Leave the marker `[~]` and report the reason as a blocker. The orchestrator records it in `overview.md` and sets status.

## Escalation

The plan should have settled the design, so escalating here means the plan fell short. Return an escalation per [escalation.md](../../shared/escalation.md) when:

- The plan is ambiguous or self-contradictory at a point you cannot resolve by reading it
- Implementing as written would be wrong, and the correct alternative is a judgment call rather than an obvious fix
- The codebase turns out to contradict what the plan assumed

Leave the task `[~]`, record the blocker, and return the question with options. **Do not improvise a design** — the value of the plan gate is lost if implementation quietly redesigns around a gap.

Obvious mechanical corrections — a wrong path, a stale name — are just fixed, and noted under the task's **Notes**.

## Resolving review findings

Given finding IDs from a `<app-name>.findings.md` — your own, or another application's where the finding is at an interface you share — fix only those findings, re-run the exit gate, **update the verification table with the new commit SHAs**, and note each resolution under the affected task's **Notes**. Disagreeing with a finding means reporting the disagreement, not silently declining the fix.

Stay inside the files the findings name — a fix reaching past them triggers a full re-review.

**When the fix edits a rule, contract, or shared instruction, re-check it against every file that consumes that rule before running the gate.** A fix that satisfies the cited line while contradicting a sibling is the next cycle's finding.
