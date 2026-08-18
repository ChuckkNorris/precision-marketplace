# Pull Request Feedback

Normalizes review comments on a published plan into Planner revision input, the way [ticket-ingestion.md](./ticket-ingestion.md) normalizes a ticket into a brief. The orchestrator collects; the Planner revises.

## Collect

1. Fetch the pull request's comments and review threads — `gh pr view {n} --json comments,reviews` or the connected provider's tool.
2. Keep what arrived **after the last plan commit**. Earlier feedback is already answered by the plan as it stands.
3. Drop the trigger comment itself, and any comment carrying only `approveToken` or `reviseToken`.
4. Keep review threads anchored to plan files with their `path:line` — that anchor tells the Planner exactly which decision is disputed.

Nothing left after filtering is not an error: report that the trigger carried no feedback and leave the gate `pending`.

## Record

Append to `overview.md` before routing, so the revision is auditable against what was asked:

```markdown
## Plan feedback
- [ ] C1 — @jsmith on `api.plan.md:34`: cap should be per organization, not per key
      https://github.com/org/repo/pull/412#discussion_r119
```

Mark each `[x]` once the Planner has addressed it. An entry left `[ ]` after a revision is unaddressed feedback, and blocks approval the same way an open question does.

## Route

Send the Planner the recorded entries and the plan directory. It revises in place per its own procedure, preserving task markers.

- **Feedback contradicting the ticket** is an open question, not an instruction — the Planner escalates rather than choosing which source wins.
- **Feedback naming work outside the requirement** goes to `## Out of scope` with the commenter named, never silently folded into tasks.
- A revision never approves its own gate. The reviewer who asked confirms.
