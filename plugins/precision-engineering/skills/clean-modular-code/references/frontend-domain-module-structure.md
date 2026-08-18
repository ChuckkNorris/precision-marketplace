# Frontend Domain Module Structure

Conventions for a frontend or mobile application: one module per domain, each declaring its own public surface. Covers this tier's directory structure, its module surface, and where its tests go. Referenced by [clean-modular-code](../SKILL.md).

Paths are lowercase and language-neutral. Apply the casing and file-naming conventions of the stack.

```
src/
  modules/
    <domain>/
      components/          # view components — the presentation boundary
      hooks/               # domain-scoped state and logic
      api/                 # data fetching for this domain — the I/O boundary
      <domain>.types.*
      <domain>.test.*      # colocated, named for the code it covers
      index.*              # public surface of the domain
  shared/
    ui/                    # reusable presentational components
    hooks/
  app/                     # entry, routing, providers, global config
```

## Placement

| Rule |
|---|
| A domain module declares its surface with a re-exporting entry point — this tier's module system has one, so it is used. Import from that entry point, never from another domain's internals. |
| The boundaries inside a domain module are presentation (`components/`), state and logic (`hooks/`), and I/O (`api/`). A directory named for a language construct — `types/`, `interfaces/`, `enums/` — is a kind, not a boundary, and does not belong. |
| `shared/` is a grouping directory: every directory directly beneath it names the one set it holds, and no file sits loose at its root. The unit-naming rule keeps binding inside it — there is no `shared/utils`. |
| A component, hook, or fetcher used by one domain lives in that domain, not in `shared/`. It moves to `shared/` when a second domain needs it. |
| Tests are colocated with the code they cover, named for it. |
| A directory named here is created when its first file exists, never in advance. |

## Guardrails

- Every domain module has one entry point, and nothing imports another domain's internals.
- No directory inside a domain module is named for a language construct rather than for one of the module's boundaries.
- No directory under `shared/` is named for its position rather than for the set it holds.
- No file sits loose at the root of `shared/`.
- No directory named by this reference exists without a file in it.
