# S2 Release Proof

Final status: GREEN

## Code / Test Proof

- Targeted tests:
  - Command: `npx jest src/lib/api/s2CanonicalRoleTruthMigration.test.ts src/lib/appAccessModel.test.ts src/lib/pdf/directorPdfAuth.test.ts src/lib/pdf/rolePdfAuth.test.ts src/lib/api/buyerRfqActorRolePriorityMigration.test.ts src/lib/api/proposalAttachmentRolePriorityMigration.test.ts src/lib/api/proposalAttachmentOwnerContinuationMigration.test.ts --runInBand --no-coverage`
  - Result: passed, 7 suites, 36 tests.
- Local runtime verifier:
  - Command: `npx tsx scripts/s2_security_runtime_verify.ts`
  - Result: passed, 5 attack-style checks.
- Typecheck:
  - Command: `npx tsc --noEmit --pretty false`
  - Result: passed.
- Lint:
  - Command: `npx expo lint`
  - Result: passed with existing baseline warnings only.
- Full Jest:
  - Command: `npx jest --no-coverage`
  - Result: passed, 272 passed suites, 1 skipped suite, 1543 passed tests, 1 skipped test.

## Production Backend Proof

- Migration:
  - Command: `npx supabase db push --linked --yes`
  - Applied migration: `20260416183000_s2_canonical_role_truth.sql`
  - Verification: `npx supabase migration list --linked` shows `20260416183000 | 20260416183000`.
- Edge functions deployed:
  - `director-pdf-render`
  - `director-production-report-pdf`
  - `director-subcontract-report-pdf`
  - `director-finance-supplier-summary-pdf`
- Live RFQ verifier:
  - Command: `npx tsx scripts/buyer_tender_publish_runtime_verify.ts`
  - Result: passed.
  - Proof: canonical buyer truth published RFQ while legacy helper still returned `contractor`.

## Release Proof

- Code commit: `f85e37a11b97ad2e30f1d36e1e07ad23df90a0c2`
- Push: `git push origin main` succeeded, `38d06f6..f85e37a main -> main`
- OTA branch: `production`
- OTA runtime version: `1.0.0`
- OTA update group: `64e9a5a2-0886-4903-adbf-2ee09a9febab`
- Android update ID: `019d9521-0f44-7782-b445-2ad145c2e644`
- iOS update ID: `019d9521-0f44-745f-92c5-7183520db897`
- OTA message: `S2 role/rpc/storage hardening`
- EAS dashboard: `https://expo.dev/accounts/azisbek_dzhantaev/projects/rik-expo-app/updates/64e9a5a2-0886-4903-adbf-2ee09a9febab`

## Remaining Risks

- S2 aligned proven high-risk role/RPC/PDF paths, not every historical `security definer` function in the database.
- Signed URL expiry was hardened as policy and tested through access helpers; live expired-token waiting proof remains a future deeper runtime check.
