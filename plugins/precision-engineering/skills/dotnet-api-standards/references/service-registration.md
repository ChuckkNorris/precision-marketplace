# Service Registration Standards

Lifetime attributes, the registration scan, and what stays out of it. Referenced by [dotnet-api-standards](../SKILL.md).

A service declares its own lifetime. The composition root calls one method per concern and holds no registration body.

## The attributes

One abstract base carrying the service type and the lifetime, and one concrete attribute per lifetime. One type per file.

```csharp
[AttributeUsage(AttributeTargets.Class, Inherited = false, AllowMultiple = false)]
public abstract class ServiceLifetimeAttribute(Type serviceType, ServiceLifetime lifetime) : Attribute
{
    public Type ServiceType { get; } = serviceType;

    public ServiceLifetime Lifetime { get; } = lifetime;
}

public sealed class ScopedAttribute(Type serviceType)
    : ServiceLifetimeAttribute(serviceType, ServiceLifetime.Scoped);
```

`SingletonAttribute` and `TransientAttribute` are the same shape. The framework defines three lifetimes, so the set is closed — write all three, and a fourth cannot arrive.

A base rather than three unrelated attributes, so the scan makes one `GetCustomAttribute<ServiceLifetimeAttribute>` call and a new lifetime would be a new file rather than an edit to the scan.

Each default is the narrow one. Widen one only when a member needs it, not in anticipation:

| Default | Why it is the narrow one |
|---|---|
| `AllowMultiple = false` | Registering one class as two service types is a second requirement; adding it later is one attribute argument. |
| `Inherited = false` | A base carrying a lifetime would register every derived type silently. |
| Service type required | Self-registration by concrete type is a different registration, and the ones that need it are usually `TryAdd` calls inside an extension method anyway. |

Applied to the implementation, never to the interface:

```csharp
[Scoped(typeof(IEmployeeService))]
public sealed class EmployeeService(IEmployeeRepository repository) : IEmployeeService
```

## The registration pass

```csharp
public static IServiceCollection AddApplicationServices(this IServiceCollection services) =>
    services.AddApplicationServices(typeof(ApplicationServicesExtensions).Assembly);
```

| Rule | Behavior |
|---|---|
| Assembly | The application assembly, named by a type in it. Never `AppDomain.CurrentDomain.GetAssemblies()`, which depends on load order and under `WebApplicationFactory` reaches into the test assembly. |
| Eligible type | A non-abstract, non-generic-definition class carrying the attribute. Everything else is skipped silently — that is the overwhelming majority of types. |
| Mismatch | A decorated class not implementing the service type it names throws `InvalidOperationException` naming both types, during registration and before `Build()` returns. |
| Two lifetime attributes | A class carrying two *different* lifetime attributes throws `InvalidOperationException` naming the class and every attribute found. `AllowMultiple = false` does not prevent this — it is checked per attribute class, so one of each compiles. |
| Registration | `services.Add(new ServiceDescriptor(serviceType, implementationType, lifetime))`. Plain `Add`, because the composition root calls the pass exactly once. |
| Return | `IServiceCollection`, for chaining. |

Failing loudly on a mismatch is the point: registering a descriptor nothing can satisfy defers the fault to the first request that resolves it, turning a startup crash into a production 500.

Ask for the attribute with `inherit: false`. `AttributeUsage(Inherited = false)` on the abstract base does not govern the concrete attributes at runtime — the runtime resolves a concrete attribute's usage without walking that attribute's own base chain, so it falls back to inherited and a subclass of a decorated class registers a second descriptor.

An `internal` overload taking an `Assembly` is worth having only where a test scans its own fixtures. It has a caller or it does not exist.

## What stays out

An attribute names a service type and a lifetime. Anything a registration needs beyond those two facts goes in its own static `Add<Unit>` extension method, living with the unit it configures, called once from the composition root.

| Registration | Why no attribute expresses it |
|---|---|
| Parameterized | Takes an argument the composition root supplies, such as a provider or an options callback. |
| Instance | Registers a constructed object rather than a type to activate. |
| External | The implementation type belongs to a third-party library. |
| `TryAdd` whose method a second host calls | The test host calls the same method again to substitute a dependency, and a plain `Add` would double-register. |
| Attaching to framework options | Attaches to an options builder rather than to the container — EF Core interceptors are the common case, and registering one as an interface compiles and silently does nothing. |

## Guardrails

- Every first-party service registered by interface-to-implementation mapping carries a lifetime attribute rather than an explicit `AddScoped`, `AddSingleton`, or `AddTransient` call.
- No lifetime attribute names a type its target does not implement, and no class carries more than one.
- The registration pass names exactly one assembly.
- Every registration the composition root makes is one call, not a block.
- Every extension method this codebase declares for the composition root returns `IServiceCollection`.
