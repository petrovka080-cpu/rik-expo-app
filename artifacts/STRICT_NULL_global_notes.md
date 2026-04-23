# STRICT_NULLCHECKS_GLOBAL_FINAL Notes

## Scope

This wave enabled global `strictNullChecks: true` in the root `tsconfig.json` and closed the resulting nullability errors without changing SQL, RPC, auth, role, offline, PDF, or routing semantics.

The work stayed inside null-safety scope:

- explicit guards where `null` or `undefined` is a valid runtime state
- local invariants where a test or runtime contract must have captured a value
- honest optional propagation for nullable RPC args and UI rows
- test/runtime harness typing fixes for callback refs and mocks
- narrow SDK boundary typing for Supabase function payloads and Node process handles

## Forbidden Fixes

No new unsafe-any casts or TypeScript suppression comments were added. The diff was audited directly with the repository suppression scan; the exact forbidden token regex is intentionally not embedded here so this proof artifact does not itself create a false-positive match.

Result: no matches.

No broad business rewrites were done. Existing runtime branches remain the same except for controlled guards where strict nullability exposed a previously unchecked absent value.

## Error Groups

Initial strict pass produced 383 TypeScript errors. The recurring groups were:

- Category A, safe guard missing: nullable lookups, optional `scrollToOffset`, missing warehouse `rik_code`, optional list callbacks, queue entry update callbacks.
- Category B, invariant required: captured Promise resolvers in tests, in-flight draft sync promise, initialized controller/hook harness values, runtime verifier active users.
- Category C, optional field propagation: nullable RPC args, local draft header fields, supplier summary rows, role tag labels, optional PDF/source inputs.
- Category D, test-only typing: callback refs, render harness captures, global/window cleanup, mocked runtime APIs, route-param and PDF boundary regression tests.
- Category E, external SDK gap: Supabase function invoke body, realtime event records, Node child process handle typing, Playwright text content and Android harness route targets.

## Fix Style

Safe guards were used when absence is normal and should produce an existing controlled branch or no-op. Invariants were used only where the test/runtime setup explicitly requires a value to have been captured. Optional propagation was preferred where RPC or UI data can legitimately be `null`. Test fixes used ref objects and local getters instead of non-null assertions.

The Android PDF runtime verifier route strings were updated from stale role-root deep links to the current office child routes so the smoke targets the live app routes:

```text
rik:///office/foreman
rik:///office/warehouse
```

The warehouse Android PDF proof detector was narrowed from a generic date match to report-specific markers (`warehouse-report-day:` / `documents:`). This keeps the proof from treating the ordinary incoming list as the reports day list. The fallback horizontal tab swipe was moved onto the actual tab strip height. Both changes are proof-script-only and do not alter production runtime behavior.

## PDF Runtime Proof Tail

The remaining Android PDF blocker was isolated from strict nullability. The app route/runtime layer was alive, but the proof chain was stale in two places:

- The proof seed created role users without `company_members`, while the current foreman/warehouse PDF backends require company membership before issuing signed URLs.
- The Android proof expected older backend boundary tokens (`payload_ready`, `backend_invoke_success`, `signed_url_received`) as terminal evidence, while the current Android terminal path is observable through the viewer route, native handoff start, signed storage URL, and `com.google.android.apps.docs/com.google.android.apps.viewer.PdfViewerActivity`.

The fix stayed in `scripts/foreman_warehouse_pdf_android_runtime_verify.ts`: seed temp company membership for proof users, read the actual top activity instead of stale widget-picker lines, and accept the current Android PDF success evidence chain. No PDF production logic, SQL/RPC semantics, routing semantics, or viewer business behavior were changed.
