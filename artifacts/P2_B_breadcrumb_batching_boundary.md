# P2-B Office Reentry Breadcrumb Batching Boundary

## Scope

- Changed only `src/lib/navigation/officeReentryBreadcrumbs.ts`.
- Added focused coverage in `tests/navigation/officeReentryBreadcrumbs.test.ts`.
- Left Office routing, UI, access logic, realtime, and business behavior unchanged.

## Previous Path

Office reentry markers were already queued, but the queue flushed once per same-tick microtask. Long Office child-route sessions could still create a dense stream of AsyncStorage writes across adjacent ticks, adding bridge pressure and observability noise during route teardown.

## New Boundary

Breadcrumbs now use one permanent batching policy:

- flush at 5 pending breadcrumbs;
- flush after 2 seconds;
- final flush when the app leaves active state;
- final flush for route-exit markers ending with `_blur`, `_before_remove`, or `_unmount`;
- preserve event order inside each batch;
- keep writes serialized through the existing `writeQueue`.

`flushOfficeReentryBreadcrumbWrites()` is the single explicit drain point for tests, diagnostics reads, async breadcrumb calls, and final flush paths.

## Failure Contract

- Breadcrumb persistence remains non-critical and must not destabilize navigation.
- A failed AsyncStorage write is contained by the existing write guards.
- The next batch remains writable after a failed flush attempt.
- AppState listeners are installed only while a batch is pending and are removed after the batch drains.

## Not Changed

- Office route semantics.
- Child-route back behavior.
- Office access or role-section logic.
- Observability event names and payload semantics.
- Storage key and retained breadcrumb limit.
