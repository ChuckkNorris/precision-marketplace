# Precision Engineering Configuration Schema

Authoritative schema for `.agents/precision-engineering.config.md`. `/pe-setup` writes against this schema; every workflow agent reads against it.

Unknown keys are preserved, never discarded — the config is extensible by design. Agents must ignore keys they do not understand rather than error.

## Resolution rules

- **Missing config** — halt and instruct the user to run `/pe-setup`. Never guess commands.
- **Missing optional key** — use the documented default below.
- **Missing required key** (`version`, `applications[].name`, `applications[].path`) — halt and report which key.
- **Skills** resolve in this order, all loaded, later entries never replace earlier ones: `applications[].skills` (mandatory for that app) → `workflow.steps.<step>.skills` (mandatory for that step) → agent-discovered skills (optional).
- **Commands** are executed verbatim from repo root. If a declared command is absent for a step that requires it, halt and report — do not substitute a guess.

## Schema

```yaml
version: 1                          # required; schema version

repository:
  strategy: monorepo                # monorepo | polyrepo
  defaultBranch: main

workflow:
  testStrategy: test-after          # tdd | test-after | none
  gates:                            # approve = stop for human; auto = proceed
    plan: approve
    implementation: auto
    pullRequest: approve
  steps:                            # per-step mandatory skills (see resolution rules)
    explore:   { skills: [] }
    plan:      { skills: [] }
    implement: { skills: [] }
    review:    { skills: [] }       # standards the Reviewer judges the diff against
  quality:
    coverageMin: 80                 # null disables the check
    blockOnLintError: true
    blockOnTypeError: true
  escalation:
    unattended: block               # block | accept-recommended

tracker:
  provider: none                    # jira | github | azdo | none
  idPattern: null                   # regex identifying a ticket ref in the argument
  fetch: none                       # mcp | cli | none
  command: null                     # required when fetch: cli; {id} is substituted

git:
  branchPattern: "feature/{ticket}-{slug}"
  commitConvention: conventional    # conventional | plain
  commitGranularity: per-task       # per-task | squashed
  pr:
    titlePattern: "{ticket}: {summary}"
    draft: false
    base: main
    reviewers: []
    labels: []

applications:                       # required; one entry per deployable/buildable unit
  - name: api                       # required; unique
    path: apps/api                  # required; repo-relative, "." for polyrepo root
    type: backend                   # frontend | backend | fullstack | mobile | service | library | infrastructure
    stack: [typescript, express]
    skills: [clean-modular-code]    # always loaded when this app is in scope
    commands:
      install: pnpm -C apps/api install
      build: pnpm -C apps/api build
      test: pnpm -C apps/api test
      testUnit: pnpm -C apps/api test:unit
      testIntegration: pnpm -C apps/api test:integration
      lint: pnpm -C apps/api lint
      typecheck: pnpm -C apps/api typecheck
      migrate: pnpm -C apps/api db:migrate
    testing:
      framework: vitest
      testPath: apps/api/src/**/*.test.ts
      coverageMin: 80               # overrides workflow.quality.coverageMin
    conventions: |
      Free-form notes injected verbatim into planner and developer context.
```

## Field reference

### `workflow.testStrategy`
- `tdd` — Developer writes a failing test, confirms it fails, then implements to green, per task.
- `test-after` — Developer implements, then writes tests before marking the task complete.
- `none` — No test authoring required. Existing tests must still pass.

### `workflow.gates`
`approve` stops the workflow and surfaces the artifact for human sign-off. `auto` proceeds without stopping. Gates are the only sanctioned pause points; agents never invent their own. A light-track run has no plan gate, since it produces no plan; `gates.plan` is inert there.

### `workflow.escalation.unattended`
Governs runs with no user available (CI, scheduled, headless). `block` records the questions,
sets status `blocked`, and stops. `accept-recommended` proceeds with each recommended option,
recording in `overview.md` that it was auto-accepted and unreviewed — only for runs a human
reviews before merge. See [escalation.md](./escalation.md).

### `workflow.steps.<step>.skills`
Applies the named skills to that step regardless of which app is in scope. Use for cross-cutting standards (e.g. `security-review` on `review`).

### `applications[].type`
Selects the plan template the Planner structures that app's design sections from, per the mapping in [plan-contract.md](./plan-contract.md). `fullstack` emits both templates' sections in a single plan file — this is how MVC and monolith repos are modeled. Declare one application, not two.

### `applications[].commands`
Only `build` and `test` are needed for a minimal setup. Every declared command must have been validated by `/pe-setup`. Omit a command rather than declaring one that does not work.

## Extending the schema

Add new top-level keys freely. To make a new key meaningful to the workflow, reference it from the agent that consumes it and document it here. Agents treat this file as the contract, so an undocumented key is inert but harmless.
