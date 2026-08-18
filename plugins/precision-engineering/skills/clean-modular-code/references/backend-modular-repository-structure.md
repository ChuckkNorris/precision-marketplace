# Backend Modular Repository Structure

Conventions for a backend or service: feature modules over a repository boundary, with the persistence model seated once. Covers this tier's directory structure, its module surface, and where its tests go. Referenced by [clean-modular-code](../SKILL.md).

Paths are lowercase and language-neutral. Apply the casing and file-naming conventions of the stack.

```
<root>/
  <module>/                       one per feature/domain
    <module>Controller.*          transport, thin
    <module>Service.*             business logic
    <module>Repository.*          data access; entity in, DTO out
    <module>Module.*              the module's registration surface, only if it needs one
    <module>Test.*                in the slice, or mirrored in a parallel test tree
    models/
      contracts/                  request and response shapes — the transport boundary
      dtos/                       shapes crossing an internal boundary
  shared/
    data/
      <context>.*                 the database context, at the root
      entities/                   persisted entities
      configurations/             per-entity schema configuration
      migrations/                 generated migrations and the model snapshot
      <concern>/                  a persistence concern and everything serving it
    application/                  global host configuration, wired into the entry point
      extensions/                 extension methods configuring the host or a third-party library
      serviceregistration/        the lifetime markers and the scan that reads them
      middleware/
    exceptions/                   custom exception types
    <set>/                        a set more than one module uses, named for the set
  main.*                          bootstrap; composition only
```

## Placement

| Rule |
|---|
| The persistence model leaves the slice: entities, their schema configuration, and the migration set. All three belong to the one context that assembles them, so the set converges there by construction. **No other unit leaves on this ground** — the controller, service, repository, their interfaces, mappers, and the module's own result types stay in the slice. |
| The context sits at the root of `shared/data/`. |
| The boundaries inside a slice are transport (`models/contracts/`) and internal (`models/dtos/`). Never a technical kind — no `enums/`, no `interfaces/`. |
| `<module>/models/` is a grouping directory: every directory directly beneath it names the boundary it holds, and no file sits loose at its root. |
| An abstract base carrying a persistence concern stays with that concern's directory, not under `entities/`. `entities/` holds mapped entities. |
| An extension method lives with the unit it configures. `shared/application/extensions/` holds those configuring the host or a third-party library that belong to no other unit. |
| Registration is by capability marker, discovered once at the composition root. Anything a marker cannot express gets its own extension method, called from the entry point. |
| The lifetime markers and the scan that reads them sit together under `shared/application/serviceregistration/`. A marker two directories from the only code that looks for it is a marker nobody finds. |
| A backend module has no re-exporting entry point. Its declared surface is what its accessibility modifiers expose; `<module>Module.*` is a registration surface, not a re-export, and exists only if the module needs one. |
| A unit more than one module uses moves to its own directory under `shared/`, named for the set it serves — `money/`, not `helpers/`. It stays in the slice until a second module needs it: one caller is not a set. |
| Tests mirror the source tree and the source name, in the slice or in a parallel test project — whichever the stack's test tooling expects. |
| A directory named here is created when its first file exists, never in advance. |

## Guardrails

- No entity type is declared outside `shared/data/entities/`.
- No file sits loose at the root of `shared/`.
- No shape sits loose at the root of `<module>/models/`, and no directory beneath it is named for a technical kind.
- No shape appears under both `contracts/` and `dtos/`.
- The lifetime markers and the scan that reads them sit in one directory.
- Nothing outside a module names a member its accessibility modifiers do not expose.
- The entry point contains composition only — one call per concern, no registration body.
- No directory named by this reference exists without a file in it.
