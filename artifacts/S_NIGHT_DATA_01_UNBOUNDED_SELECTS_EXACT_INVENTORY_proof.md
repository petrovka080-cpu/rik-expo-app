# S_NIGHT_DATA_01_UNBOUNDED_SELECTS_EXACT_INVENTORY

final_status: GREEN_UNBOUNDED_SELECTS_EXACT_INVENTORY_READY
generated_at: 2026-05-10T14:54:32.868Z

## Scope

- roots scanned: src, app
- excluded: tests/specs/contracts, comments, string literals, Platform.select
- Supabase-like select calls: 284
- excluded non-Supabase Platform.select calls: 10

## Metrics

- current unresolved unbounded selects: 0
- select("*") count: 36
- fix_now count: 0
- needs_rpc_change count: 0
- already_bounded count: 246
- domain_bounded count: 31
- export_allowlist count: 7
- already classified count: 91
- real-code-fix candidates: 0
- unbounded without detected limit/range/single: 38

## Top Risk Files

| file | high | medium | total | fix_now | needs_rpc_change |
| --- | ---: | ---: | ---: | ---: | ---: |
| src/lib/api/pdf_proposal.ts | 0 | 3 | 3 | 0 | 0 |
| src/screens/contractor/contractor.pdfService.ts | 0 | 2 | 2 | 0 | 0 |
| src/lib/api/director_reports.naming.ts | 0 | 1 | 1 | 0 | 0 |
| src/lib/pdf/pdf.builder.ts | 0 | 1 | 1 | 0 | 0 |
| src/screens/subcontracts/subcontracts.shared.ts | 0 | 1 | 1 | 0 | 0 |

## Negative Confirmations

- code changed: NO
- production touched: NO
- DB writes: NO
- migrations: NO
- Supabase project changes: NO
- spend cap changes: NO
- Realtime 50K/60K load: NO
- destructive/unbounded DML: NO
- OTA/EAS/TestFlight/native builds: NO
- broad cache enablement: NO
- broad rate-limit enablement: NO
- secrets printed: NO

## Supabase Realtime

WAITING_FOR_SUPABASE_SUPPORT_RESPONSE

## Gates

- focused artifact invariant test: PASS
- npx tsc --noEmit --pretty false: PASS
- npx expo lint: PASS
- npm test -- --runInBand: PASS
- architecture scanner: PASS
- artifact JSON parse: PASS
- git diff --check: PASS
- post-push release:verify --json: pending after push
