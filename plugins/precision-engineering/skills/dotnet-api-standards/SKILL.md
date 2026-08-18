---
name: dotnet-api-standards
description: Standard enterprise development patterns for .NET APIs. Use when planning or implementing any .NET API changes
---

# Dotnet API Standards

## Generating API
- Always use `dotnet` CLI to generate new projects before modifying them.

## Project Structure

| Holds | Path |
|---|---|
| Feature module — controller, service, repository, their interfaces, mappers, result types | `<Module>/` |
| Request and response models | `<Module>/Models/Contracts/` |
| DTOs crossing an internal boundary | `<Module>/Models/Dtos/` |
| `DbContext` | `Shared/Data/` |
| Entities | `Shared/Data/Entities/` |
| `IEntityTypeConfiguration<T>` | `Shared/Data/Configurations/` |
| Migrations and the model snapshot | `Shared/Data/Migrations/` |
| A persistence concern — base entity, marker interface, interceptor | `Shared/Data/<Concern>/` |
| Extension methods configuring the host or a third-party library | `Shared/Application/Extensions/` |
| Lifetime attributes and the registration scan | `Shared/Application/ServiceRegistration/` |
| `IExceptionHandler` and host middleware | `Shared/Application/Middleware/` |
| Custom exception types | `Shared/Exceptions/` |
| A set more than one module uses, named for the set | `Shared/<Set>/` |

Namespaces are file-scoped and match the folder path. A directory is created when its first file exists, never in advance.

## Standard Libraries
- Mapster - Use for all data mapping. Which Mapster mechanism depends on the direction - see **Data Mapping**
- EF Core - Use as ORM for database access. Entity and schema configuration: [ef-core.md](./references/ef-core.md)
- Scalar for API - Use for Open API UI and API documentation

## Endpoint Design
- Always return objects from endpoints, never primitives or arrays directly.
  - e.g. return `{ "value": 42 }` instead of `42`, and `{ "values": [1, 2, 3] }` instead of `[1, 2, 3]`
- Omit the `Async` suffix on controller action methods - `GetEmployeeById()`, not `GetEmployeeByIdAsync()`. ASP.NET Core strips `Async` from the action name, so the suffix makes the method name disagree with what `nameof` produces and with the name used for routing. Every other async member keeps the suffix.

## Data Mapping

Mappings live in dedicated mapper files, never inline in a controller or service. Which mechanism to use is fixed by the direction, because they are not interchangeable:

| Direction | Mechanism |
|---|---|
| Request model → entity | Mapster source generator (`Mapster.Tool`), generated at development time and committed |
| Entity → DTO, on a read | In-query projection, `ProjectToType<TDto>(config)`, over a runtime `TypeAdapterConfig` registration |
| DTO → response, and any other in-memory hop | Runtime `TypeAdapterConfig` registration |

- **The generator for the entity direction**, because it emits a plain object initializer rather than an expression tree: the C# `required` modifier is compiler-enforced against it, a new required member fails the build until the mapper is regenerated, and the call site needs no configuration.
- **Projection for reads**, because EF Core translates it to SQL: the database returns only the columns the DTO declares, and no entity is materialized. A generator cannot emit this, so neither mechanism replaces the other.
- **Never a config-less `Adapt<T>()` or `ProjectToType<T>()`.** Both resolve against static `TypeAdapterConfig.GlobalSettings`; since Mapster also matches by convention, they appear to work while bypassing every registration. Pass the per-host config explicitly.

## Model Configuration
Declare configuration with data attributes. Reach for a fluent or programmatic API only for what no attribute can express.

- **Request models** - validate with data attributes, e.g. `[Required]`, `[MaxLength(6)]`, `[Range]`, `[EmailAddress]`. Model state validation is the entry gate; never hand-roll equivalent checks in a controller or service.
- **Entities** - declare schema with data attributes. Attribute reference, Fluent API exceptions, and guardrails: [ef-core.md](./references/ef-core.md)

## Service Registration

Services declare their own lifetime with an attribute and are registered by one reflection pass at the composition root. A registration an attribute cannot express goes in its own static extension method instead. Attributes, the scan, and what stays out of it: [service-registration.md](./references/service-registration.md)

## Guardrails
- No mapping expression appears in a controller or service.
- Every request-to-entity map is a generated mapper call; every read is a projection; neither is hand-written.
- No `Adapt<T>()` or `ProjectToType<T>()` call omits its `TypeAdapterConfig`.
- No endpoint returns a bare primitive or array.
- No validation logic duplicates a data attribute already on the request model.
- Every file of a kind `## Project Structure` names sits at the path it names.
- Every namespace matches its folder path.
- Every first-party service registered by interface-to-implementation mapping carries a lifetime attribute rather than an explicit `AddScoped`, `AddSingleton`, or `AddTransient` call.
- The composition root contains no registration body — only calls to extension methods.
