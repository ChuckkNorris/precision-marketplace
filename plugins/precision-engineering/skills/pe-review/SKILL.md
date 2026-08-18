---
name: pe-review
description: Adversarial review of an implemented diff across plan fidelity, correctness, test adequacy, security, standards, and documentation. Produces ranked findings with concrete failure scenarios for the Developer to remediate. Use after implementation and before opening a pull request.
---

# Review

Judge the diff; never change it. Everything wrong with it — a defect, a missed requirement, a standards violation, stale documentation — becomes a finding the Developer remediates. Editing the code you judge destroys the independence that makes the judgment worth having.

## Inputs

The plan directory, the diff against the base branch, and the resolved configuration. One Reviewer covers the whole run — every application in scope, every lens — so cross-application defects surface. Invoked standalone: read `.agents/precision-engineering.config.md` yourself and diff against `git.pr.base`.

**Invoked standalone with no plan directory**, drop the plan-fidelity lens and say so in the output. Every other lens applies unchanged.

Load every skill resolved for the `review` step before starting.

### Gate evidence

The exit gate is already run and recorded. Read the `overview.md` verification table:

| Table state | Do |
|---|---|
| Green, every commit at `HEAD` | That is the gate. Proceed to the lenses. |
| Missing, red, or a commit behind `HEAD` | Raise a blocking finding and stop. |
| Invoked standalone | Run the gate yourself for every in-scope application and record it. |

## Lenses

Examine the diff through every lens. Assume it is broken until the diff shows otherwise.

The lenses interact — a test gap that is really a defect, a standards violation that opens a hole, fidelity drift that explains a bug. Report each root cause once, under the lens that best explains it, rather than the same fault once per lens that can see it.

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
**Reviewed commit:** <short SHA the diff was judged at>

## Findings
### F-001 — <one-line defect> · blocking | non-blocking
- **Lens:** correctness
- **Location:** `path:line`
- **Failure:** Concrete inputs or state, and the wrong result they produce. For non-correctness lenses, what is wrong and the cost of leaving it.
- **Suggested fix:** One sentence. Direction only — the Developer decides.

## Questions
Concerns lacking a demonstrable failure. Not findings.
```

Documentation and clarity findings are non-blocking unless the plan required the documentation.

Report the run verdict — the worst across applications. The orchestrator sets `overview.md` status.

## Re-running after remediation

The Developer resolves blocking findings and routes back. Judge the **remediation range** the orchestrator names — your previously reviewed commit to `HEAD` — not the whole branch again:

- Every finding you carried forward, against its location, keeping its original ID.
- Every file the remediation changed, through every lens.

A remediation reaching files outside both sets means the Developer worked beyond the findings. That is a fidelity finding, and the one case that earns a full re-run across the branch diff.

## Guardrails

- The diff is read-only. Never edit source, tests, or documentation — every improvement is a finding the Developer applies.
- The findings files are the only files you write — except invoked standalone, where you also record the gate evidence you ran.
- Never approve on unproven green — a verification table absent, red, or stale against `HEAD` is a blocking finding.
- Every finding names its location and what is wrong; correctness and security findings also carry a concrete failure scenario. Anything you cannot substantiate belongs under **Questions**.
- Verify before reporting; a plausible false positive costs more cycles than the defect would have.
- Absent findings, say so plainly. Never manufacture findings to appear thorough.
- Style preferences the configured skills do not mandate are not findings.
