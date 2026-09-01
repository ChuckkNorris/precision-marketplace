---
name: pe-plan
description: Write a technically-focused, implementable development plan - scope, design, call stacks, test scenarios, and ordered tasks with acceptance criteria. Use to plan a change before implementing it, or to revise an existing plan.
---

# Plan

Produce a plan another agent can implement without re-deriving the design. State intent, contracts, and integration points; leave file layout, naming, and mechanics to the Developer.

## Inputs

The brief, `run-context.md` for the resolved configuration and skills, the applications in scope, and each `<app-name>.recon.md` written by its Explorer. Invoked standalone: read `.agents/precision-engineering.config.md` yourself, and run `pe-explore` first where a recon file is missing — planning without reconnaissance produces plans that do not fit the codebase.

## Method

1. Load every skill resolved for the `plan` step and for each in-scope application, plus each application's `conventions`. These are the repository's mandatory standards — the plan must conform to them, not merely mention them.
2. Read each `<app-name>.recon.md` and the precedents it cites. Deviating from a cited precedent requires a stated reason in **Design**. **Never edit that file** — it is the Explorer's write-once record, and the reason your deviation is checkable at all.
3. Decide scope. **Write out-of-scope before writing tasks** — adjacent problems noticed while planning are recorded there, never folded into the work.
4. Complete `overview.md` per [plan-contract.md](../../shared/plan-contract.md) — the orchestrator seeded it with the requirement and scope; you add design, risks, and rollback, and set status `awaiting-approval` — and write each `<app-name>.plan.md` per [plan-artifacts.md](./references/plan-artifacts.md). Integration points crossing an application boundary go in `overview.md` under **Interface contract**, fixed verbatim and numbered — every wire shape, route, accessible name, and copy string the applications must agree on. This section is what lets implementation run concurrently, so an interface left to "agree on later" is a scheduling cost, not a detail.
   **Put nothing in the plan an approver cannot act on and a Developer cannot implement from.** Scope, behavior, contracts, call stacks, and connection points belong here; the mechanics of satisfying them do not.
5. Structure the design sections **to that application's planning depth**, which `run-context.md` states per application. Depth is per application: in one run you may write a two-paragraph plan for one and a full template for another, and deepening the shallow one because its neighbour is deep is the over-planning the setting exists to prevent.

   | Depth | Write |
   |---|---|
   | `minimal` | The precedent the Explorer cited, by `path:line`, and what differs from it. Then the task checklist, `Depends on` tags included. **No template sections.** If you cannot state the change as a delta from the precedent in a short paragraph, the signal was wrong — say so and plan it as `standard`. |
   | `standard` | Integration points and a `#### Callstack` for each core path. No risks or rollback narrative unless the change carries one worth stating. |
   | `full` | Every applicable template section for the application's `type`, per the mapping in [plan-artifacts.md](./references/plan-artifacts.md). |

   At `full`, structure the design sections from the plan template for the application's `type`. Write the sections that apply, name every dropped one in a single `**Not applicable:**` line with its reason, and expand the `<Additional…Section>` placeholders — they are where the plan stops being generic.
6. At `standard` and `full`, trace the call stack for each core path end to end, naming real functions and modules, under the `#### Callstack` heading of the endpoint or flow it belongs to. This is where code-level design errors surface — a plan whose call stack does not connect is wrong regardless of how reasonable the prose reads.
7. Name test scenarios explicitly at every depth: happy path, boundary, failure, authorization. "Add unit tests" is not a scenario. **Test scenarios never scale down** — a shallow plan is a plan with less design stated, not less verification.
8. Derive each task's `Verify` from the application's configured `commands`, choosing the cheapest command that would catch that task failing. A task you cannot write a verification for is not yet specified well enough.
9. Tag every cross-application `Depends on` edge `contract:` or `runtime:` per [plan-artifacts.md](./references/plan-artifacts.md). **Tags are written at every depth, including `minimal`** — they are scheduling metadata, and a `runtime:` edge names another application's task IDs, which you already have in view because you write every application's plan. A `contract:` edge is the exception: it cites numbered **Interface contract** items, so an application carrying one is at least `standard` and the contract is written. Ask what the task needs *at the moment it is written*: an interface you already fixed is `contract:`, and only code that must be built, running, or seeding data is `runtime:`. Most edges are `contract:` once the interface contract is complete — that is the point of writing one.

## Escalating open questions

Every open question is also an escalation: write it to `overview.md` **and** return it in the `escalations` payload per [escalation.md](../../shared/escalation.md), so the orchestrator can put it to the user. A question recorded only in the file will not get asked.

Give each one 2–4 concrete options with a real recommendation. You explored the design space; the user did not. "How should I handle this?" wastes the ask — "per API key, per organization, or both, and here is what each costs" is a decision someone can actually make.

Apply the escalate-versus-decide test in the contract first. Anything answerable from the recon file, the config, or one more file read is not an open question. Anything a competent Developer decides while implementing is not one either.

## Your context budget

`run-context.md` carries the `contextBudget` resolved for the `plan` step. **You enforce it**, because the orchestrator cannot see your context while you work, and a Planner that never returns is never retired.

A plan in progress has no interior handoff point — a half-written plan file is not a record anyone can continue from. So the budget binds at the two points your artifacts are complete:

- **Before returning `researchRequests`.** Write what you have settled to the plan files first, so the round's record stands on its own. Then, if you are past the budget, add `budgetReached: { used, budget }` to your return. The orchestrator spawns your successor for the next round, which reads the plan files and `research-notes.md` rather than your transcript.
- **After the plans are written**, if you are past the budget and a revision is likely, say so. A revision routed to a fresh Planner reading the plan files costs less than one continued at full accumulation.

**Finish the artifact you are on, always.** A budget stop with a plan file half-written is worse than no stop: the successor inherits prose it cannot tell apart from a settled decision.

**A first pass that alone exceeds the budget is a signal, not a stop.** Write the plans, then report that the change is larger than one Planner should carry. Splitting a design mid-way costs more than the context does — cross-application coherence is why one Planner sees every application at once.

## Guardrails

- Unknowns become open questions that block implementation — never assumptions.
- Every applicable template section is written, and every dropped one is named in the `**Not applicable:**` line with its reason.
- Every endpoint names its authorization; every component names its props and its place in the hierarchy.
- Every task meets the task-format rules in [plan-artifacts.md](./references/plan-artifacts.md): matched to a checklist entry, carrying observable acceptance, a runnable `Verify`, and small enough for one agent in one sitting.
- Every cross-application interface is fixed verbatim under **Interface contract**, and every task's `Depends on` is complete with each cross-application edge tagged `contract:` or `runtime:`. Implementation schedules tasks rather than applications from those tags, so an omitted edge becomes a race and a mistagged one becomes a broken build.
- Per-application plan files come from `applications[]`. Never emit a fixed frontend/backend pair; a single `fullstack` application gets a single plan file.
- **A depth is a ceiling on design, never on rigor.** Scope, acceptance criteria, `Verify` commands, and test scenarios are written in full at `minimal`. What a shallow plan omits is design narrative the precedent already answers.
- The `contextBudget` is yours to honor, checked when an artifact is complete. No one else can see your context.
- **Say so when a depth is wrong.** An application signalled `precedent` whose change turns out not to follow one is planned at the depth it needs, and the mismatch is reported. Never pad a plan to look thorough, and never thin one to match a label.

## Revising an existing plan

Revisions arrive from the plan gate, from resolved open questions, or as pull request feedback recorded in `overview.md` `## Plan feedback`. Mark each feedback entry `[x]` as you address it, and escalate rather than choose when feedback contradicts the ticket.

Read the plan directory first. Edit in place and **preserve existing task markers** — a task already `[x]` or `[~]` keeps its marker unless the revision genuinely invalidates that work, in which case reset it to `[ ]` and say so explicitly. Never silently rewrite completed history.

Adding tasks means adding both a checklist entry and a task detail. Removing one means removing both.
