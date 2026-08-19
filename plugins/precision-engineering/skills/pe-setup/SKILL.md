---
name: pe-setup
description: Detect a repository's applications, stacks, and commands, then generate or refresh the Precision Engineering configuration. Idempotent - safe to re-run as the repository changes. Use before the first /pe-develop run, or when the repository layout, tooling, or conventions change.
---

# Precision Engineering Setup

Produce a `.agents/precision-engineering.config.md` whose every declared command has been proven to work.

Method is **detect → propose → confirm → validate → write**. Never write a config value you have neither detected nor been told.

## 1 - Detect

Read the repository; do not ask what you can determine.

**Applications** — Locate build manifests (`package.json`, `pom.xml`, `build.gradle`, `go.mod`, `*.csproj`, `pyproject.toml`, `Cargo.toml`, `Gemfile`). Each buildable unit is a candidate application. Workspace definitions (pnpm/yarn/npm workspaces, Gradle settings, Cargo workspace, `go.work`) indicate `monorepo`; a single root manifest indicates `polyrepo`.

**Type** — Infer from dependencies, not directory names. UI framework → `frontend`. HTTP server framework → `backend`. Both in one unit → `fullstack` (this is how MVC and monolith repos are modeled — one application, not two). No entry point → `library`. Terraform/Helm/CloudFormation → `infrastructure`.

**Commands** — Read manifest scripts, `Makefile` targets, and CI workflow files. **CI is the most reliable source** — it records the commands that actually gate merges. Prefer a command CI runs over one a README claims.

**Testing** — Framework from dependencies; test paths from existing test files; coverage thresholds from tool config or CI.

**Tracker** — Ticket ID patterns in recent commit messages and branch names. Provider defaults are in [ticket-ingestion.md](../../shared/ticket-ingestion.md).

**Git conventions** — Branch naming and commit style from `git log` and existing branches. Detect Conventional Commits by prefix frequency, not by a single example.

## 2 - Propose

Present the detected config with **evidence inline** — each non-obvious value paired with what it came from (`build.gradle`, `.github/workflows/ci.yml:23`). Evidence lets the user correct a wrong inference instead of accepting it.

Flag low-confidence detections explicitly rather than burying them.

## 3 - Confirm

Ask only what detection cannot answer. Use structured questions with a recommended default. Keep to one round:

- **Test strategy** — `tdd`, `test-after`, or `none`
- **Gates** — which of plan / implementation / PR require human approval. The channel is automatic: in session when attended, on the pull request when not, so never ask which environment the config is for
- **Continuation** — the pull request trigger tokens, when any gate requires approval
- **Standards skills** — which apply per application and per workflow step
- **Conventions** — standards a newcomer could not infer from the code
- **Tracker** — provider and access method, if detection was inconclusive

On a re-run, ask only about keys new to the schema version (see [Re-running](#re-running)) and detections the user needs to correct — never re-ask a settled value.

## 4 - Validate

**Run every detected command.** A config full of plausible commands that do not execute is worse than an empty one — it fails deep inside a later `/pe-develop` run rather than here.

Run non-mutating commands (`build`, `test`, `lint`, `typecheck`) directly. Never run `migrate` or any command that mutates state — mark it `unvalidated` and tell the user.

Drop commands that fail and report them. Omitting a command is recoverable; declaring a broken one is not.

## 5 - Write

Write `.agents/precision-engineering.config.md` per [configuration-schema.md](../../shared/configuration-schema.md).

Report: applications detected, commands validated, commands dropped and why, and anything left unvalidated.

## Re-running

Idempotent by requirement. On an existing config:

- **Reconcile the schema version first.** Compare the config's `version` against the current one in [configuration-schema.md](../../shared/configuration-schema.md). If the config is older, read that file's Versioning table and, for every key added since: adopt the documented default where detection or the default settles it, and **ask the user for the rest** — a value that is a policy choice, not a repository fact, has no default worth guessing. Then write the current `version`. Report each key adopted and each key asked about. A config already at the current version skips this step; never rewrite `version` without having reconciled the keys behind it.
- **Preserve** every human-authored value — conventions, gates, skills, tracker settings, and any key not in the schema. Extensibility is the point; unknown keys survive untouched.
- **Refresh** detected values, and report each change as a diff for confirmation rather than applying it silently.
- **Report** applications that appeared or disappeared, and commands that stopped working.

Never silently overwrite a hand-edited value.
