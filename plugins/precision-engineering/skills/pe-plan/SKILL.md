---
name: pe-plan
description: Explore an application's current state, then write a technically-focused, implementable development plan - scope, design, call stacks, test scenarios, and ordered tasks with acceptance criteria. Use to plan a change before implementing it, or to revise an existing plan.
---

# Plan

Explore the application you are given, then produce a plan another agent can implement without re-deriving the design. State intent, contracts, and integration points; leave file layout, naming, and mechanics to the Developer.

## Inputs

The brief, the plan directory, and **one** application in scope. Read `.agents/precision-engineering.config.md` against [configuration-schema.md](../../shared/configuration-schema.md) for that application's commands, conventions, and skills. Invoked standalone: take the area from the user's request, and the application from the config entry whose path it falls under.

## Method

1. Load every skill resolved for the `plan` step and for your application, plus its `conventions`. These are the repository's mandatory standards — the plan must conform to them, not merely mention them.
2. **Explore before designing.** Search by domain vocabulary from the brief, never by guessed filenames, and read the code to verify every claim rather than inferring behavior from a name. Record what you find in the plan's `## Current state`. Stay inside your application: another application's internals belong to its own Planner, and what you need from it is an interface you return, not a file you read.
3. Decide scope. **Write out-of-scope before writing tasks** — adjacent problems noticed while planning are recorded there, never folded into the work.
4. Design *with* the precedents you cited. Deviating from one requires a stated reason in **Design**.
5. Write `<app-name>.plan.md` per [plan-artifacts.md](./references/plan-artifacts.md), structuring its design sections from the plan template for the application's `type` per the mapping there. Write the sections that apply, name every dropped one in a single `**Not applicable:**` line with its reason, and expand the `<Additional…Section>` placeholders — they are where the plan stops being generic. **Put nothing in the plan an approver cannot act on and a Developer cannot implement from.** Scope, behavior, contracts, call stacks, and connection points belong here; the mechanics of satisfying them do not.
6. **Return, never write, what spans applications.** Your plan file is the only file you write; `overview.md` is the orchestrator's. Return:
   - **Every interface crossing your application's boundary**, fixed verbatim — wire shape, route, accessible name, copy string, error shape — with the task that produces or consumes it. The orchestrator reconciles these into `overview.md` **Interface contract** and routes back any that disagree. An interface left to "agree on later" serializes both applications, so vagueness here is measured in wall-clock.
   - **Cross-cutting design, risks, and rollback** — anything spanning more than one application, or any choice a reader would otherwise question.
   - **Open questions**, per **Escalating open questions**.
7. Trace the call stack for each core path end to end, naming real functions and modules, under the `#### Callstack` heading of the endpoint or flow it belongs to. This is where code-level design errors surface — a plan whose call stack does not connect is wrong regardless of how reasonable the prose reads.
8. Name test scenarios explicitly: happy path, boundary, failure, authorization. "Add unit tests" is not a scenario.
9. Derive each task's `Verify` from the application's configured `commands`, choosing the cheapest command that would catch that task failing. A task you cannot write a verification for is not yet specified well enough.
10. Tag every cross-application `Depends on` edge `contract:` or `runtime:` per [plan-artifacts.md](./references/plan-artifacts.md). Ask what the task needs *at the moment it is written*: an interface whose shape is fixed is `contract:`, and only code that must be built, running, or seeding data is `runtime:`. Most edges are `contract:` once the interface is fixed — that is the point of fixing one.

## Escalating open questions

Return every open question in the `escalations` payload per [escalation.md](../../shared/escalation.md), naming the tasks it blocks. The orchestrator records it in `overview.md` and puts it to the user — a question you did not return will not get asked.

Give each one 2–4 concrete options with a real recommendation. You explored the design space; the user did not. "How should I handle this?" wastes the ask — "per API key, per organization, or both, and here is what each costs" is a decision someone can actually make.

Apply the escalate-versus-decide test in the contract first. Anything answerable from the code you just read, the config, or the brief is not an open question. Anything a competent Developer decides while implementing is not one either.

## Guardrails

- Unknowns become open questions that block implementation — never assumptions.
- Every claim in `## Current state` traces to a path you read, and every new unit cites a precedent by `path:line`. The Developer follows those citations, so a guessed one misdirects the implementation.
- Every applicable template section is written, and every dropped one is named in the `**Not applicable:**` line with its reason.
- Every endpoint names its authorization; every component names its props and its place in the hierarchy.
- Every task meets the task-format rules in [plan-artifacts.md](./references/plan-artifacts.md): matched to a checklist entry, carrying observable acceptance, a runnable `Verify`, and small enough for one agent in one sitting.
- Every interface crossing your application's boundary is returned verbatim, and every task's `Depends on` is complete with each cross-application edge tagged `contract:` or `runtime:`. Implementation schedules tasks rather than applications from those tags, so an omitted edge becomes a race and a mistagged one becomes a broken build.
- You write one file: your own application's `<app-name>.plan.md`. Never `overview.md`, never another application's plan.

## Revising an existing plan

Revisions arrive from the plan gate, from resolved open questions, from an interface mismatch the orchestrator reconciled, or as pull request feedback recorded in `overview.md` `## Plan feedback`. Return the entries you addressed — the orchestrator marks them — and escalate rather than choose when feedback contradicts the ticket.

Read the plan directory first — a reconciled **Interface contract** is adopted verbatim, along with every task that cites it. Edit in place and **preserve existing task markers**: a task already `[x]` or `[~]` keeps its marker unless the revision genuinely invalidates that work, in which case reset it to `[ ]` and say so explicitly. Never silently rewrite completed history.

Adding tasks means adding both a checklist entry and a task detail. Removing one means removing both.
