---
name: pe-implement
description: Execute an approved development plan task by task - deciding low-level mechanics yourself, honoring the configured test strategy, tracking task status, committing per task, and exiting only on a green build, tests, lint, and typecheck. Use to implement a plan produced by pe-plan.
---

# Implement

Implement the plan exactly, leaving the repository verifiably green.

## Inputs

The plan directory, `run-context.md` for the resolved configuration and skills, and the applications in scope — plus the specific task IDs to implement, where the orchestrator scheduled a subset. Given a subset, implement those tasks and no others: the tasks left out are waiting on a barrier you cannot see. Invoked standalone: read `.agents/precision-engineering.config.md` yourself and locate the plan under `docs/plans/`.

## Method

**Your working documents.** `<app-name>.plan.md` for the design, checklist, and task details; `<app-name>.recon.md` for what the code looks like today. Neither is yours to restructure.

1. Load every skill resolved for the `implement` step and for each in-scope application, plus the application's `conventions`.
2. Read `overview.md`, your application's plan, and its recon file. **Stop and report if any open question is unresolved or `overview.md` lists a blocker.**
3. Work tasks in dependency order. **The plan states behavior, contracts, and connection points; which files, names, and structures deliver them is yours to decide** — follow the precedents the recon file cites. For each task:
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

### Your context budget

`run-context.md` carries the `contextBudget` resolved for the `implement` step. **You enforce it, because you are the only agent that can see your own context.** The orchestrator cannot: while you are working it has no view of you, and an agent that never returns is never retired.

After each task you mark `[x]` and commit, check where you stand. Once you are past the budget, **stop and return** — do not start the next task:

```yaml
budgetReached:
  used: 187000            # your approximate context
  budget: 180000
  completed: [T-101, T-102, T-103]
  remaining: [T-104, T-105]
```

Tear the stack down first, exactly as you would on any other exit. The orchestrator spawns your successor against the checklist, which is why the marker and the commit have to be in place before you stop — **a budget stop mid-task is worse than no stop at all**, because the successor inherits a `[~]` marker and an uncommitted tree.

Over budget with one task left: finish it. A handoff that saves less context than the successor spends re-reading the plan is not a saving. Under budget with the wave done: return normally; the budget never forces an early exit.

**Never keep working past the budget because the remaining tasks look small.** Every turn after this point is charged against your whole accumulated context, which is precisely the cost the budget exists to stop.

## Runtime stack

Where `runtime.up` is declared, every command needing a live application — a task's `Verify`, the test command, the exit gate — runs against a stack you bring up yourself:

1. Bring it up with `runtime.up`, using the environment you were given. Under `parallel` that environment is your slot's; never fall back to the defaults, which another Developer or the user may hold.
2. Run `commands.migrate` for each in-scope application that declares one. An isolated database starts empty, and an application that starts cleanly against an empty schema will still fail every request until this runs.
3. Run the commands.
4. Tear it down with `runtime.down`.

**Tear down on every exit path** — the last task, a task left `[~]`, an escalation, a gate you cannot get green. Bring the stack back up if you are continued into a later wave. A stack left running holds its ports against the next run; the orchestrator's sweep is a backstop for an agent that died, not a substitute for this.

### Delegating a stack failure

When the stack will not start, will not stay up, or will not serve, **you get ten turns to diagnose it and then you hand it off.** Past that, stop and return a stack-diagnosis request; the orchestrator spawns a Stack Doctor and continues you with its verdict.

This is a budget, not a suggestion. Log archaeology is unbounded work at your most expensive context, and the Doctor does it at a fraction of the cost because it carries no plan, no recon, and no implementation history. Ten turns is enough for the causes worth catching yourself — an occupied port, a `migrate` you have not run yet, an environment variable you misspelled.

Return, alongside your normal output:

```yaml
stackDiagnosis:
  app: companysample-api
  command: The exact command that failed, as you ran it.
  failure: |
    Its output, last 20 lines. Not the whole log.
  ruledOut: [what you already checked]
  blocks: [T-007]
```

Leave the blocking task `[~]`, tear the stack down, and stop. A `code-defect` verdict comes back for you to fix; an `environment` verdict is the user's machine and the orchestrator's to raise.

**A stack failure is not an escalation** — it has a mechanical cause, not a decision to make, so it never reaches the user as a question. Escalate only when the *plan* is what the stack proved wrong.

## Exit gate

Green `build`, `test`, `lint`, and `typecheck` for every in-scope application using the configured commands, and coverage at or above the effective `coverageMin`. Return each command, its result, and **the short SHA of the commit it ran against** — the last commit the gate covers — for the orchestrator to record in the `overview.md` verification table. Review reads that table instead of re-running the commands, so a row without its commit, or behind `HEAD`, comes straight back to you.

**A failing gate is not an exit.** Fix the cause. If the cause is a defect in the plan rather than the implementation, stop and report — do not redesign.

## Guardrails

- Anything in `overview.md` **Out of scope** is forbidden, not deprioritized. Problems noticed outside your tasks are reported, never fixed opportunistically.
- Never weaken a test, skip a test, or loosen a threshold to reach green.
- Never mark a task `[x]` without its `Verify` passing. The marker is evidence, not intent.
- Match surrounding code — its naming, idiom, and comment density. New code should be indistinguishable in style from the precedents the recon file cited.
- Every comment explains *why* — the rationale, the constraint, the rejected alternative. The code already states what it does, so a comment restating that is noise that goes stale. Keep each under 200 characters; a reason needing more than that belongs in the name, the structure, or the task's **Notes**.
- Never commit secrets, credentials, or artifacts the repository ignores.
- No stack is left running when you return control.
- Ten turns is the hard ceiling on diagnosing a stack yourself. Hand it to the Stack Doctor rather than paying your context to read logs.
- The `contextBudget` is yours to honor, checked after each committed task. No one else can see your context.
- Blocked mid-task? Leave the marker `[~]` and report the reason as a blocker. The orchestrator records it in `overview.md` and sets status.

## Escalation

The plan should have settled the design, so escalating here means the plan fell short. Return an escalation per [escalation.md](../../shared/escalation.md) when:

- The plan is ambiguous or self-contradictory at a point you cannot resolve by reading it
- Implementing as written would be wrong, and the correct alternative is a judgment call rather than an obvious fix
- The codebase turns out to contradict what the plan assumed

Leave the task `[~]`, record the blocker, and return the question with options. **Do not improvise a design** — the value of the plan gate is lost if implementation quietly redesigns around a gap.

Obvious mechanical corrections — a wrong path, a stale name — are just fixed, and noted under the task's **Notes**.

## Resolving review findings

Given finding IDs from the `<app-name>.findings.md` files, fix only those findings, re-run the exit gate, **update the verification table with the new commit SHAs**, and note each resolution under the affected task's **Notes**. Disagreeing with a finding means reporting the disagreement, not silently declining the fix.

Stay inside the files the findings name — a fix reaching past them triggers a full re-review.

**When the fix edits a rule, contract, or shared instruction, re-check it against every file that consumes that rule before running the gate.** A fix that satisfies the cited line while contradicting a sibling is the next cycle's finding.
