# A3.CLIENT_FALLBACK_BURNDOWN Proof

## Changed Scope

- `src/screens/buyer/buyer.actions.repo.ts`
- `src/screens/buyer/buyer.status.mutation.ts`
- `src/screens/buyer/buyer.actions.repo.test.ts`
- `src/screens/buyer/buyer.status.mutation.test.ts`
- `src/lib/infra/jobQueue.ts`
- `src/lib/infra/jobQueue.test.ts`

## Before

- Buyer status RPC failure could call a direct `request_items` table update fallback and still surface partial success.
- Queue claim/complete/fail RPC unavailability could fall back to client-side `submit_jobs` reads/updates.

## After

- Buyer direct status fallback is blocked and throws a normalized fail-closed error.
- Buyer status mutation fails at `set_request_items_director_status` when the server-owned RPC fails.
- Queue claim/complete/fail no longer direct-mutates `submit_jobs` when RPC contracts are missing or incompatible.
- Healthy RPC paths still pass.

## Verification Commands

```bash
npm test -- buyer.actions.repo --runInBand
```

Result: PASS, 1 suite, 3 tests.

```bash
npm test -- jobQueue --runInBand
```

Result: PASS, 1 suite, 6 tests.

```bash
npm test -- buyer.status.mutation --runInBand
```

Result: PASS, 1 suite, 9 tests.

```bash
npx tsc --noEmit --pretty false
```

Result: PASS.

```bash
npx expo lint
```

Result: PASS.

```bash
git diff --check
```

Result: PASS.

```bash
npm test -- --runInBand
```

Result: PASS, 369 suites passed, 1 skipped; 2361 tests passed, 1 skipped.

```bash
npm test
```

Result: PASS, 369 suites passed, 1 skipped; 2361 tests passed, 1 skipped.

## Fallback Direct Write Proof

- `setRequestItemsDirectorStatusFallback` no longer calls `supabase.from("request_items")`.
- `claimSubmitJobsWithClient` no longer reads/updates `submit_jobs` as a fallback when `submit_jobs_claim` is unavailable.
- `markSubmitJobCompletedWithClient` no longer updates `submit_jobs` directly for completion or cleanup.
- `markSubmitJobFailedWithClient` no longer reads retry count or updates `submit_jobs` directly when failure RPCs are unavailable.
