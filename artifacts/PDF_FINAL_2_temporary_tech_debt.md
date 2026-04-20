# PDF-FINAL.2 Temporary Technique Review

Status: implementation artifact.

## Exact PDF-FINAL Findings

| Finding | Scope | Decision |
| --- | --- | --- |
| Warehouse `issue_register` repeated the old heavy click path. | `src/lib/api/warehousePdfBackend.service.ts`, `supabase/functions/warehouse-pdf/index.ts` | Fixed in `PDF-FINAL`: same-version repeat uses client/persisted handoff; backend checks deterministic artifact before render. |
| Z3 warehouse cache was hard-coded to `incoming_register`. | `src/lib/pdf/warehousePdf.shared.ts`, `src/lib/api/warehousePdfBackend.service.ts` | Fixed by adding an issue-register manifest/version contract and document-kind-aware persisted cache key. |
| No `issue_register` client source fingerprint. | `src/screens/warehouse/hooks/useWarehouseScreenData.ts`, `src/screens/warehouse/warehouse.pdfs.ts` | Fixed by deriving `wissue_client_v1_*` from loaded issue rows and passing it through the canonical request. |

## No New Temporary Techniques Added

- No temporary hooks.
- No temporary adapters.
- No VM/test-only runtime.
- No `@ts-ignore`.
- No new `eslint-disable`.
- No formula, total, grouping, ordering, template, viewer, or UI semantic edits.

## Existing Repository-Wide Suppressions

The repo still contains pre-existing Deno Edge Function file-level suppressions such as `@ts-nocheck` and `import/no-unresolved` in Supabase function files. This wave did not add new suppressions and did not rely on them to bypass tests.

Reason this wave did not mass-remove them:

- They are shared Edge runtime/tooling declarations across several functions, not the source of the PDF repeat-open bottleneck.
- Removing them globally would be a broad toolchain migration, not an exact document-platform hardening slice.
- The production behavior risk addressed here was Warehouse `issue_register` rebuild-as-default, which is closed without adding suppression debt.

Recommended follow-up only if requested as a separate platform tooling wave:

- Introduce a Deno/Supabase function typecheck/lint boundary.
- Remove file-level Edge suppressions behind that boundary.
- Keep this separate from PDF formulas/templates/open-path changes.
