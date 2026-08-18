---
name: pe-plan
description: Write a technically-focused, implementable development plan - scope, per-application file manifests, call stacks, test scenarios, and ordered tasks with acceptance criteria. Use to plan a change before implementing it, or to revise an existing plan.
---

# Plan

Produce a plan another agent can implement without re-deriving the design.

## Inputs

The brief, the resolved configuration, the applications in scope, and each `<app-name>.instructions.md`'s `## Current state` section written by its Explorer. Invoked standalone: read `.agents/precision-engineering.config.md` yourself, and run `pe-explore` first where `## Current state` is missing — planning without reconnaissance produces plans that do not fit the codebase.

## Method

1. Load every skill resolved for the `plan` step and for each in-scope application, plus each application's `conventions`. These are the repository's mandatory standards — the plan must conform to them, not merely mention them.
2. Read each `<app-name>.instructions.md`'s `## Current state` and the precedents it cites. Deviating from a cited precedent requires a stated reason in **Design**. **Never edit `## Current state`** — it is the Explorer's write-once record, and the reason your deviation is checkable at all.
3. Decide scope. **Write out-of-scope before writing tasks** — adjacent problems noticed while planning are recorded there, never folded into the work.
4. Write the artifacts in [plan-contract.md](../../shared/plan-contract.md), respecting the two-tier split: `overview.md` with status `awaiting-approval`; `<app-name>.plan.md` carrying the task checklist, the design sections, test scenarios, and a one-line `## AI Instructions` pointer; and the file manifest and task details appended to `<app-name>.instructions.md` beneath the Explorer's `## Current state`. Integration points crossing an application boundary go in `overview.md` under **Design**.
   **Put nothing in the plan file an approver cannot act on, and nothing in the instructions file a Developer cannot execute.** Reconnaissance, manifest rows, and a task's mechanics belong to the instructions; scope, behavior, contracts, and call stacks belong to the plan.
5. Structure the design sections from the plan template for the application's `type` — [backend](./references/backend-technical-plan-template.md), [frontend](./references/frontend-technical-plan-template.md), or both for `fullstack`. Emit every template section: one with nothing to record is marked `None` with a reason, not dropped. Expand the `<Additional…Section>` placeholders — they are where the plan stops being generic.
6. Trace the call stack for each core path end to end, naming real functions and modules, under the `#### Callstack` heading of the endpoint or flow it belongs to. This is where code-level design errors surface — a plan whose call stack does not connect is wrong regardless of how reasonable the prose reads.
7. Name test scenarios explicitly: happy path, boundary, failure, authorization. "Add unit tests" is not a scenario.
8. Derive each task's `Verify` from the application's configured `commands`. A task you cannot write a verification for is not yet specified well enough.

## Escalating open questions

Every open question is also an escalation: write it to `overview.md` **and** return it in the `escalations` payload per [escalation.md](../../shared/escalation.md), so the orchestrator can put it to the user. A question recorded only in the file will not get asked.

Give each one 2–4 concrete options with a real recommendation. You explored the design space; the user did not. "How should I handle this?" wastes the ask — "per API key, per organization, or both, and here is what each costs" is a decision someone can actually make.

Apply the escalate-versus-decide test in the contract first. Anything answerable from `## Current state`, the config, or one more file read is not an open question.

## Guardrails

- Unknowns become open questions that block implementation — never assumptions.
- Every section of the app's plan template is present, `None` where empty.
- Every endpoint names its authorization; every component names its props and its place in the hierarchy.
- Every path in a task appears in that application's file manifest.
- Every task detail in `<app-name>.instructions.md` has a matching checklist entry in `<app-name>.plan.md`, and vice versa. The two files are written together; a task in one and not the other is the most likely way this split breaks.
- Every task carries a `Reference` naming the files to read first and the plan section holding its contract.
- Acceptance criteria state observable behavior. "Refactor cleanly" is not acceptance.
- Per-application plan files come from `applications[]`. Never emit a fixed frontend/backend pair; a single `fullstack` application gets a single plan file.
- Size tasks so one agent completes one in a sitting.

## Revising an existing plan

Read the plan directory first. Edit in place and **preserve existing task markers** — a task already `[x]` or `[~]` keeps its marker unless the revision genuinely invalidates that work, in which case reset it to `[ ]` and say so explicitly. Never silently rewrite completed history.

Adding tasks means adding both a checklist entry and a task detail. Removing one means removing both.
