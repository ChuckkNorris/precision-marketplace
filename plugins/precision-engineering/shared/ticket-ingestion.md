# Ticket Ingestion

Normalizes the `/pe-develop` argument into a **brief** with one shape, whatever the source. Every downstream agent consumes the brief, never the raw ticket — so adding a tracker provider changes nothing downstream.

## Resolution

1. If `tracker.provider` is `none`, or `tracker.idPattern` does not match the argument, treat the argument as a **literal description**. Skip to Brief.
2. If `tracker.idPattern` matches, extract the ticket ID and fetch by `tracker.fetch`:
   - `mcp` — use the connected tracker MCP tool. If no such tool is available, fall through to step 3.
   - `cli` — run `tracker.command` with `{id}` substituted.
   - `none` — do not fetch.
3. **On fetch failure** (no credentials, network error, unknown ID) — report the failure, then ask the user to paste the ticket contents. Never fabricate ticket detail and never proceed on the ID alone.

## Provider defaults

| Provider | `idPattern` | `fetch` | `command` |
|---|---|---|---|
| `jira` | `[A-Z][A-Z0-9]+-\d+` | `mcp` | `null` |
| `github` | `#(\d+)` or issue URL | `cli` | `gh issue view {id} --json title,body,labels` |
| `azdo` | `AB#(\d+)` | `cli` | `az boards work-item show --id {id} --output json` |

`/pe-setup` proposes these; the user may override any field.

## Brief

```markdown
# Brief

**Ticket:** <id or "none"> · **Source:** <provider | description> · **Title:** <one line>

## Requirement
Verbatim where the source is authoritative. Never paraphrase acceptance criteria —
a reworded requirement is a changed requirement.

## Stated acceptance criteria
Copied from the ticket. "None stated" if absent.

## Ambiguities
What the source leaves undefined. Carried into the plan's open questions.
```

Write the brief to `docs/plans/<feature-slug>/brief.md` so later steps and follow-up requests can re-read it without a second fetch.
