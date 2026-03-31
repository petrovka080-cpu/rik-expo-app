# Release Discipline Proof

- Batch: `wave2-operational-hardening-subphase1`
- Ledger: `artifacts/release-ledgers/wave2-operational-hardening-subphase1.json`
- Branch: `main`
- Final release-discipline status: **GREEN**

## GREEN definition checks
- Ledger fields complete: yes
- Required proofs present: yes
- Release mapping valid: yes
- Unaccounted dirty paths: 0
- Forbidden local-only paths: 0
- Unknown dirty paths: 0

## Worktree discipline
- Dirty entries scanned: 38
- Known exclusions declared: 35

## Required proof artifacts
- `artifacts/release-discipline-summary.json`
- `artifacts/release-discipline-proof.md`
- `artifacts/cross-role-regression-summary.json`
- `artifacts/cross-role-regression-proof.md`

## Known exclusions
- `artifacts/accountant-payment-form-parity.json` (generated-allowed): pre-existing unrelated accounting leftovers outside Wave 2 scope
- `artifacts/accountant-payment-form-race-proof.json` (generated-allowed): pre-existing unrelated accounting leftovers outside Wave 2 scope
- `artifacts/accountant-payment-form-smoke.json` (generated-allowed): pre-existing unrelated accounting leftovers outside Wave 2 scope
- `artifacts/android-buyer-summary-inbox-user.json` (generated-allowed): pre-existing unrelated runtime artifact outside Wave 2 scope
- `artifacts/android-director-finance-user.json` (generated-allowed): pre-existing unrelated runtime artifact outside Wave 2 scope
- `artifacts/buyer-mutation-jest.json` (generated-allowed): pre-existing unrelated buyer artifact outside Wave 2 scope
- `artifacts/buyer-summary-inbox-runtime.json` (generated-allowed): pre-existing unrelated buyer artifact outside Wave 2 scope
- `artifacts/buyer-summary-inbox-runtime.summary.json` (generated-allowed): pre-existing unrelated buyer artifact outside Wave 2 scope
- `artifacts/director-finance-runtime.json` (generated-allowed): pre-existing unrelated director artifact outside Wave 2 scope
- `artifacts/director-finance-runtime.summary.json` (generated-allowed): pre-existing unrelated director artifact outside Wave 2 scope
- `artifacts/director-finance-web-smoke.json` (generated-allowed): pre-existing unrelated director artifact outside Wave 2 scope
- `artifacts/director-reports-runtime.json` (generated-allowed): pre-existing unrelated director artifact outside Wave 2 scope
- `artifacts/director-reports-runtime.summary.json` (generated-allowed): pre-existing unrelated director artifact outside Wave 2 scope
- `artifacts/foreman-request-sync-runtime.json` (generated-allowed): pre-existing unrelated foreman artifact outside Wave 2 scope
- `artifacts/foreman-request-sync-runtime.summary.json` (generated-allowed): pre-existing unrelated foreman artifact outside Wave 2 scope
- `artifacts/pdf-family-hardening-summary.json` (generated-allowed): pre-existing unrelated pdf artifact outside Wave 2 scope
- `artifacts/pdf-family-jest.json` (generated-allowed): pre-existing unrelated pdf artifact outside Wave 2 scope
- `artifacts/pdf-runner-observability-proof.json` (generated-allowed): pre-existing unrelated pdf artifact outside Wave 2 scope
- `artifacts/warehouse-api-wave1-summary.json` (generated-allowed): pre-existing unrelated warehouse artifact outside Wave 2 scope
- `artifacts/warehouse-request-canonical-loader-trace.json` (generated-allowed): pre-existing unrelated warehouse artifact outside Wave 2 scope
- `artifacts/warehouse-request-source-parity.json` (generated-allowed): pre-existing unrelated warehouse artifact outside Wave 2 scope
- `src/lib/rik_api.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/accountant.inbox.service.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/accountant.paymentForm.helpers.test.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/accountant.paymentForm.helpers.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/accountant.windowing.service.test.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/components/ActivePaymentForm.test.tsx` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/presentation/accountantRowAdapters.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/useAccountantPaymentForm.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `artifacts/accounting-canonical-finance-jest.json` (generated-allowed): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `artifacts/accounting-canonical-finance-proof.md` (generated-allowed): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `docs/architecture/accounting-finance-transition-map.md` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `scripts/accounting_canonical_finance_verify.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `src/screens/accountant/presentation/accountantRowAdapters.test.ts` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope
- `supabase/migrations/20260331110000_accounting_canonical_finance_chain_v1.sql` (release-critical): pre-existing unrelated accounting batch leftover outside Wave 2 scope

## Release mapping
- commitSha: `a1e24bf`
- pushTarget: `origin/main`
- ota.published: `false`
- ota.development: `null`
- ota.preview: `null`
- ota.production: `null`
- ota.note: `OTA intentionally not published: this batch changes release discipline docs, verifiers, and proof artifacts without shipping a new app runtime payload.`
