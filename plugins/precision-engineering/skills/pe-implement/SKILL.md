---
name: pe-implement
description: Execute an approved development plan task by task - honoring the configured test strategy, tracking task status, committing per task, and exiting only on a green build, tests, lint, and typecheck. Use to implement a plan produced by pe-plan, or a brief on a light-track run.
---

# Implement

Implement the plan exactly, leaving the repository verifiably green.

## Inputs

The plan directory, the resolved configuration, and the applications in scope. Invoked standalone: read `.agents/precision-engineering.config.md` yourself and locate the plan under `docs/plans/`.

## Method

**Your working documents.** Full track: the checklist in `<app-name>.plan.md`, task detail and file manifest in `<app-name>.instructions.md`. Light track: both are `## Tasks` in `brief.md`. "Checklist" and "task detail" below mean whichever the track supplies.

1. Load every skill resolved for the `implement` step and for each in-scope application, plus the application's `conventions`.
2. Read `overview.md` and your task detail, including its `## Current state` where present. Read `<app-name>.plan.md` only where a task's `Reference` sends you to a design section for a contract. **Stop and report if any open question is unresolved or `overview.md` lists a blocker.**
3. Work tasks in dependency order. For each task:
   - Read everything the task's `Reference` names, where present, before writing code.
   - Mark it `[~]` in the checklist **before** starting.
   - Implement per `workflow.testStrategy`:
     - `tdd` — write the test, run it, confirm it fails *for the intended reason*, then implement to green.
     - `test-after` — implement, then write tests covering the acceptance criteria.
     - `none` — implement; existing tests must still pass.
   - Run the task's `Verify` command. **Only once it passes**, mark the task `[x]`.
   - Record any decision the plan did not anticipate under that task's **Notes**.
4. Commit per `git.commitGranularity` — `per-task` commits after each verified task using `git.commitConvention`; `squashed` defers to the end. Append the short SHA to the task's checklist entry.
5. After the final task, run the exit gate and set `overview.md` status to `in-review`.

**Update markers as status changes, never batched at the end.** The checklist is the resumption record: a task left `[~]` is how the next agent knows where work was interrupted.

## Exit gate

Green `build`, `test`, `lint`, and `typecheck` for every in-scope application using the configured commands, and coverage at or above the effective `coverageMin`. Record each command and result in the `overview.md` verification table.

**A failing gate is not an exit.** Fix the cause. If the cause is a defect in the plan rather than the implementation, stop and report — do not redesign.

## Light-track runs

Told the run is light, there is no plan. Derive `## Tasks` into `brief.md` first, in the shape [plan-contract.md](../../shared/plan-contract.md) defines — one task per verifiable unit of work. The brief's **In scope** is your manifest.

A brief needing more than a handful of tasks, or whose design is not obvious once written down, was misjudged as light. Stop and report — never plan inside the implementation.

## Guardrails

- Touching a path absent from the file manifest — on a light-track run, from the brief's stated scope — requires stopping and reporting.
- Never weaken a test, skip a test, or loosen a threshold to reach green.
- Never mark a task `[x]` without its `Verify` passing. The marker is evidence, not intent.
- Match surrounding code — its naming, idiom, and comment density. New code should be indistinguishable in style from the precedents the plan's `## Current state` cited.
- Every comment explains *why* — the rationale, the constraint, the rejected alternative. The code already states what it does, so a comment restating that is noise that goes stale. Keep each under 200 characters; a reason needing more than that belongs in the name, the structure, or the task's **Notes**.
- Never commit secrets, credentials, or artifacts the repository ignores.
- Blocked mid-task? Leave the marker `[~]`, add the reason to `overview.md` **Blockers**, set status to `blocked`, and report.

## Escalation

The plan should have settled the design, so escalating here means the plan fell short. Return an escalation per [escalation.md](../../shared/escalation.md) when:

- The plan is ambiguous or self-contradictory at a point you cannot resolve by reading it
- Implementing as written would be wrong, and the correct alternative is a judgment call rather than an obvious fix
- The codebase turns out to contradict what the plan assumed

Leave the task `[~]`, record the blocker, and return the question with options. **Do not improvise a design** — the value of the plan gate is lost if implementation quietly redesigns around a gap.

Obvious mechanical corrections — a wrong path, an off-by-one in a manifest — are just fixed, and noted under the task's **Notes**.

## Resolving review findings

Given finding IDs from an `<app-name>.findings.md`, fix only those findings, re-run the exit gate, and note each resolution under the affected task's **Notes**. Disagreeing with a finding means reporting the disagreement, not silently declining the fix.

**When the fix edits a rule, contract, or shared instruction, re-check it against every file that consumes that rule before running the gate.** A fix that satisfies the cited line while contradicting a sibling is the next cycle's finding.
