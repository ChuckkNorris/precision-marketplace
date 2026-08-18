---
name: clean-modular-code
description: Writes clean, modular code with a consistent directory structure across frontend and backend languages and tools, and decides how far to generalize so a change extends rather than accumulates. Use whenever authoring new code or refactoring existing code - organizing files, defining module boundaries, placing shared behavior, or scaffolding a feature or project.
---

# Clean Modular Code

Apply these when authoring new code and when refactoring toward the standard. Everything in this file holds across every stack and tier; a rule that *requires* a mechanism, directory, or file kind belonging to one tier belongs in that tier's structure reference. Where tiers differ, a rule here states the invariant and each reference states its tier's form. Each reference is normative for its tier, and the stack's own conventions govern casing and file naming.

## Principles

- **Organize by feature/domain, not by file type.** Colocate everything a feature needs (UI, logic, data access, types, tests) in one directory. Prefer vertical slices over horizontal layers spread across the tree. A unit leaves the slice only where the tier's structure reference says it does; that reference names which units those are, where they go, and what stays.
- **A grouping directory is a location, not a unit.** Where code is gathered for something other than one feature — shared code, or a slice's own shapes grouped by the boundary they cross — every directory directly beneath the gathering point names the one set it holds, and no file sits loose at its root. The unit-naming rule keeps binding inside it: there is no `shared/utils`, and a directory named for a technical kind is not a set.
- **One responsibility per file/module.** Split on reasons to change, not on size — parts that change for different reasons, at different rates, or at the hands of different people belong apart; parts that always change together belong together. If a file needs "and" to describe it, split it.
- **Expose a narrow public surface.** Each module declares what callers may use and keeps everything else unreachable — a re-exporting entry point where the module system has one, accessibility modifiers where it does not. Callers use the declared surface and never reach past it.
- **Depend inward.** Business/domain logic must not import from transport, framework, or I/O layers. Dependencies point toward the domain, not away from it.
- **Separate concerns explicitly.** Keep presentation/transport, business logic, and data access in distinct units so each can change independently.
- **Name for intent, consistently.** Use descriptive names and the casing/suffix conventions idiomatic to the language. Avoid catch-all `utils`/`helpers` dumping grounds - name shared modules by what they do.
- **Name the subject, not just the verb.** A member carries its own meaning at the call site, in a stack trace, in a log line, and in search results - it does not borrow meaning from the enclosing type or file.

  | Prefer | Over |
  |---|---|
  | `CreateEmployeeAsync()` | `CreateAsync()` |
  | `GetEmployeeByIdAsync()` | `GetByIdAsync()` |
  | `findActiveSubscriptions()` | `find()` |
  | `EmployeeNotFound` | `NotFound` |

  Repeating the type's noun in its own member is acceptable redundancy; a member that means nothing on its own is not. The exception is a member that genuinely operates on any type - `IRepository<T>.AddAsync` names only the operation, because naming a subject it does not know would be a lie.
- **Prefer pure, side-effect-free functions.** Isolate I/O and state at the edges. Avoid deep nesting and circular dependencies.
- **Put tests where the stack puts them**, mirroring the structure and the name of the code they cover — colocated in the slice, or in a parallel test tree.

## Designing for the next instance

Before writing a unit, decide what set it belongs to. That decision, not the code, is what makes a change extensible or one-off — and it is answered from this repository and this requirement, never from a remembered pattern.

- **Name the set before writing the member.** State what set the unit belongs to and who else is in it: members that already exist, members the requirement enumerates, members the domain bounds. The answer decides whether this is a one-off or the first of many. Record it with the design so a reviewer can challenge it.
- **Put shared behavior where the set converges.** Behavior belonging to every member goes once at the point every member already passes through, so a member acquires it by existing rather than by remembering to ask. Writing the same thing into a second member means the seam is misplaced — move it before there is a third.
- **Scope each shared unit to one set, and name it for that set.** A unit named only for its position — `BaseEntity`, `CommonService`, `SharedTypes`, `Helpers` — names no set, so nothing can be argued out of it and it accretes whatever the next author had nowhere else to put. `BaseChangeTrackingEntity`, `RetryingHttpClient`, `MoneyFormatting` each state a boundary a reviewer can hold a change against.
- **Split a shared unit the moment one member needs only part of it.** That member is the evidence the unit carries two sets. Inheriting, importing, or being handed the part it does not need is not free — it widens the member's surface, and the unused part gets maintained as though every member depended on it.
- **Compose narrow units rather than widening one.** A member needing two concerns takes both units. Where the language grants only one parent, keep the most widely shared concern there and attach the rest by capability marker — interface, trait, attribute, tag — and have cross-cutting behavior target the marker rather than a list of members, so a new member is picked up by declaring the capability instead of by being registered somewhere.
- **Earn generality with evidence; default to concrete.** Justify an abstraction with members you can point at. Absent them, build the specific thing, but build it liftable: one responsibility, no incidental coupling, named for what it does rather than where it is called. Lifting a clean concrete unit later is cheap; unwinding a wrong abstraction is not.
- **Judge a structure by what the next member costs.** Adding one should mean new files plus a single point of registration. If it means editing branch points scattered across files that already exist, the seam is misplaced. That cost — not file count, not line count — is the measure.
- **Extend the established way rather than adding a second one.** Where the repository already serves this set, extend it, even when a fresh design would be better in isolation. Two ways to do one thing is a defect that compounds. If the existing way cannot carry the requirement, change it in place and migrate its callers, or escalate — never fork it.
- **Make the correct path the default path.** Prefer designs where the ordinary way is the right way and departing from it takes deliberate effort, over designs relying on every future contributor remembering a convention. What must be remembered is eventually forgotten.

## Choosing a structure

Follow one structure end to end rather than mixing two. Each reference states paths in lowercase and language-neutral form; apply the casing and file-naming conventions of the stack.

| Writing | Structure | Reference |
|---|---|---|
| Frontend, mobile | Domain modules | [frontend-domain-module-structure.md](./references/frontend-domain-module-structure.md) |
| Backend, service | Feature modules over a repository boundary | [backend-modular-repository-structure.md](./references/backend-modular-repository-structure.md) |

## Refactoring toward the standard

- Move code in small, behavior-preserving steps; keep tests green between each.
- When a file mixes concerns, extract the odd concern into its own unit first.
- Collapse deep or duplicated paths into the structure the reference above selects.
- After moving code, update every caller to reach the module through its declared surface, and remove what nothing reaches any more.

## Guardrails

Verify after each change. The generality checks apply before committing to a design as well.

- No layer violations: domain/business logic imports nothing from transport, framework, or I/O.
- No circular dependencies between modules.
- Every module declares its public surface, and nothing reaches past it into another module's internals.
- No unit holding behavior is named only for its position — `utils`, `misc`, `common`, `helpers`, or a bare `Base*`. Each names the one set it serves. A grouping directory is a location, not a unit; every directory directly beneath it names one set, and nothing sits loose at its root.
- No member inherits, imports, or is handed part of a shared unit it does not need.
- Every public member reads unambiguously with its enclosing type stripped away. If the name alone does not say what it acts on, it is under-named - unless it is generic over the subject.
- Every generality decision names the set and a second member that exists or is required — or states plainly that this is a one-off.
- Adding the next member of any set introduced here is an addition, not an edit to branch points scattered across existing files.
- Behavior owed to every member is acquired by default, not by each member remembering to ask.
- Nothing here parallels a capability the repository already serves; existing seams were extended.
- Every abstraction traces to a member that exists or a requirement that names one. Delete it and check whether anything gets worse.
- No rule in this file requires a mechanism, directory, or file kind belonging to one tier or stack. Where tiers differ, the rule states the invariant and each reference states its tier's form — naming both forms is what makes a rule neutral, not a breach of this check.
