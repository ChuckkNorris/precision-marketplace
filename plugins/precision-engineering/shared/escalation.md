# Escalation Contract

How a subagent gets a question in front of the user.

**Subagents have no user turn.** They return text to the orchestrator and cannot prompt interactively. So a subagent *composes* the question and the orchestrator *asks* it — using the harness's native question tool (`AskUserQuestion` in Claude Code, or the equivalent elsewhere).

The subagent writes the options because the subagent has the context: it read the code, it made the design. An orchestrator inventing options on a subagent's behalf is guessing, which is the failure this contract exists to prevent.

## When to escalate

Escalate when **different reasonable answers lead to materially different work** and the answer is not derivable from the repository.

| Escalate | Decide yourself |
|---|---|
| Product or business decisions (per-key vs per-organization limits) | Anything derivable from the code — go read it |
| Tradeoffs with no dominant option (fail open vs fail closed) | Anything the configuration already answers |
| Requirements the ticket left genuinely undefined | Routine judgment calls with an obvious default |
| Scope boundaries a reasonable reader would draw differently | Matters of taste the configured skills do not mandate |
| Conflicts between the ticket and the codebase's established pattern | Anything you could resolve by reading one more file |

**Over-escalation defeats the workflow.** An agent that asks about everything is worse than one that decides — the user delegated the work to avoid answering these. Before escalating, confirm the answer is not in the code, the config, or the brief. If uncertain but the stakes are low, pick the sensible default, state the assumption, and continue.

Never escalate to transfer responsibility for a decision you are equipped to make.

## Question payload

Subagents return unresolved questions in this shape, alongside their normal output:

```yaml
escalations:
  - id: Q1
    header: Limit scope           # <= 12 chars; a label, not the question
    question: Should the rate limit apply per API key or per organization?
    why: >
      The ticket says "per customer", which maps to neither. Bucket key derivation
      differs, and per-organization needs an org lookup the limiter does not have today.
    blocks: [T-002]               # tasks or stages that cannot proceed; [] if advisory
    options:
      - label: Per organization   # 1-5 words
        description: >
          Matches "per customer" most closely. Needs an org lookup in the hot path,
          adding a Redis read per request.
        recommended: true
      - label: Per API key
        description: >
          No extra lookup, limiter stays cheap. Customers with many keys get
          proportionally more quota.
      - label: Per key, org cap
        description: >
          Both limits enforced. Correct under both readings, roughly twice the
          bucket operations per request.
```

Rules:
- **2 to 4 options.** Fewer is not a question; more is a survey. The harness supplies an "Other" escape automatically — never add one.
- **Exactly one `recommended: true`,** and it must be a real recommendation. "It depends" is not an answer to give someone who delegated this.
- `description` states what happens if chosen **and the cost** — the tradeoff is what the user is actually deciding.
- `why` explains what changes based on the answer. A question whose answer changes nothing should not be asked.
- `blocks` is honest: list only what genuinely cannot proceed. Overstating it stalls work that could continue.

## Orchestrator handling

1. **Collect** escalations from the completed stage.
2. **Batch** into a single ask — the question tool accepts at most 4 per call. With more than 4, ask the blocking ones first and defer the rest to the next round.
3. **Ask** using the harness's native question tool, preserving the subagent's wording and options. Put the recommended option first, labeled `(Recommended)`.
4. **Record** each answer in `overview.md` under **Open questions**, including who decided. This is the audit trail: an enterprise reviewer needs to see that a human made the call.
5. **Route back** to the subagent that raised the question, with the answers, so it revises with its context intact.

Continue work that does not depend on the answer while a question is outstanding. Only what `blocks` names is actually blocked.

## Unresolved escalations

An unresolved escalation **blocks**. Never pick the recommended option to keep the pipeline moving, and never soften a question into an assumption — that is the same failure as guessing, one step removed.

`workflow.escalation.unattended` governs runs with no user available (CI, scheduled, headless):

- `block` (default) — record the questions in `overview.md`, set status `blocked`, and stop. Safe and auditable.
- `accept-recommended` — proceed with each recommended option, recording in `overview.md` that it was auto-accepted and unreviewed. Only for runs a human will review before merge.

## Harnesses without a native question tool

Present the questions as numbered text with their options and recommendation, then stop and wait. Never hang on a tool that is not there, and never silently downgrade to picking an option.
