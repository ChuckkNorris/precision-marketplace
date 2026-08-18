# Precision Marketplace

Precision Marketplace is a **harness-agnostic AI plugin marketplace** — one repository of skills, agents, and
commands that installs into Claude Code, Cursor, and Codex from the same source.

A plugin here is plain Markdown and JSON: `skills/<name>/SKILL.md`, `agents/<name>.md`,
`commands/<name>.md`, plus a manifest. What differs between harnesses is only the manifest and where
it lives, so every plugin ships three of them — for Claude, Cursor, and Codex — over one shared body
of instructions. Write the workflow once; install it wherever your team already works.

## Plugins

| Plugin | Description | Harnesses |
| --- | --- | --- |
| [precision-engineering](plugins/precision-engineering) | A configuration-driven agentic development workflow for enterprise-grade codebases. Explores the code, writes a plan a human approves, implements it through specialized subagents, and reviews the diff adversarially before opening a pull request. | Claude · Cursor · Codex |

A browsable overview of the plugin — skills, agents, commands, and workflow diagrams — is published
from [`public/index.html`](public/index.html) to this repository's GitHub Pages site by
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) on every push to `main` that touches
`public/`.

The site is a single self-contained file with no build step: edit it, open it in a browser, push it.
Its `PLUGINS` data is the one place to update when a plugin gains a skill, agent, or command.

**One-time repository setup:** Settings → Pages → *Build and deployment* → Source: **GitHub Actions**,
then set *Visibility* to **Private** so only organization members can view it. Private Pages requires
GitHub Enterprise Cloud; without it the site deploys publicly and the visibility control is absent.

## Using this marketplace

### Claude Code

```text
/plugin marketplace add ChuckkNorris/precision-marketplace
/plugin install precision-engineering@precision-claude-plugin-marketplace
```

### Cursor

Team admins add it once in the Cursor Dashboard: **Plugins → Team Marketplaces → Add Marketplace →
Import from Repo**, pointing at this repository. Enable **Auto Refresh** so plugins re-index on push.
Everyone else then installs plugins from the **Customize** sidebar in Cursor.

### Codex

Point Codex at this repository's `.agents/plugins/marketplace.json` — Codex reads `.agents/` by
default, so no extra configuration is needed. Each plugin's `.codex-plugin/plugin.json` carries the
`interface` block Codex renders (display name, category, capabilities, default prompts).

### Any other client

Skills are portable [Agent Plugins](https://agent-plugins.org/specification) Markdown. A client that
reads `SKILL.md` files can consume `plugins/<plugin>/skills/` directly — it just won't load the
harness-specific commands and agents, so invoke the skills by name instead.

**Prefer project-level installs.** Most of these plugins are wired to a specific consuming repo (its
config file, paths, and providers), so enable them per-repo and check the marketplace and enabled
plugins into that repo's settings, rather than enabling them globally for your user.

## Repository layout

```text
.claude-plugin/marketplace.json    # Marketplace manifest, one per harness
.cursor-plugin/marketplace.json
.agents/plugins/marketplace.json   # Codex — it reads .agents/ by default
plugins/<plugin-name>/
  plugin.json                      # Optional source of truth for the three manifests
  .claude-plugin/plugin.json       # Per-plugin manifest, one per harness
  .cursor-plugin/plugin.json
  .codex-plugin/plugin.json
  skills/<skill-name>/SKILL.md     # Skills — the procedures
  agents/<agent-name>.md           # Agents — the roles that run them
  commands/<command-name>.md       # Slash-command entry points
  shared/                          # Contracts referenced by more than one skill or agent
public/index.html                  # The published marketplace site
scripts/validate-marketplace/      # CI validation for manifests and skills
  index.mjs                        # Entry point; walks the harness config
  config.mjs                       # The harnesses supported and what each requires
  checks/                          # Marketplace, plugin, parity, and skill checks
  lib/                             # Paths, file reads, the rule engine, reporting
```

## Harness parity

A plugin supports a harness only when **both** exist: its `.<harness>-plugin/plugin.json`, and an
entry for it in that harness's marketplace manifest. Keep `plugins[]` in the same order across all
three marketplace files, with identical `owner` and `metadata.version`.

The [`plugin-harness-parity`](.agents/skills/plugin-harness-parity/SKILL.md) skill audits this and
generates whatever is missing. Ask your agent to "check harness parity" or "add a new plugin".

## Adding a plugin

1. Create `plugins/<plugin-name>/` with your skills under `skills/<skill-name>/SKILL.md` (frontmatter
   `name` must equal the folder name) and a `README.md`.
2. Add all three `.<harness>-plugin/plugin.json` manifests and register the plugin in all three
   marketplace manifests — or run the `plugin-harness-parity` skill and let it generate them.
3. Add a row to the table above and an entry to the `PLUGINS` data in `public/index.html`.
4. Run `node scripts/validate-marketplace/index.mjs` locally; CI runs the same check.

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching and the PR process.
