# STRICT_NULLCHECKS_NEXT_EXECUTION_WAVE Proof

## Before Blockers

- `src/screens/profile/profile.services.ts(385)`:
  - `market_listings.insert(...)` rejected `kind: ListingKind | "mixed" | null`
  - the write boundary could not distinguish `missing` from a valid ready value

## After Blockers

- `src/screens/profile/profile.services.ts` now exposes a local transport contract:
  - `resolveMarketListingKindContract`
  - `normalizeListingCartItemKind`
- The insert payload now behaves deterministically:
  - `missing` -> omit `kind`
  - `ready` -> write the explicit or mixed kind
  - `invalid` -> reject malformed explicit kind before the DB write

## Compile Proof

- `npx tsc --project tsconfig.strict-null-next-profile-listing.json --pretty false` - PASS
- `npx tsc --noEmit --pretty false` - PASS

## Regression Proof

- Focused profile boundary tests:
  - `npx jest src/screens/profile/profile.services.test.ts --runInBand` - PASS
- Focused budget guard:
  - `npx jest tests/perf/performance-budget.test.ts --runInBand` - PASS
- Full serial suite:
  - `npm test -- --runInBand` - PASS
- Full default suite:
  - `npm test` - PASS

## Unchanged Runtime Semantics

- Valid explicit listing kinds still win over older cart item kinds.
- Mixed cart kinds still resolve to `mixed` when no explicit kind is set.
- The missing-kind path still succeeds; it now omits the nullable `kind` field instead of leaking `null` into the insert payload.
- No business logic, permissions, role behavior, network semantics, or success-path output changed for valid input.

## Full Gates

- `npx expo lint` - PASS
- `git diff --check` - PASS

## Release Rule

- Runtime TS changed in `src/screens/profile/profile.services.ts`
- OTA is required if the wave reaches GREEN
