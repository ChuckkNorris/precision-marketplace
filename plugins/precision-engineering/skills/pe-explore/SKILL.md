---
name: pe-explore
description: Map the current state of a codebase area before planning a change - entry points, existing patterns to follow, integration points, test coverage, and hazards. Writes the application's reconnaissance file. Use before planning work in an unfamiliar area, or to answer what the code does today.
---

# Explore

Establish what the codebase currently does in the area a change will touch. Facts only — no design, no recommendations.

## Inputs

The brief, `run-context.md` for the resolved configuration and skills, and the application in scope. One Explorer covers one application. Invoked standalone: take the area from the user's request and read `.agents/precision-engineering.config.md` for scope.

## Method

1. Locate the code the task touches. Search by domain vocabulary from the brief, not by guessed filenames.
2. Record for the application in scope:
   - Entry points and the module boundaries the change crosses
   - **Existing patterns to follow** — find a precedent and cite it by `path:line`. A new endpoint should look like the existing endpoints; this citation is what makes that possible.
   - Integration points: callers, callees, events, shared types, data access
   - Existing test coverage for the area, and the test conventions actually in use
3. Note what does **not** exist. An absent abstraction is a planning constraint.
4. Read the code to verify each claim.
5. **Judge how much planning this application needs**, and return it. You are the only agent that has read the code before any design exists, so this is your call to make and no one else's.

   | Signal | When | Test |
   |---|---|---|
   | `precedent` | An existing implementation does substantially this, and the change is following it | You can cite the precedent by `path:line` and name what differs in one sentence |
   | `adaptation` | A precedent exists but the contract, data flow, or failure behavior differs | You can cite it, but naming what differs takes more than a sentence |
   | `novel` | No precedent, or the change needs an abstraction the codebase lacks | **Absent abstractions** is non-empty, or nothing to cite |

   **Judge only your own application.** Another application being novel does not make yours so, and saying so would deepen a plan that does not need it.

   When in doubt, choose the deeper signal. Under-signalling costs a re-plan; over-signalling costs a plan nobody needed, and only the first is recoverable cheaply.

## Output

Create `docs/plans/<feature-slug>/<app-name>.recon.md` containing **only** the `## Current state` section below. It is yours alone: the Planner and Developer read it, and no stage edits it. `<app-name>.plan.md` is the Planner's file.

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

Return the signal alongside your summary — it does not go in the recon file, because it is a judgment about the *change*, not a fact about the code:

```yaml
planningSignal: precedent | adaptation | novel
because: One sentence. For `precedent`, the `path:line` being followed and what differs.
```

Invoked standalone with no plan directory, report the same content inline instead.

## Escalation

Rare here. Reconnaissance produces facts and uncertainty, and **uncertainty belongs in Current state, not in a question to the user** — the Planner is better placed to decide what is worth asking, because it knows which unknowns actually affect the design.

Escalate only when the request itself is unresolvable: the named area does not exist, or it maps to several unrelated parts of the codebase and picking wrong wastes the run. Use the payload in [escalation.md](../../shared/escalation.md).

## Guardrails

- No design, no approach recommendations, no opinions on what should change.
- Write only `<app-name>.recon.md`. Task and design sections belong to the Planner.
- Report uncertainty as uncertainty. A confident wrong finding costs more than an open question.
- Breadth beyond the application in scope is expensive and rarely used.
