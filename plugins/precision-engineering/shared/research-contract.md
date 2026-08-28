# Research Contract

How an agent gets a question about something outside the repository answered without paying for the search itself.

**The asking agent does not investigate.** How a dependency behaves is evidence, not judgment — and gathering it has an unbounded appetite for dead ends, every one of which stays in context for the rest of that agent's life. So the asking agent *composes* the question and the orchestrator *dispatches* a Researcher per question, concurrently.

This is the same division as [escalation.md](./escalation.md), for the same reason: the agent with the context frames the question, and something else carries it.

## When to request research

Request it when **the answer changes the work** and it is not derivable from this repository.

| Request research | Decide yourself |
|---|---|
| Whether a dependency supports a capability at the version pinned here | Anything the repository's own code shows — go read it |
| Which release changed a behavior the design assumes | Anything the configuration or the recon file already answers |
| Whether an upstream limitation is intended or a known defect | A convention that is a matter of taste |
| What an external API actually returns, where the contract matters | Anything one more file in this repository would settle |

An external question whose answer changes nothing is not worth a Researcher. A question about *this* repository is the Explorer's, and one about a stack that will not start is the Stack Doctor's.

## Request payload

Returned alongside the agent's normal output:

```yaml
researchRequests:
  - id: R1
    question: Does this framework support per-resource health endpoints at 4.2?
    dependency: acme-hosting 4.2.1, as pinned in the lockfile
    why: >
      The design routes readiness per resource. If it is unsupported at 4.2 the
      plan needs one aggregate endpoint instead, which changes two tasks.
    blocks: [T-004]      # what cannot proceed without it; [] if advisory
```

Rules:
- **One question per entry.** Not a topic, and not several joined by "and". Narrow questions are answered concurrently and cheaply; a bundle comes back partly answered and costs a second round trip.
- `dependency` names the version this repository actually pins. An answer read from another version is a defect that looks like a fact.
- `why` states what changes based on the answer. A question that changes nothing should not be asked.
- `blocks` is honest. Continue every part of the work the outstanding answers do not block.

## Answer payload

Each Researcher returns:

```yaml
question: The question as asked.
version: What was actually resolved and read.
answer: |
  What the dependency does. Two or three sentences.
confidence: documented | observed | inferred | unresolved
citations:
  - A URL, package path, or file and line per claim.
unanswered: [anything in the request this Researcher did not cover]
```

`confidence` is part of the answer, not decoration. **It reaches the asking agent unchanged** — `documented` is the official docs for the pinned version, `observed` is confirmed against the installed package, `inferred` is reasoning from adjacent evidence, and an agent that cannot see the difference will design on the weakest as though it were the strongest.

## Orchestrator handling

1. **Dispatch** one Researcher per question, concurrently, on the `research` step's model. Never one Researcher carrying several questions, and never a general-purpose agent.
2. **Pass** the question, the dependency and version, and the plan directory path for `research-notes.md`. Never the plan or the recon files — what the repository intends is not evidence about the dependency, and it is the cost this agent exists to avoid.
3. **Return** the answers to the asking agent, `confidence` and citations intact.
4. **Escalate an `unresolved`** to the user per [escalation.md](./escalation.md), with the citations as context. A bounded search that failed is a decision to make, not a search to re-run — never re-spawn a Researcher on the same question.

`research-notes.md` in the plan directory accumulates every answer with its citations, and each Researcher reads it first. That is what makes the second question about the same dependency cheap, and what leaves the run's external claims auditable after it ends.

## Guardrails

- **No subagent spawns another.** A Researcher that needs a child is a question that was too broad; it returns instead. An agent dispatching its own runs with no configured model, no resolved skills, and no ceiling, and its cost lands outside the orchestrator's accounting.
- Never let an uncited claim into a plan or a finding. It will be built on.
- Never upgrade a confidence to make an answer more useful.
