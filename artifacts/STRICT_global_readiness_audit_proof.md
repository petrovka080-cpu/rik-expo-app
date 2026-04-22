# STRICT_NULLCHECKS_GLOBAL_READINESS_AUDIT Proof

## Probe result

- Read-only probe command: `npx tsc --noEmit --pretty false --strictNullChecks`
- Strict probe inventory:
  - total strict-null errors: `401`
  - unique files: `93`
  - runtime-file errors: `136`
  - test/script errors: `265`
- Top error codes:
  - `TS2339`: `196`
  - `TS2345`: `80`
  - `TS2322`: `52`
  - `TS18047`: `47`

## Blocker clustering

- Bucket A — safe next strict slices
  - `14` errors across `5` files
  - representative clusters:
    - office invite/access boundary
    - PDF viewer session boundary
    - profile save transport boundary
    - director dashboard callback boundary
- Bucket B — shared blockers but containable
  - `69` errors across `24` files
  - representative clusters:
    - buyer loading/busy boundary
    - foreman draft lifecycle/recovery
    - warehouse action + PDF regression boundary
    - contractor search/progress boundary
- Bucket C — cross-domain blast radius
  - `17` errors across `7` files
  - representative clusters:
    - AI quick-search contract drift
    - shared buyer/director API null-contract drift
- Bucket D — requires global readiness plan
  - `262` errors across `38` files plus root compile-surface coupling
  - representative clusters:
    - offline queue core lifecycle
    - verification/runtime scripts observability cluster
    - root strict compile surface mixing runtime, tests, and scripts

## Blast-radius assessment

- The repo still has a few honest narrow candidates.
- Those candidates are not the dominant remaining risk.
- The dominant residual blast radius now sits in:
  - shared offline lifecycle code
  - verification/runtime scripts included in the root compile surface
  - domain-wide state/recovery clusters that would each need their own program-level plan
- This means another Phase 9 done purely “by inertia” would create local progress, but it would not materially reduce the main blocker for eventual global strict readiness.

## Readiness verdict

```text
Дальше узкие фазы дают мало пользы; нужен GLOBAL STRICT READINESS PLAN
```

Reason:

- Bucket A contains only `14` errors across `5` files, so a few safe micro-slices still exist.
- Bucket D alone contains `262` errors across `38` files, and those blockers are structurally shared.
- The root compile surface currently includes runtime code, tests, and scripts together, so a future global strict flip is blocked by configuration coupling as much as by app code.
- The highest-risk runtime cluster is now `src/lib/offline/*`, which is not an acceptable narrow next slice without a dedicated readiness plan.

## Recommended next order

1. `STRICT_NULLCHECKS_GLOBAL_READINESS_PLAN`
2. Inside that plan, split or stage the root strict surface so runtime, tests, and verification scripts are no longer treated as one undifferentiated global flip
3. Prepare a dedicated offline-core strict program for `src/lib/offline/mutationQueue.ts` and `src/lib/offline/contractorProgressQueue.ts`
4. Prepare a dedicated foreman draft lifecycle/recovery program
5. If one more local strict win is still desired before the global plan starts, take the office-hub or PDF-viewer bucket-A slice, not a new shared cluster

## Runtime semantics

- Runtime semantics changed: `false`
- Code paths changed: none
- This wave is audit-only and proof-only

## Gates

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS (`440` passed suites, `1` skipped, `2746` passed tests)
- `npm test`: PASS (`440` passed suites, `1` skipped, `2746` passed tests)
- `git diff --check`: PASS

## Release tail

- OTA status: `skip`
- Reason: audit/artifacts-only wave, no runtime JS/TS or SQL behavior changes
