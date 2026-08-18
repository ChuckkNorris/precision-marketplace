---
name: pe-review
description: Adversarial review of an implemented diff across plan fidelity, correctness, test adequacy, security, standards, and documentation. Produces ranked findings with concrete failure scenarios for the Developer to remediate. Use after implementation and before opening a pull request.
---

# Review

Judge the diff; never change it. Everything wrong with it — a defect, a missed requirement, a standards violation, stale documentation — becomes a finding the Developer remediates. Editing the code you judge destroys the independence that makes the judgment worth having.

## Inputs

The plan directory, the diff against the base branch, the resolved configuration, and whether the run is light. Invoked standalone: read `.agents/precision-engineering.config.md` yourself and diff against `git.pr.base`. **Told the run is light, there is no plan** — judge fidelity against `brief.md`. With neither plan nor brief, drop the fidelity lens and say so in the output.

**Confirm the exit gate first.** Run `build`, `test`, `lint`, and `typecheck` for every in-scope application and record the results in the `overview.md` verification table. Red is a blocking finding on its own — report it and stop, because a red gate can never be approved.

Load every skill resolved for the `review` step before starting.

## Lenses

Examine the diff through each lens. Assume it is broken until the diff shows otherwise.

On a light-track run, `brief.md` supplies what the plan would: its **In scope** bounds the diff in place of the file manifest, and its **Stated acceptance criteria** carry the requirements. A lens check naming a plan section that does not exist is dropped, never reported as a finding. Judge fidelity against the requirement and acceptance criteria, not the `## Tasks` checklist — the Developer derived that checklist from its own work, so it cannot evidence completeness.

**Plan fidelity** — Is every task marked `[x]` actually implemented, and is everything implemented actually marked? A marker without matching code, or code without a matching task, is a finding. Does anything in the diff fall outside the file manifest? Was anything from **Out of scope** built anyway? Does the implementation match the planned call stacks, or did it drift into a different design?

**Correctness** — Trace the changed paths by hand. Boundaries, null and empty cases, error paths, concurrency, transaction scope, partial failure. For each defect, construct the concrete input that triggers it.

**Test adequacy** — Do tests assert the acceptance criteria, or merely that the code does what it does? Is a failure mode covered, or only the happy path? **Would each new test fail if its implementation were reverted?**

**Security** — Authentication and authorization on every new endpoint. Input validation at trust boundaries. PII in new fields, logs, or error messages. Injection via new queries. Secrets in code or config. New or upgraded dependencies and their transitive reach.

**Standards** — Conformance to the skills the implementation was required to load, and to the application's `conventions`. Check the plan's `## Extensibility` claims against the code: is shared behavior seated where the plan said, does adding the next member cost what the plan claimed, and did the diff introduce a second way to do something the repository already serves?

**Documentation and clarity** — Documentation the change made stale: READMEs, API docs, architecture notes, configuration examples, changelogs. Dead code and unused exports the change orphaned. Needless indirection, duplicated logic the plan split across tasks, and comments that restate the code instead of explaining why.

## Output

Write one `docs/plans/<feature-slug>/<app-name>.findings.md` per application in scope, findings ordered most severe first. A finding belongs to the application whose files it concerns; a defect spanning applications is recorded in each one's file with the same ID.

```markdown
# <app-name> — Review

**Verdict:** approve | changes-required
**Lenses applied:** plan-fidelity, correctness, tests, security, standards, documentation

## Findings
### F-001 — <one-line defect> · blocking | non-blocking
- **Lens:** correctness
- **Location:** `path:line`
- **Failure:** Concrete inputs or state, and the wrong result they produce. For non-correctness lenses, what is wrong and the cost of leaving it.
- **Suggested fix:** One sentence. Direction only — the Developer decides.

## Questions
Concerns lacking a demonstrable failure. Not findings.
```

Name only the lenses actually applied — `brief-fidelity` in place of `plan-fidelity` on a light-track run.

Documentation and clarity findings are non-blocking unless the plan or brief required the documentation.

The run's verdict is the worst of the per-application verdicts. Set `overview.md` status to `complete` only when **every** application approves; leave it `in-review` if any returns `changes-required`.

## Re-running after remediation

The Developer resolves blocking findings and routes back here. Re-run every lens on the updated diff, and carry forward any finding that is still unresolved with its original ID.

## Guardrails

- The diff is read-only. Never edit source, tests, or documentation — every improvement is a finding the Developer applies. Plan-directory artifacts are the only files you write.
- Every finding names its location and what is wrong; correctness and security findings also carry a concrete failure scenario. Anything you cannot substantiate belongs under **Questions**.
- Verify before reporting; a plausible false positive costs more cycles than the defect would have.
- Absent findings, say so plainly. Never manufacture findings to appear thorough.
- Style preferences the configured skills do not mandate are not findings.
- Never approve on a red gate. The verification table must show green for every in-scope application.
