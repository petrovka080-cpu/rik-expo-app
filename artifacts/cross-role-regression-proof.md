# Cross-Role Regression Proof

- Final consolidated status: **GREEN**
- Exact failed chain: `none`
- Exact failed step: `none`
- Exact failure class: `none`

## Chains
### Request -> Proposal -> Director -> Accountant
- status: `GREEN`
- failedStep: `none`
- failureClass: `none`
- componentSources: `artifacts/request-lifecycle-boundary-smoke.json`, `artifacts/proposal-atomic-boundary-smoke.json`, `artifacts/director-canonical-fact-smoke.json`, `artifacts/accounting-canonical-finance-smoke.json`, `artifacts/attachment-evidence-boundary-smoke.json`, `artifacts/pdf-open-crash-regression-summary.json`
### Request lifecycle safety
- status: `GREEN`
- failedStep: `none`
- failureClass: `none`
- componentSources: `artifacts/request-lifecycle-boundary-smoke.json`
### Attachment / commercial evidence visibility
- status: `GREEN`
- failedStep: `none`
- failureClass: `none`
- componentSources: `artifacts/attachment-evidence-boundary-smoke.json`, `artifacts/attachment-evidence-parity.json`
### PDF open runtime safety
- status: `GREEN`
- failedStep: `none`
- failureClass: `none`
- componentSources: `artifacts/pdf-open-runtime-proof.json`, `artifacts/pdf-open-crash-regression-summary.json`

## Commands
- `npx tsx scripts/request_lifecycle_boundary_verify.ts` -> passed
- `npx tsx scripts/proposal_atomic_boundary_verify.ts` -> passed
- `npx tsx scripts/director_canonical_fact_verify.ts` -> passed
- `npx tsx scripts/accounting_canonical_finance_verify.ts` -> passed
- `npx tsx scripts/attachment_evidence_boundary_verify.ts` -> passed
- `npx jest --runInBand src/lib/pdf/pdfViewerContract.test.ts src/lib/pdfRunner.nativeOpen.test.ts src/lib/documents/pdfDocumentActions.test.ts src/lib/documents/attachmentOpener.test.ts --json --outputFile artifacts/pdf-open-regression-jest.json` -> passed
- `npx tsx scripts/pdf_open_crash_regression_verify.ts` -> passed
