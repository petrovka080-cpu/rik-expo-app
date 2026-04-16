# H1.7 Buyer RFQ Role Boundary Release Proof

## Final Status

GREEN CANDIDATE. Static gates, remote migration, targeted tests, full Jest, and runtime proof are green. Commit, push, and OTA fields are filled after release execution.

## Scope

Only the buyer RFQ publish role boundary was changed.

## Changed Files

- `supabase/migrations/20260416165000_buyer_rfq_actor_role_priority_h1_7.sql`
- `src/lib/api/buyerRfqActorRolePriorityMigration.test.ts`
- `src/screens/buyer/buyer.rfq.rework.mutation.test.ts`
- `scripts/buyer_tender_publish_runtime_verify.ts`
- `artifacts/H1_7_buyer_rfq_role_boundary_audit.md`
- `artifacts/H1_7_buyer_rfq_role_boundary_release_proof.md`

## What Changed

- Added `public.buyer_rfq_actor_is_buyer_v1()`.
- Repointed `buyer_rfq_create_and_publish_v1` to that helper for actor authorization.
- Preserved buyer-only permission.
- Kept invalid actors on `42501 forbidden actor role`.
- Added regression tests for the SQL role priority and UI no-false-success behavior on `42501`.
- Updated runtime proof to cover the contractor-override drift case.

## What Was Not Changed

- RFQ business semantics.
- Tender publishing semantics.
- Buyer inbox scope validation.
- Request item validation.
- UI design.
- Attachments, submit, approve, finance, PDF, or draft flows.

## Migration Proof

- Dry-run: `npx supabase db push --linked --dry-run`
- Applied: `npx supabase db push --linked --yes`
- Remote verification: `buyer_rfq_create_and_publish_v1` now calls `public.buyer_rfq_actor_is_buyer_v1()`.

## Runtime Proof

- Command: `npx tsx scripts/buyer_tender_publish_runtime_verify.ts`
- Raw result artifact: `artifacts/buyer-tender-publish-runtime-proof.json`
- Sanitized committed artifact: `artifacts/H1_7_buyer_rfq_runtime_proof.json`
- Status: `GREEN`
- Proof facts:
  - `roleProbe.rpcRole = contractor`
  - `roleProbe.appMetadataRole = buyer`
  - `roleProbe.profileRoles` includes `buyer`
  - `roleProbe.companyMemberships` includes `buyer`
  - tender was created
  - tender status was `published`
  - no forbidden actor role alert occurred

## Test Proof

- Targeted command:
  `npx jest src/lib/api/buyerRfqActorRolePriorityMigration.test.ts src/screens/buyer/buyer.rfq.rework.mutation.test.ts src/screens/buyer/buyer.actions.repo.test.ts tests/app/office-role-route-parity.test.ts --runInBand --no-coverage`
- Targeted result:
  `Test Suites: 4 passed, 4 total`
  `Tests: 18 passed, 18 total`
- Typecheck command:
  `npx tsc --noEmit --pretty false`
- Typecheck result: PASS
- Lint command:
  `npx expo lint`
- Lint result:
  `0 errors, 6 warnings` (existing baseline)
- Full Jest command:
  `npx jest --no-coverage`
- Full Jest result:
  `Test Suites: 1 skipped, 271 passed, 271 of 272 total`
  `Tests: 1 skipped, 1535 passed, 1536 total`

## Commit / Push / OTA

Pending.

## Remaining Risks

None identified inside H1.7 scope. Real-device user proof is still the final human-facing confirmation, but the production DB runtime verifier covered the exact contractor-override role drift that caused the screenshot failure.
