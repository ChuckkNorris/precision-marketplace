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

**Before escalating,** confirm the answer is not in the code, the config, or the brief — an agent that asks about everything is worse than one that decides. Uncertain but low stakes: pick the sensible default, state the assumption, and continue. Never escalate to hand off a decision you are equipped to make.

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

`workflow.escalation.unattended` governs unattended runs:

- `block` (default) — record the questions in `overview.md`, set status `blocked`, and stop. Safe and auditable.
- `pr-comment` — record them, post them to the pull request as numbered questions with their options and recommendation, set status `blocked`, and stop. The answers arrive as replies on the next trigger. This is `block` with a channel, and is the right default for cloud runs; with no pull request open yet it falls back to `block`.
- `accept-recommended` — proceed with each recommended option, recording in `overview.md` that it was auto-accepted and unreviewed. Only for runs a human will review before merge.

## Attended and unattended runs

Every pause in this workflow — a gate or a question — needs a channel to the human. Which channel exists is a property of the **run**, not of the repository, so it is detected at runtime and never configured.

A run is **attended** when the harness can put a question to a person and wait for the answer: an interactive Claude Code, Cursor, or IDE session. It is **unattended** otherwise: a cloud agent, scheduled routine, CI job, or any headless invocation. Judge by whether a user turn can actually be awaited — a terminal, a TTY, or a human having started the job are not evidence of one.

| Pause | Attended | Unattended |
|---|---|---|
| Gate | Present the artifact in session and stop | Publish it as a pull request and stop; approval arrives as a signal on that PR |
| Escalation | Ask with the harness's question tool | Per `workflow.escalation.unattended` |

The same configuration therefore runs both ways. `gates.plan: approve` means *a human decides*, and the run picks the channel it has.

**Harnesses with no native question tool** but an attended user: present the questions as numbered text with their options and recommendation, then stop and wait. Never hang on a tool that is not there, and never silently downgrade to picking an option.
