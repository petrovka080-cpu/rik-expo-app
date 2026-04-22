# STRICT_NULLCHECKS_PHASE_8 Notes

## Shortlist probe

- Candidate A: `src/lib/pdf/pdfViewer.route.ts`
  - Domain: PDF viewer route/input contract
  - Entry / owner path: `src/lib/pdf/pdfViewer.route.ts`
  - Real strict-null blockers: none, isolated probe PASS
  - Boundary type: route
  - Blast radius: 1 source file plus focused tests
  - Cross-domain dependencies: none beyond PDF viewer helpers
  - Realistically touched files: 1-2
  - Focused tests: `tests/pdf/pdfViewer.route.test.ts`
  - Process/control value: present, but lower for this wave because there was no live blocker
  - Safe rollout: yes
  - Verdict: safe, but lower value
- Candidate B: `src/screens/foreman/foreman.terminalRecovery.ts`
  - Domain: foreman terminal recovery classification
  - Entry / owner path: `src/screens/foreman/foreman.terminalRecovery.ts`
  - Real strict-null blockers pulled by probe:
    - `src/lib/api/buyer.ts(267,68)`
    - `src/lib/api/director.ts(306,5)`
    - `src/lib/pdf/directorSupplierSummary.shared.ts(305,45)`
    - `src/screens/foreman/foreman.localDraft.ts(541,9)` through `(546,9)`
  - Boundary type: recovery
  - Blast radius: foreman recovery plus buyer/director/shared PDF/local draft neighbors
  - Cross-domain dependencies: buyer, director, shared PDF summary, foreman local draft
  - Realistically touched files: at least 5
  - Focused tests: `src/screens/foreman/foreman.terminalRecovery.test.ts`
  - Process/control value: high
  - Safe rollout: no
  - Verdict: blocked by cross-domain deps
- Candidate C: `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - Domain: warehouse screen orchestration
  - Entry / owner path: `src/screens/warehouse/hooks/useWarehouseScreenActions.ts`
  - Real strict-null blockers pulled by probe:
    - `src/screens/warehouse/hooks/useWarehouseScreenActions.ts(87,5)`
    - `src/screens/warehouse/hooks/useWarehouseScreenActions.ts(121,5)`
    - `src/lib/api/canonicalPdfBackendInvoker.ts(168,5)`
  - Boundary type: process
  - Blast radius: warehouse action orchestration plus canonical PDF transport
  - Cross-domain dependencies: shared canonical PDF backend transport and warehouse UI actions
  - Realistically touched files: at least 3-4
  - Focused tests: indirect only
  - Process/control value: high
  - Safe rollout: no
  - Verdict: too wide
- Candidate D: `src/lib/api/canonicalPdfBackendInvoker.ts`
  - Domain: canonical PDF backend transport/process boundary
  - Entry / owner path: `src/lib/api/canonicalPdfBackendInvoker.ts`
  - Real strict-null blocker:
    - `src/lib/api/canonicalPdfBackendInvoker.ts(168,5): Type 'TPayload' is not assignable to Supabase invoke body contract.`
  - Boundary type: transport + process
  - Blast radius: one shared backend invoker, focused tests, wave config, proof artifacts
  - Cross-domain dependencies: foreman and warehouse callers consume the boundary, but no caller changes were required
  - Realistically touched files: 1 source file plus focused tests/config/artifacts
  - Focused tests: `src/lib/api/canonicalPdfBackendInvoker.test.ts`
  - Process/control value: high because it hardens the request contract before native fetch / Supabase invoke transport
  - Safe rollout: yes
  - Verdict: chosen for Phase 8

## Chosen slice

- `src/lib/api/canonicalPdfBackendInvoker.ts`

## Why this slice was chosen

- It exposed a real isolated strict-null blocker with a single local compile failure.
- The slice sits on a transport/process boundary used by canonical PDF backend calls, so boundary-contract quality matters more than simple type cleanup.
- Current callers already normalize object payloads upstream, which let the wave tighten the boundary without changing valid runtime behavior.
- Focused tests already covered native/web success and auth-retry paths, so regression proof stayed narrow and strong.

## How this slice improves process control

- It replaces an unconstrained generic payload with an explicit object-only transport contract.
- It distinguishes `missing`, `invalid`, and `ready` payload states, including `ready` empty-object versus `missing`.
- It rejects malformed payloads before transport instead of letting them drift into Supabase/fetch body handling.
- It replaces silent `catch {}` branches in this slice with explicit diagnostics while preserving existing fallback outcomes.

## Real nullable and contract blockers

- `supabase.functions.invoke(..., { body: args.payload })` failed under strict-null because the generic payload type was wider than the transport body contract.
- The slice had no explicit boundary contract for `null`, `undefined`, primitive, or array payloads.
- The slice still contained legacy `catch {}` fallbacks, which weakened process visibility inside the chosen scope.

## Exact fix

- Added explicit payload contract exports inside the chosen slice:
  - `CanonicalPdfInvokePayload`
  - `CanonicalPdfInvokePayloadContract`
  - `resolveCanonicalPdfInvokePayloadContract(...)`
  - `normalizeCanonicalPdfInvokePayload(...)`
- Narrowed the public invoker args from an unconstrained generic payload to an explicit `Record<string, unknown>` transport contract.
- Added deterministic preflight normalization through `normalizeCanonicalPdfInvokeArgs(...)`.
- Replaced legacy `catch {}` branches in the chosen slice with explicit `catch (error)` diagnostics.
- Added focused phase-8 tests:
  - `tests/strict-null/canonicalPdfBackendInvoker.phase8.test.ts`
- Tightened existing regression assertions in:
  - `src/lib/api/canonicalPdfBackendInvoker.test.ts`

## What stayed out of scope

- no global `strictNullChecks`
- no caller refactors in foreman or warehouse services
- no SQL/RPC semantics changes
- no release tooling changes
- no warehouse orchestration rollout
- no foreman recovery rollout
- no additional helper source modules beyond the chosen slice

## Scaling and governance note

- The wave briefly considered a separate `*.contract.ts` helper inside the slice, but the repo performance-budget gate counts source modules aggressively.
- The final implementation kept the contract inside the chosen invoker file to preserve the same hardening value without increasing source-module surface.
