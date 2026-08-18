---
name: plugin-harness-parity
description: Audit or scaffold plugins in this marketplace so every plugin is configured for all three harnesses (Cursor, Claude, Codex) — a `.<harness>-plugin/plugin.json` per plugin plus a matching entry in each harness's marketplace manifest. Triggers on "check harness parity", "is this plugin set up for Claude/Codex/Cursor", "add a new plugin", "generate the missing plugin manifests".
allowed-tools: Read Write Edit Glob Grep AskUserQuestion
---

# Plugin Harness Parity

Repo-local maintenance skill. Two jobs:

- **Audit** — scan every `plugins/*` and every root marketplace manifest, report
  what is missing per harness, and generate the missing files.
- **Scaffold** — create a new plugin already wired for all three harnesses.

Harnesses: `cursor`, `claude`, `codex`. Nothing else counts as "supported".

## Required layout

```text
.cursor-plugin/marketplace.json         # Cursor marketplace
.claude-plugin/marketplace.json         # Claude marketplace
.agents/plugins/marketplace.json        # Codex marketplace — Codex reads .agents/ by default
plugins/<plugin>/
  plugin.json                           # optional; source of truth when present
  .cursor-plugin/plugin.json
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json
  skills/<skill>/SKILL.md
```

A plugin "supports" a harness only when **both** exist: its
`.<harness>-plugin/plugin.json`, and an entry for it in that harness's
marketplace manifest. Missing either one is a failure.

The marketplace paths are not uniform: Cursor and Claude read a
`.<harness>-plugin/` dot-directory, Codex reads `.agents/plugins/`. The
authoritative list is `HARNESSES` in
[`scripts/validate-marketplace/config.mjs`](../../../scripts/validate-marketplace/config.mjs).

## Audit

1. Glob `plugins/*` → the plugin list. Ignore dot-directories.
2. For each of `cursor`, `claude`, `codex`:
   - Read that harness's marketplace manifest, at the path listed in
     [Required layout](#required-layout). Missing file → the whole harness is
     unsupported; create it (see [Marketplace shape](#marketplace-shape)).
   - For each plugin, check `plugins/<plugin>/.<harness>-plugin/plugin.json`
     exists and its `name` equals the folder name.
   - Check the marketplace `plugins[]` has an entry whose `name` is the folder
     name and whose `source` is `./plugins/<plugin>`.
   - Flag entries pointing at plugins that no longer exist.
3. Report a plugin × harness table before writing anything. Then generate the
   missing files.
4. Run [Verify](#verify).

## Generating a missing manifest

Take the source of truth in this order: `plugins/<plugin>/plugin.json`, then any
existing `.<harness>-plugin/plugin.json`. Never invent a version or description —
copy them. Never overwrite an existing manifest during an audit; only add
missing keys, and say so.

Common fields (all harnesses): `name`, `version`, `description`, `author`,
`keywords`, plus these two, which point at this repo and never an external one:

- `homepage` — `https://github.com/ChuckkNorris/precision-marketplace/blob/main/plugins/<plugin>/README.md`
- `repository` — `https://github.com/ChuckkNorris/precision-marketplace`

**Cursor** — common fields, plus `displayName`, `category`, `skills: "./skills/"`.

**Claude** — common fields only:

```json
{
  "name": "<plugin>",
  "description": "<same description>",
  "version": "<same version>",
  "author": { "name": "Precision Marketplace" }
}
```

**Codex** — common fields, plus `skills: "./skills/"` and an `interface` block:

```json
{
  "skills": "./skills/",
  "interface": {
    "displayName": "<Title Case>",
    "shortDescription": "<≤80 chars>",
    "longDescription": "<the description, expanded>",
    "developerName": "Precision Marketplace",
    "category": "Coding",
    "capabilities": ["Interactive", "Read", "Write"],
    "websiteURL": "https://chuckknorris.github.io/precision-marketplace/#/plugin/<plugin>",
    "defaultPrompt": ["<3 phrases a user would type>"]
  }
}
```

Match `plugins/precision-engineering/.codex-plugin/plugin.json` for tone and field order.

### Marketplace shape

Same shape at every path in [Required layout](#required-layout):

```json
{
  "name": "precision-<harness>-plugin-marketplace",
  "owner": { "name": "Precision Marketplace" },
  "metadata": {
    "description": "Precision Marketplace — shared marketplace of <Harness> plugins and skills.",
    "version": "0.1.0"
  },
  "plugins": [
    { "name": "<plugin>", "source": "./plugins/<plugin>", "description": "<same description>" }
  ]
}
```

Keep `plugins[]` in the same order across all three files. Keep `owner` and
`metadata.version` identical to `.cursor-plugin/marketplace.json`.

## Scaffolding a new plugin

Ask for the name (kebab-case), one-sentence description, and version (default
`0.1.0`) if not given. Then create:

- `plugins/<name>/plugin.json` — the source of truth.
- All three `.<harness>-plugin/plugin.json` files per the shapes above.
- `plugins/<name>/skills/<skill>/SKILL.md` — frontmatter `name` **must** equal
  the skill folder name; `description` is required and non-empty.
- `plugins/<name>/README.md`.
- An entry in all three marketplace manifests.
- A row in the root `README.md` plugin table.

Finish with [Verify](#verify).

## Verify

Re-read every file from disk. Each line is a check; any miss is a failure to
report and fix, not to note in passing.

| Scope | Check |
|---|---|
| Marketplace | Parses as JSON. `name` is kebab-case, `owner.name` is set, `plugins[]` is non-empty. |
| Marketplace | No duplicate plugin `name`. Every `source` is a relative path containing no `..`, and its directory exists. |
| Marketplace | `plugins[]` order, `owner`, and `metadata.version` are identical across all three files. |
| Plugin manifest | Parses as JSON. `name` is kebab-case and equals both the folder name and the marketplace entry. |
| Skills | The plugin has at least one `skills/<skill>/SKILL.md` — or a root `SKILL.md` for a single-skill plugin. |
| Skill frontmatter | Opens with `---`, closes with `---`, and the block is under 1024 characters. |
| Skill frontmatter | `name` is lowercase letters, numbers, and hyphens, and equals the skill folder name. `description` is present and non-empty. |

## Reporting

State per harness what was missing and what you wrote. If a harness manifest
existed but was incomplete, say which keys you added. Do not claim parity you
have not re-checked on disk.
