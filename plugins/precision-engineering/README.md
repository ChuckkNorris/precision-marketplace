# Precision Engineering

A configuration-driven agentic development workflow for enterprise-grade codebases. It explores the code, writes a plan a human approves, implements it through specialized subagents, and reviews the result adversarially before opening a pull request.

Every run leaves an audit record: reconnaissance before design, a plan signed off at a gate, implementation bounded by a file manifest, and a reviewer that judges the diff without the ability to edit it.

## Install

Cursor: add the hosting marketplace repository (Customize → Plugins), then install **precision-engineering**.

Then run `pe-setup` in the repository you want to work in. The per-repository configuration is not shipped with the plugin — `pe-setup` writes it to `.agents/precision-engineering.config.md` in the consuming repository, which is the path every skill reads.

## Commands

| Command | Purpose |
|---|---|
| `pe-setup` | Detect the repository's applications, stacks, and commands, then generate `.agents/precision-engineering.config.md`. Run first; re-run when the repository changes. |
| `pe-develop <ticket\|pr\|description>` | Run the pipeline: explore → plan → approve → implement → review → PR. Resumes an in-flight run from its plan directory. |

Each stage is also invocable on its own — `pe-explore`, `pe-plan`, `pe-implement`, `pe-review` — for when you want one step without the pipeline, its gates, or its git handling.

## Pipeline

```
pe-develop <ticket|pr|description>
  0  Orchestrator   load config, normalize ticket -> brief.md + overview.md
                    (or resume: match overview.md to the current branch, jump to its status)
  1  Orchestrator   create branch
  2  Explorer       pe-explore    -> <app>.instructions.md "Current state"  (one per app, concurrent)
  3  Planner        pe-plan       -> <app>.plan.md + rest of <app>.instructions.md
  4  [GATE]         plan approval — in session, or published as a draft PR
  5  Developer      pe-implement  -> commits; green build/test/lint/typecheck to exit
                                     (concurrent per app when file manifests do not overlap)
  6  Reviewer       pe-review     -> judge the diff -> <app>.findings.md
                                     (blocking findings route back to 5)
  7  [GATE]         PR approval, then mark ready (or push and open)
```

**Every change runs every stage.** There is no abbreviated path: a change too small to plan is still planned, and its plan is correspondingly small. Nothing merges unplanned or unreviewed.

**The Reviewer changes nothing.** Defects, missed requirements, standards violations, and documentation gaps all become findings; the orchestrator routes the blocking ones back to the Developer, and the re-review judges the remediation diff alone. A reviewer that edited the code would be judging its own work.

**The exit gate runs once.** The Developer records each `build`, `test`, `lint`, and `typecheck` result against the commit it ran on; the orchestrator confirms that commit is `HEAD`, and the Reviewer reads that evidence rather than re-running the repository's slowest commands. Nothing is approved on unproven green — a verification table that is absent, red, or stale sends the gate back to the Developer.

**Cost is tiered by role.** The Explorer's job is search and citation, so it runs on Sonnet; the Planner, Developer, and Reviewer make judgment calls and run on Opus. Explorers fan out per application, and Developers do too when their manifests do not overlap.

**One configuration, both environments.** A gate set to `approve` means a human decides; *how* they are asked is detected at runtime. Attended — an interactive Claude Code or IDE session — the plan is presented in the conversation. Unattended — a cloud agent, routine, or CI job — it is committed and published as a draft pull request instead. Nothing in the config or the skills changes between the two.

**Runs survive a process boundary.** An unattended gate stops with its artifacts committed. Review happens as PR comments; an approval token in a comment triggers the next invocation, which matches `overview.md` to the branch and resumes from the recorded status rather than starting over. Plan and implementation share one branch and one PR, which flips from draft to ready at stage 7. Feedback routes back to the Planner as a revision, never as a restart.

Who may approve is decided before the agent runs — gate the trigger on repository permissions. The workflow records the resolver and the comment URL in `overview.md`; it does not adjudicate them.

**Questions reach the user through the orchestrator.** Subagents have no user turn, so a subagent composes the question with 2–4 options and a recommendation, and the orchestrator asks it. Unattended runs are governed by `workflow.escalation.unattended`, which defaults to blocking rather than guessing.

## Artifacts

Every run writes to `docs/plans/<feature-slug>/` in the consuming repository:

| File | Purpose |
|---|---|
| `brief.md` | The normalized requirement, whatever its source. |
| `overview.md` | Scope, cross-cutting design, risks, rollback, open questions, run state. |
| `<app>.plan.md` | Task checklist and the design a human approves at the gate. |
| `<app>.instructions.md` | Reconnaissance, file manifest, and per-task execution detail for the Developer. |
| `<app>.findings.md` | The Reviewer's verdict and ranked findings. |

`overview.md` is also the continuation record: it carries the branch, the run status, and each gate's standing decision, so a later invocation resumes from the files rather than from a conversation.

Each application gets two files, split by audience: the approver never reads manifest rows, and the Developer never pays for prose it cannot act on. Progress lives in the checklists themselves — `[ ]` not started, `[~]` in progress, `[x]` verified complete.

## Contents

```
.cursor-plugin/plugin.json    plugin manifest
agents/                       explorer, planner, developer, reviewer
skills/                       pe-develop, pe-setup, pe-explore, pe-plan, pe-implement,
                              pe-review, clean-modular-code, dotnet-api-standards,
                              update-ai-instructions
shared/                       contracts referenced by more than one skill or agent:
                              configuration schema, plan contract, escalation,
                              ticket ingestion, PR feedback
```

**Agents** carry the role — goal, constraints, and which procedure to run. **Skills** carry the procedure — inputs, method, output format, guardrails. Splitting them keeps each stage reusable outside the pipeline and keeps agent context lean.

This directory is self-contained: agents and skills reference `shared/` and each skill's `references/` by relative path, so it can be copied into any marketplace repository as-is. The only path it expects outside itself is `.agents/precision-engineering.config.md` in the repository being worked on, which `pe-setup` creates.

## Source

This directory is the source of truth for the plugin. `agents/` carries the Cursor frontmatter
(`model`) and explicit procedure links; `skills/` and `shared/` are harness-agnostic. Contribute
here — see [CONTRIBUTING.md](../../CONTRIBUTING.md).

MIT licensed.
