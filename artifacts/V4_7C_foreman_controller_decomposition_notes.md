# V4-7C Foreman Controller Decomposition Notes

Wave: V4-7C FOREMAN_CONTROLLER_DECOMPOSITION_PHASE_3

## Selected Concern

Selected concern: FIO/bootstrap coordination.

This seam was chosen because the controller had a cohesive cluster for:

- loading auth identity for Foreman display/PDF metadata;
- loading persisted Foreman FIO and FIO confirmation state;
- refreshing Foreman name history;
- persisting confirmed FIO;
- finalizing Foreman name history after submit.

The extraction avoids `useForemanDraftBoundary.ts`, draft submit internals, validation, SQL/RPC, navigation semantics, and Maestro YAML.

## Implementation

New focused hook file:

- `src/screens/foreman/hooks/useForemanFioBootstrapFlow.ts`

Controller remains the orchestrator:

- `src/screens/foreman/useForemanScreenController.ts`

Narrow governance test update:

- `tests/perf/performance-budget.test.ts`

The performance budget update records the one permanent V4-7C source module, matching the existing V4-7B budget pattern.

## Safety Notes

- Public controller return shape preserved: YES
- Callback names preserved: YES
- Draft behavior changed: NO
- Submit behavior changed: NO
- Validation changed: NO
- Navigation semantics changed: NO
- Zustand store contracts changed: NO
- SQL/RPC changed: NO
- Runtime config changed: NO
- Maestro YAML changed: NO
- OTA published inside wave: NO

## Line Count

- Controller before: 948
- Controller after: 866
- Reduction: 82

The reduction is below the requested 150-300 guideline because the safe V4-7C seam was intentionally kept narrow. Expanding into draft boundary, validation, or another UI concern would have violated the one-concern rule.
