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
4. Write `overview.md` per [plan-contract.md](../../shared/plan-contract.md) with status `awaiting-approval`, and each application's two files per [plan-artifacts.md](./references/plan-artifacts.md). Integration points crossing an application boundary go in `overview.md` under **Design**.
   **Put nothing in the plan file an approver cannot act on, and nothing in the instructions file a Developer cannot execute.** Reconnaissance, manifest rows, and a task's mechanics belong to the instructions; scope, behavior, contracts, and call stacks belong to the plan.
5. Structure the design sections from the plan template for the application's `type`, per the mapping in [plan-artifacts.md](./references/plan-artifacts.md). Write the sections that apply, name every dropped one in a single `**Not applicable:**` line with its reason, and expand the `<Additional…Section>` placeholders — they are where the plan stops being generic.
6. Trace the call stack for each core path end to end, naming real functions and modules, under the `#### Callstack` heading of the endpoint or flow it belongs to. This is where code-level design errors surface — a plan whose call stack does not connect is wrong regardless of how reasonable the prose reads.
7. Name test scenarios explicitly: happy path, boundary, failure, authorization. "Add unit tests" is not a scenario.
8. Derive each task's `Verify` from the application's configured `commands`. A task you cannot write a verification for is not yet specified well enough.

## Escalating open questions

Every open question is also an escalation: write it to `overview.md` **and** return it in the `escalations` payload per [escalation.md](../../shared/escalation.md), so the orchestrator can put it to the user. A question recorded only in the file will not get asked.

Give each one 2–4 concrete options with a real recommendation. You explored the design space; the user did not. "How should I handle this?" wastes the ask — "per API key, per organization, or both, and here is what each costs" is a decision someone can actually make.

Apply the escalate-versus-decide test in the contract first. Anything answerable from `## Current state`, the config, or one more file read is not an open question.

## Guardrails

- Unknowns become open questions that block implementation — never assumptions.
- Every applicable template section is written, and every dropped one is named in the `**Not applicable:**` line with its reason.
- Every endpoint names its authorization; every component names its props and its place in the hierarchy.
- Every task meets the task-format rules in [plan-artifacts.md](./references/plan-artifacts.md): matched across both files, inside the manifest, carrying a `Reference`, observable acceptance, a runnable `Verify`, and small enough for one agent in one sitting.
- Every task's `Depends on` is complete, including where it reaches another application. Implementation runs applications concurrently when their manifests do not overlap, so a dependency you omit becomes a race rather than a delay.
- Per-application plan files come from `applications[]`. Never emit a fixed frontend/backend pair; a single `fullstack` application gets a single plan file.

## Revising an existing plan

Read the plan directory first. Edit in place and **preserve existing task markers** — a task already `[x]` or `[~]` keeps its marker unless the revision genuinely invalidates that work, in which case reset it to `[ ]` and say so explicitly. Never silently rewrite completed history.

Adding tasks means adding both a checklist entry and a task detail. Removing one means removing both.
