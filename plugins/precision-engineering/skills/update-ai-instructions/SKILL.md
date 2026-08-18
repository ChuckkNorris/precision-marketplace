---
name: update-ai-instructions
description: Creates and updates tool-agnostic AI skills and agents with brevity and clarity to minimize context usage and maximize consistency and quality of outputs and outcomes. Always use this skill when creating or updating AI skills and agents.
---

# Update AI Instructions

## Layering

`.agents/` is the source of truth for all skills, agents, and shared references. Harness directories (`.claude/`, `.cursor/`) hold entry points that carry tool-specific frontmatter and reference `.agents/` — never duplicated logic.

Paths, frontmatter, and per-harness reference syntax: [ai-tool-configurations.md](./references/ai-tool-configurations.md)

## Writing instructions

- Be concise, clear, and unambiguous. Every sentence costs context in each run.
- State what to do. Add the reason only where an agent would otherwise reasonably do the wrong thing.
- Prefer tables and short lists over prose for anything enumerable.
- Keep terminology and formatting consistent across all instructions — the same concept keeps the same name everywhere.
- Write `description` fields to say *what the thing does and when to use it*. Selection is automatic and driven by this field alone.
- Write each skill to stand alone. The workflow loads whichever skills apply, in whatever combination, so a skill that leans on another being loaded is incomplete on its own. Where two skills need the same rule, the general one states the principle and the specific one states its own concrete instance — neither points at the other.
- Where a skill's subject spans tiers or stacks, `SKILL.md` states only what holds across all of them. A rule that *requires* a mechanism, directory, or file kind belonging to one tier goes in a reference for that tier; where tiers differ, `SKILL.md` states the invariant and each reference states its tier's form.
- State a rule as closed — "and no others", "nothing else", "the only" — only where that rule owns every case. Where the cases live elsewhere, in a reference or in another rule, state the principle and delegate. Counting cases you do not own is what the next addition silently contradicts.
- Put guardrails last, phrased as verifiable checks rather than aspirations.
- Clarify assumptions with the user before writing, rather than encoding a guess.

## Guardrails

- Redundant or conflicting instructions are removed or consolidated, not appended to.
- Every `.agents/` skill and agent has entry points for every harness, with matching `description` fields.
- No entry point contains logic.
- No skill references another skill. A skill references only `.agents/shared/` and its own `references/`.
- Shared contracts live in `.agents/shared/` and are referenced, never copied into the skills and agents that consume them.
- No rule closes an enumeration it does not own — every case is named by the rule stating the closure. Grep `and no others|nothing else|no other|the only` to locate candidates; each hit is read, never failed automatically.
- No `SKILL.md` whose subject spans tiers requires a mechanism, directory, or file kind specific to one of them. A rule naming every tier's form of one invariant satisfies this; a rule naming only one does not.
