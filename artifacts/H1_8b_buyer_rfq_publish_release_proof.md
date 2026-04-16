# H1.8b Buyer RFQ Override Publish Proof

Final status: GREEN pending commit/push/OTA ids

## Root cause

H1.8 added the developer override layer, but `buyer_rfq_create_and_publish_v1` still depended on an older RFQ actor path and its rejection diagnostics came from `get_my_role()`. In the failing production scenario the base role was `contractor`, so RFQ publish still returned:

- code: `42501`
- message: `buyer_rfq_create_and_publish_v1: forbidden actor role`
- details: `contractor`

## What changed

- Added `buyer_rfq_actor_context_v1()` as the RFQ-specific server-side context.
- Rewired `buyer_rfq_actor_is_buyer_v1()` to the RFQ context.
- Rewired the actual `buyer_rfq_create_and_publish_v1(...)` RPC to use that context directly.
- Kept RFQ publish buyer-only: no `contractor` allow-list was added.
- Set the seeded developer override for `petrovka080@gmail.com` to `active_effective_role='buyer'` when enabled and unexpired.
- Fixed helper volatility: RFQ override-aware helpers are `volatile` because the override resolver writes audit rows.

## Exact files changed

- `supabase/migrations/20260416202000_h1_8b_buyer_rfq_override_publish.sql`
- `supabase/migrations/20260416203500_h1_8b_buyer_rfq_override_publish_volatility.sql`
- `src/lib/api/buyerRfqDeveloperOverrideMigration.test.ts`
- `src/lib/api/buyerRfqDeveloperOverrideVolatilityMigration.test.ts`
- `scripts/h1_8b_buyer_rfq_override_publish_verify.ts`
- `artifacts/H1_8b_buyer_rfq_publish_runtime_proof.json`
- `artifacts/H1_8b_buyer_rfq_publish_release_proof.md`

## Tests

Targeted SQL contract tests:

```bash
npx jest src/lib/api/buyerRfqDeveloperOverrideMigration.test.ts src/lib/api/buyerRfqDeveloperOverrideVolatilityMigration.test.ts --runInBand --no-coverage
```

Result:

- 2 suites passed
- 5 tests passed

Typecheck:

```bash
npx tsc --noEmit --pretty false
```

Result: passed.

Lint:

```bash
npx expo lint
```

Result: passed with 0 errors and the existing 6-warning baseline.

Full Jest:

```bash
npx jest --no-coverage
```

Result:

- 276 suites passed
- 1 suite skipped
- 1557 tests passed
- 1 test skipped

## Migration proof

Commands:

```bash
$env:SUPABASE_DB_PASSWORD=$env:SUPABASE_SERVICE_ROLE_KEY
npx supabase db push --linked --yes
npx supabase migration list --linked
```

Applied migrations:

- `20260416202000 | 20260416202000 | 2026-04-16 20:20:00`
- `20260416203500 | 20260416203500 | 2026-04-16 20:35:00`

## Runtime proof

Command:

```bash
npx tsx scripts/h1_8b_buyer_rfq_override_publish_verify.ts
```

Result: GREEN.

The verifier created a temporary user with non-buyer base truth:

- `get_my_role()` returned `contractor`
- profile base role was `foreman`
- override was server-side active as `buyer`
- `buyer_rfq_actor_context_v1()` returned `source=developer_override`, `role=buyer`, `allowed=true`

Then it called `buyer_rfq_create_and_publish_v1(...)` and proved:

- tender was created
- tender status became `published`
- tender mode was `rfq`
- tender `created_by` was the override actor
- tender item was linked to the request item

Runtime proof artifact:

- `artifacts/H1_8b_buyer_rfq_publish_runtime_proof.json`

## What was not changed

- No contractor access was added to RFQ publish.
- No global role checks were removed.
- No client-side bypass was added.
- RFQ business logic, tender creation, item linking, visibility checks, and publish semantics were preserved.

## Commit / push / OTA

Pending:

- commit hash
- push proof
- production OTA group / update IDs

## Remaining risks

- This closes the RFQ publish RPC. Other legacy buyer-only RPCs still need to be checked individually if they do not call `app_actor_role_context_v1`.
- The developer override remains TTL-bound and should be disabled or renewed deliberately.
