# S-PERF-1 Sentry Tracing Proof

Status: GREEN_DISABLED_BY_DEFAULT

## Paths Inspected

- `src/lib/observability/sentry.ts`
- `tests/observability/sentry.test.ts`
- `src/lib/observability/platformObservability.ts`
- `src/lib/catalog/catalog.proposalCreation.service.ts`
- `src/screens/director/director.proposals.repo.ts`
- `src/screens/warehouse/hooks/useWarehouseReceiveApply.ts`
- `src/lib/api/accountant.ts`
- `src/lib/documents/pdfDocumentActions.ts`

## Helper

- Extended existing `src/lib/observability/sentry.ts` with safe performance tracing helpers.
- Default behavior is no-op.
- Tracing requires `EXPO_PUBLIC_SENTRY_PERFORMANCE_TRACING=1` and `EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE>0`.
- Sample rate is clamped to `0.05`.
- If Sentry performance APIs are unavailable or throw before span callback starts, the app flow continues as a no-op.

Performance tracing implementation: READY_DISABLED_BY_DEFAULT
Live production performance visibility: NOT_CLAIMED
Owner action: enable safe sample rate after release approval

## Instrumented Flows

| Flow | Trace name | File | Boundary |
| --- | --- | --- | --- |
| Request/proposal list load | `proposal.list.load` | `src/screens/director/director.proposals.repo.ts` | `fetchDirectorPendingProposalWindow` |
| Proposal submit/create | `proposal.submit` | `src/lib/catalog/catalog.proposalCreation.service.ts` | `createProposalsBySupplier` |
| Warehouse receive/apply | `warehouse.receive.apply` | `src/screens/warehouse/hooks/useWarehouseReceiveApply.ts` | `applyWarehouseReceive` |
| Accountant invoice/payment | `accountant.payment.apply` | `src/lib/api/accountant.ts` | `accountantPayInvoiceAtomic` |
| PDF/document open/render | `pdf.viewer.open` | `src/lib/documents/pdfDocumentActions.ts` | `prepareAndPreviewPdfDocument` |

No optional realtime flow was instrumented in this wave; the required five flows are covered.

## Tag Policy

Allowed low-cardinality tags:

- `flow`
- `role`
- `result`
- `error_class`
- `page_size`
- `offline_queue_used`
- `cache_hit`
- `pdf_guard_triggered`
- `platform`
- `duplicate_warning`
- `budget_warning`

Rejected or stripped:

- user/company/request/proposal/invoice/payment IDs
- emails, phones, addresses
- raw payloads and raw RPC params
- signed URLs, tokens, JWT-like values, authorization values
- file names and document/private identifiers

## Tests Run

- `npm test -- --runInBand tracing` - PASS
- `npm test -- --runInBand sentry` - PASS
- `npm test -- --runInBand proposal` - PASS
- `npm test -- --runInBand warehouse` - PASS
- `npm test -- --runInBand accountant` - PASS
- `npm test -- --runInBand pdf` - PASS
- `npm test -- --runInBand performance` - PASS

## Gates

- `git diff --check` - PASS
- `npx tsc --noEmit --pretty false` - PASS
- `npx expo lint` - PASS
- `npm test -- --runInBand` - PASS, 478 passed suites, 1 skipped suite, 2994 passed tests
- `npm test` - PASS, 478 passed suites, 1 skipped suite, 2994 passed tests

`npm run release:verify -- --json` is recorded after commit/push so the worktree cleanliness gate can pass.

## Safety Confirmations

- Business logic changed: NO
- App behavior changed: NO; tracing is disabled by default and helper failures no-op safely
- SQL/RPC changed: NO
- RLS/storage changed: NO
- Package/native/app config changed: NO
- Production touched: NO
- Production writes: NO
- Raw payload logged: NO
- PII logged: NO
- Secrets printed: NO
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO
