# Precision Engineering Configuration Schema

Authoritative schema for `.agents/precision-engineering.config.md`. `/pe-setup` writes against this schema; every workflow agent reads against it.

Unknown keys are preserved, never discarded — the config is extensible by design. Agents must ignore keys they do not understand rather than error.

## Resolution rules

- **Missing config** — halt and instruct the user to run `/pe-setup`. Never guess commands.
- **Missing optional key** — use the documented default below.
- **Missing required key** (`version`, `applications[].name`, `applications[].path`) — halt and report which key.
- **Stale `version`** — the config declares a version older than this file. Never halt: apply the documented default for every key added since, report the drift, and recommend `/pe-setup` to reconcile it. Only a config whose `version` is *absent* halts.
- **Skills** resolve in this order, all loaded, later entries never replace earlier ones: `applications[].skills` (mandatory for that app) → `workflow.steps.<step>.skills` (mandatory for that step) → agent-discovered skills (optional).
- **Model** applies to that step's subagent and is passed to the harness verbatim. It defaults to `inherit`, so a step with no model set runs on the session's own. **A step with no `model` is unconfigured**, which is what tells `/pe-setup` to ask for one; absent and empty read the same, so the template's `model: ""` is an unconfigured step. Never infer a model from a step's name or role. It is inert when a stage skill is invoked on its own — there is no subagent to launch, so the step runs in the calling session.
- **Commands** are executed verbatim from repo root. If a declared command is absent for a step that requires it, halt and report — do not substitute a guess.

## Schema

```yaml
version: 3                          # required; schema version — see Versioning

repository:
  strategy: monorepo                # monorepo | polyrepo
  defaultBranch: main

workflow:
  testStrategy: test-after          # tdd | test-after | none
  developmentStrategy: sequential   # sequential | parallel
  gates:                            # approve = a human decides; auto = proceed
    plan: approve
    implementation: auto
    pullRequest: approve
    channel: auto                   # auto | session | pr — auto follows run attendance
  continuation:                     # how a gate published to a PR is resolved later
    trigger: comment                # comment | label | review
    approveToken: "#plan-approved"
    reviseToken: "#plan-revise"     # null = any other comment implies revise
    claimLabel: "pe:running"        # applied while an agent holds the branch
    claimTimeoutMinutes: 60         # a claim older than this is treated as abandoned
    maxTriggers: 10                 # resolutions allowed on one plan directory
  steps:                            # per-step mandatory skills (see resolution rules)
    explore:   { skills: [], model: "" }  # unset model = inherit, and /pe-setup asks for one
    plan:      { skills: [], model: "" }
    implement: { skills: [], model: "" }
    review:    { skills: [], model: "" }  # standards the Reviewer judges the diff against
  quality:
    coverageMin: 80                 # null disables the check
    blockOnLintError: true
    blockOnTypeError: true
  escalation:
    unattended: block               # block | accept-recommended | pr-comment

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
    planTitlePattern: "Plan: {ticket} — {summary}"   # plan gate published to a PR
    draft: false
    base: main
    reviewers: []
    labels: []

runtime:                            # optional; how concurrent work is kept from colliding
  isolation: assigned               # assigned | built-in
  portBlockSize: 100
  ports:                            # host-published ports only
    - { name: api,      default: 5193, env: API_PORT }
    - { name: postgres, default: 5432, env: PG_PORT }
  env:                              # {port:<name>} substituted with the assigned value
    ConnectionStrings__Db: "Host=localhost;Port={port:postgres};Database=app"
  up:   docker compose up -d --wait postgres
  down: docker compose down -v
  preflight: [docker info, dotnet --version]

applications:                       # required; one entry per deployable/buildable unit
  - name: api                       # required; unique
    path: apps/api                  # required; repo-relative, "." for polyrepo root
    type: backend                   # frontend | backend | fullstack | mobile | service | library | infrastructure
    stack: [typescript, express]
    dependsOn: []                   # other applications whose runtime this one needs
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

### `workflow.developmentStrategy`
- `sequential` — One Developer runs at a time. Nothing is allocated, and collisions with anything else on the host are the developer's to manage. This is the default, and how every run behaved before `runtime` existed.
- `parallel` — Concurrent Developers each get their own worktree and, where `runtime.isolation` is `assigned`, their own block of ports.

`parallel` with no `runtime` block still isolates by worktree, which suffices only for a repository whose tests bind no ports.

### `workflow.gates`
Gates are the only sanctioned pause points; agents never invent their own.

| Mode | Behavior |
|---|---|
| `auto` | Proceed without stopping. |
| `approve` | A human decides. **Attended**, the artifact is presented in session; **unattended**, it is committed and published as a pull request, and approval arrives on a later invocation as a signal on that PR. |

**`approve` needs no environment-specific setting.** Attendance is a property of the run, detected at runtime per [escalation.md](./escalation.md) — the same config drives an interactive session and a cloud agent, and the unattended channel is what makes a run survive a process boundary.

Override with `gates.channel` only to force the pull request channel for an attended run, when a team reviews plans asynchronously by policy:

```yaml
workflow:
  gates:
    channel: auto     # auto | session | pr
```

### `workflow.continuation`
Read only when a gate resolves through a pull request. `approveToken` in a pull request comment resolves the pending gate; `reviseToken` — or any other comment carrying feedback, when it is `null` — routes that feedback to the Planner per [pr-feedback.md](./pr-feedback.md).

**Who may approve is decided outside this workflow.** The routine, action, or human invoking the agent has already made that call; the workflow records the resolver, never adjudicates them. Gate a comment trigger on repository permissions before it reaches the agent.

`claimLabel` is how one agent tells another that it holds the branch; `claimTimeoutMinutes` is how long that claim survives before an agent that crashed without releasing it can be superseded. Judge age from the platform's own record of when the label was applied. `maxTriggers` bounds the approve-revise loop on one plan directory.

### `workflow.escalation.unattended`
Governs unattended runs. `block` records the questions,
sets status `blocked`, and stops. `pr-comment` posts them to the pull request and stops, so the
answers arrive on the next trigger. `accept-recommended` proceeds with each recommended option,
recording in `overview.md` that it was auto-accepted and unreviewed — only for runs a human
reviews before merge. See [escalation.md](./escalation.md).

### `workflow.steps.<step>.skills`
Applies the named skills to that step regardless of which app is in scope. Use for cross-cutting standards (e.g. `security-review` on `review`).

### `runtime`
Read only when `developmentStrategy` is `parallel`. Omit it when the repository needs no isolation.

| Key | Meaning |
|---|---|
| `isolation` | `assigned` — the workflow allocates ports and injects them. `built-in` — the stack isolates itself (Aspire, testcontainers, dev containers); nothing is allocated and only the worktree separates runs. |
| `portBlockSize` | Slot N gets `default + N × portBlockSize` for every port. Size it so no computed port can land on another port's default. |
| `ports` | Only ports crossing the host boundary. Container-to-container addresses never vary and are not listed. |
| `env` | Values every stack needs beyond the ports themselves, injected alongside them. `{port:<name>}` is substituted with that port's assigned value — for a setting like a connection string that cannot be overridden one field at a time. |
| `up` / `down` | Bring the stack up and tear it down. Omit both and no lifecycle runs; commands are simply given the injected environment. |
| `preflight` | Tool-availability checks. Run under **both** strategies, before any stage does work. |

Injection is by environment variable, never by rewriting a command string — that is what keeps this repository-agnostic.

### `workflow.steps.<step>.model`
Runs that step's subagent on a named model instead of the session's own. Defaults to `inherit`: a step with no model set runs on whatever model the invoking session runs on. That absence also marks the step unconfigured, which is what makes `/pe-setup` ask — and setting it, `inherit` included, settles the step.

**Use the full model name** (`claude-opus-5`), not a short alias — aliases are harness-specific where full names are not. `inherit` is this config's own sentinel rather than a model id: it means *inherit the current session*. Pass it through where the launch accepts `inherit`, and leave the launch's model unset where it does not — the subagent runs on the session's model either way.

An opaque string the workflow never parses: it reaches the harness unchanged, so write the value that harness's subagent launch accepts. An unrecognized value is the harness's error to raise, not the workflow's to validate.

### `applications[].type`
Selects the plan template the Planner structures that app's design sections from. `fullstack` emits both templates' sections in a single plan file — this is how MVC and monolith repos are modeled. Declare one application, not two.

### `applications[].dependsOn`
Other applications whose runtime this one needs in order to build, test, or run. The workflow starts the closure of the in-scope applications over this field, so an end-to-end suite naming the app and API it drives gets all three started for it. Purely a runtime relationship — task scheduling is governed by the plan's own `Depends on` tags.

### `applications[].commands`
Only `build` and `test` are needed for a minimal setup. Every declared command must have been validated by `/pe-setup`. Omit a command rather than declaring one that does not work.

## Versioning

`version` in a repository's config records the schema it was written against. This file's `version` is the current one.

**Bump it whenever this file changes in a way a config cannot absorb silently:**

| Change | Bump | Why |
|---|---|---|
| New key with a documented default | yes | `/pe-setup` needs to know to offer it; the default keeps old configs working |
| New allowed value on an existing key | no | Old configs stay valid unchanged |
| Key renamed, removed, or its meaning changed | yes | Old configs are wrong, not merely incomplete |
| Wording, examples, or field reference prose | no | Contract unchanged |

Every bump adds a row below, naming each key involved. That list is the only input `/pe-setup` has when reconciling a stale config — an unrecorded change is invisible to it.

| Version | Added / changed |
|---|---|
| 1 | Initial schema. |
| 3 | Added `workflow.developmentStrategy`, the `runtime` block, and `applications[].dependsOn`. Additive: a version 2 config runs unchanged on `sequential`, which is the pre-existing behavior. |
| 2 | Added `workflow.gates.channel`, `workflow.continuation` (`trigger`, `approveToken`, `reviseToken`, `claimLabel`, `claimTimeoutMinutes`, `maxTriggers`), and `git.pr.planTitlePattern`. Added `pr-comment` to `workflow.escalation.unattended`. All additive with defaults; a version 1 config runs unchanged on defaults. |
| 3 | Added `workflow.steps.<step>.model`. A policy choice with nothing to detect, so `/pe-setup` asks for it per step rather than adopting a default; it defaults to `inherit`, and a step with no `model` is unconfigured — which is what prompts the question. |

## Extending the schema

Add new top-level keys freely. To make a new key meaningful to the workflow, reference it from the agent that consumes it, document it here, and record it under Versioning. Agents treat this file as the contract, so an undocumented key is inert but harmless.
