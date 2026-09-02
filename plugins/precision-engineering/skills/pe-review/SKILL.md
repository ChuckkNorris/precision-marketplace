---
name: pe-review
description: Adversarial review of an implemented diff across plan fidelity, correctness, test adequacy, security, standards, and documentation. Produces ranked findings with concrete failure scenarios for the Developer to remediate. Use after implementation and before opening a pull request.
---

# Review

Judge the diff; never change it. Everything wrong with it — a defect, a missed requirement, a standards violation, stale documentation — becomes a finding the Developer remediates. Editing the code you judge destroys the independence that makes the judgment worth having.

## Inputs

The plan directory, the commit under review, and **one** application in scope — one Reviewer per application, all running concurrently. Read `.agents/precision-engineering.config.md` against [configuration-schema.md](../../shared/configuration-schema.md) for that application's commands, conventions, and skills. Invoked standalone: diff against `git.pr.base`, and review every application the diff touches, one findings file each.

**Invoked standalone with no plan directory**, drop the plan-fidelity lens and say so in the output. Every other lens applies unchanged.

Load every skill resolved for the `review` step and for your application before starting.

### Gate evidence

The exit gate is already run and recorded. Read your application's rows in the `overview.md` verification table:

| Table state | Do |
|---|---|
| Green, every commit at `HEAD` | That is the gate. Proceed to the lenses. |
| Missing or red | Raise a blocking finding and stop. |
| Stale — the orchestrator named rows behind `HEAD` | Re-run those rows yourself and **return** the confirming commit for it to record. Red on a re-run is a blocking finding. |
| Invoked standalone | Run the gate yourself and record it. |

Running the gate at all — re-running named rows, or invoked standalone — means bringing up a stack: `runtime.up`, then `commands.migrate` for each application your commands need that declares one, then `runtime.down` when finished. Under `parallel` your slot's allocation is recorded in `run-context.md`; use it rather than the defaults, which a Developer, another Reviewer, or the user may still hold. Running it is evidence, not a change to the diff.

## Lenses

Examine the diff through every lens. Assume it is broken until the diff shows otherwise.

The lenses interact — a test gap that is really a defect, a standards violation that opens a hole, fidelity drift that explains a bug. Report each root cause once, under the lens that best explains it, rather than the same fault once per lens that can see it.

**Plan fidelity** — Is every task marked `[x]` actually implemented, and is everything implemented actually marked? A marker without matching code, or code without a matching task, is a finding. Was anything from **Out of scope** built anyway? Does the implementation match the planned call stacks, or did it drift into a different design? Does the code honor every `overview.md` **Interface contract** entry your application produces or consumes, verbatim — the other application was built against that contract and cannot see your code, so any deviation is blocking.

**Correctness** — Trace the changed paths by hand. Boundaries, null and empty cases, error paths, concurrency, transaction scope, partial failure. For each defect, construct the concrete input that triggers it.

**Test adequacy** — Do tests assert the acceptance criteria, or merely that the code does what it does? Is a failure mode covered, or only the happy path? **Would each new test fail if its implementation were reverted?**

**Security** — Authentication and authorization on every new endpoint. Input validation at trust boundaries. PII in new fields, logs, or error messages. Injection via new queries. Secrets in code or config. New or upgraded dependencies and their transitive reach.

**Standards** — Conformance to the skills the implementation was required to load, and to the application's `conventions`. Check the plan's `## Extensibility` claims against the code: is shared behavior seated where the plan said, does adding the next member cost what the plan claimed, and did the diff introduce a second way to do something the repository already serves?

**Documentation and clarity** — Documentation the change made stale: READMEs, API docs, architecture notes, configuration examples, changelogs. Dead code and unused exports the change orphaned. Needless indirection, duplicated logic the plan split across tasks, and comments that restate the code instead of explaining why.

## Output

Write `docs/plans/<feature-slug>/<app-name>.findings.md` for your application, findings ordered most severe first. A defect at an interface your application shares with another is recorded here against the **Interface contract** entry it violates; the orchestrator routes it to the other application.

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

Documentation and clarity findings are non-blocking unless the plan required the documentation. Finding IDs are unique within your file; a reference reaching another application names it — `api F-003` — since every Reviewer numbers its own findings concurrently.

Report your application's verdict. The orchestrator reconciles the run verdict across applications and sets `overview.md` status.

## Re-running after remediation

The Developer resolves blocking findings and routes back. Judge the **remediation range** the orchestrator names — your previously reviewed commit to `HEAD` — not the whole branch again:

- Every finding you carried forward, against its location, keeping its original ID.
- Every file the remediation changed, through every lens.

A remediation reaching files outside both sets means the Developer worked beyond the findings. That is a fidelity finding, and the one case that earns a full re-run across the branch diff.

## Guardrails

- The diff is read-only. Never edit source, tests, or documentation — every improvement is a finding the Developer applies.
- Your application's findings file is the only file you write. Rows you re-ran are returned for the orchestrator to record; invoked standalone, with no orchestrator, you record them yourself.
- Never approve on unproven green — a verification table absent, red, or stale against `HEAD` is a blocking finding.
- Every finding names its location and what is wrong; correctness and security findings also carry a concrete failure scenario. Anything you cannot substantiate belongs under **Questions**.
- Verify before reporting; a plausible false positive costs more cycles than the defect would have.
- Absent findings, say so plainly. Never manufacture findings to appear thorough.
- Style preferences the configured skills do not mandate are not findings.
