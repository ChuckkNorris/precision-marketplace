---
name: pe-explore
description: Map the current state of a codebase area before planning a change - entry points, existing patterns to follow, integration points, test coverage, and hazards. Writes the Current state section of the application's instructions file. Use before planning work in an unfamiliar area, or to answer what the code does today.
---

# Explore

Establish what the codebase currently does in the area a change will touch. Facts only — no design, no recommendations.

## Inputs

The brief, the resolved configuration, and the application in scope. One Explorer covers one application. Invoked standalone: take the area from the user's request and read `.agents/precision-engineering.config.md` for scope.

## Method

1. Locate the code the task touches. Search by domain vocabulary from the brief, not by guessed filenames.
2. Record for the application in scope:
   - Entry points and the module boundaries the change crosses
   - **Existing patterns to follow** — find a precedent and cite it by `path:line`. A new endpoint should look like the existing endpoints; this citation is what makes that possible.
   - Integration points: callers, callees, events, shared types, data access
   - Existing test coverage for the area, and the test conventions actually in use
3. Note what does **not** exist. An absent abstraction is a planning constraint.
4. Read the code to verify each claim.

## Output

Create `docs/plans/<feature-slug>/<app-name>.instructions.md` containing **only** the `## Current state` section below. The Planner appends the file manifest and task details beneath it, and writes the human-facing `<app-name>.plan.md` separately — neither is yours to create.

```markdown
# <app-name> — <Feature Title>

## Current state
*Reconnaissance by the Explorer. Facts as of exploration; never edited by a later stage.*

### Affected areas
| Path | Role in this change |

### Patterns to follow
Cite `path:line` and state what the precedent establishes.

### Integration points
What calls in, what this calls out to, what shares state. Note anything crossing into
another application — the Planner records cross-application concerns in `overview.md`.

### Existing test coverage
Framework, location, conventions, gaps in the affected area.

### Absent abstractions
What the change needs that the codebase does not have.

### Constraints and hazards
Anything making the obvious approach wrong — legacy coupling, in-flight migrations,
generated code, vendored files.
```

Writing only this section is what keeps the facts falsifiable: they are recorded before any design exists to bend them toward.

Invoked standalone with no plan directory, report the same content inline instead.

## Escalation

Rare here. Reconnaissance produces facts and uncertainty, and **uncertainty belongs in Current state, not in a question to the user** — the Planner is better placed to decide what is worth asking, because it knows which unknowns actually affect the design.

Escalate only when the request itself is unresolvable: the named area does not exist, or it maps to several unrelated parts of the codebase and picking wrong wastes the run. Use the payload in [escalation.md](../../shared/escalation.md).

## Guardrails

- No design, no approach recommendations, no opinions on what should change.
- Write only `## Current state`, and only in `<app-name>.instructions.md`. Task, manifest, and design sections belong to the Planner, and `<app-name>.plan.md` is the Planner's file to create.
- Report uncertainty as uncertainty. A confident wrong finding costs more than an open question.
- Breadth beyond the application in scope is expensive and rarely used.
