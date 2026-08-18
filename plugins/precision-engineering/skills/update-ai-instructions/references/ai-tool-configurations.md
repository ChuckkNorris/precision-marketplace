# AI Tool Configurations

Skills and agents have entry points for Claude, Cursor, and GitHub Copilot. Each carries tool-specific frontmatter and references its source of truth in `.agents/`.

- **Skills** — step-based workflows, standards, or commands
- **Agents** — isolate context for one task, using skills, returning results to the orchestrator
- **Shared references** — contracts consumed by more than one skill or agent

## Agents delegate to skills

An agent states its **goal**, its **constraints**, and the **pathway** — which skill to invoke. Procedure (inputs, method, output format, step-level guardrails) lives in the skill.

This keeps agent context lean, keeps the role-defining constraints salient rather than buried in steps, and makes each procedure invocable on its own without its agent. An agent file that grows a Method section has absorbed procedure that belongs in a skill.

Constraints in the agent are the few that define the role — violating one makes it a different agent. Everything else is a skill guardrail. Do not restate the same rule in both.

## Source of truth — `.agents/`

| Path | Contents |
|---|---|
| `.agents/` | Project directory |
| `.agents/skills/<skill>/SKILL.md` | Skill definitions |
| `.agents/skills/<skill>/references/` | Per-skill references |
| `.agents/agents/<agent>.md` | Agent definitions |
| `.agents/shared/` | References used by multiple skills or agents |
| `AGENTS.md` | Root and directory-specific agent files |

Logic lives here and nowhere else. An entry point contains frontmatter and a reference — nothing more. Logic placed in an entry point diverges silently across the harnesses that do not read it.

## Claude

References `.agents/**/*.md` and `AGENTS.md` via `@` paths from the repository root.

| Path | Contents |
|---|---|
| `.claude/skills/<skill>/SKILL.md` | Skill entry points |
| `.claude/agents/<agent>.md` | Agent entry points |
| `CLAUDE.md` | References `AGENTS.md` |

Frontmatter: `name`, `description`, and for agents `tools` (and optionally `model`). Grant an agent only the tools its role needs — a read-only agent with write tools will eventually write.

```markdown
---
name: reviewer
description: Adversarial review of implemented changes against the plan...
tools: Glob, Grep, Read, Write, Bash, Skill
---

Follow @.agents/agents/reviewer.md
```

## Cursor

References `.agents/**/*.md` via relative markdown links.

| Path | Contents |
|---|---|
| `.cursor/agents/<agent>.md` | Agent entry points |

Cursor has no skill-invocation mechanism equivalent to Claude's, so a Cursor agent entry point **links its procedure skill directly** alongside the agent file. Claude entry points link only the agent and let it invoke the skill lazily.

Frontmatter: `name`, `description`, `model`. Cursor takes a fully qualified model id (`claude-opus-5`) where Claude takes the short alias (`opus`).

```markdown
---
name: reviewer
description: Adversarial review of implemented changes against the plan...
model: claude-opus-5
---

Follow [reviewer](../../.agents/agents/reviewer.md)

Procedure: [pe-review](../../.agents/skills/pe-review/SKILL.md)
```

## GitHub Copilot

Reads the Claude agents in `.claude/agents/`, which reference `.agents/`. No separate directory.

## Sync guardrails

Verify after adding or changing any skill or agent:

- Every `.agents/agents/*.md` has a `.claude/agents/*.md` and a `.cursor/agents/*.md` entry point.
- Every `.agents/skills/*/SKILL.md` has a `.claude/skills/*/SKILL.md` entry point.
- `description` fields match across the source of truth and every entry point. They drive automatic selection, so drift silently changes which agent gets picked.
- Every agent's `Pathway` names a skill that exists, and every Cursor entry point links that same skill.
- Agents carry goal, constraints, and pathway only — no Method or Output sections.
- No entry point contains logic.
- Deleting a skill or agent deletes its entry points in the same change.
