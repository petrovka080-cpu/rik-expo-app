# PDF-FINAL.3 Manifest / Readiness Contract

Status: implementation artifact.

## Required Contract

Heavy document paths use the same conceptual contract:

- `document_kind`
- `document_scope`
- `source_version`
- `artifact_version`
- `status = ready | building | stale | failed | missing`
- `artifact_path` / `artifact_url`
- `last_built_at`
- `last_source_change_at`
- `last_successful_artifact`
- `template_version`
- `render_contract_version`

Some existing local descriptor paths store the ready descriptor rather than a remote `artifact_url`, but still use the same source/artifact/version/readiness rules.

## Implemented Owners

| Family | Manifest / readiness owner | Storage / artifact owner | Status |
| --- | --- | --- | --- |
| Director finance management | `src/lib/pdf/directorPdfPlatformContract.ts` | `supabase/functions/director-pdf-render/index.ts` | Closed in `PDF-Z1`. |
| Director production report | `src/lib/pdf/directorPdfPlatformContract.ts` | `supabase/functions/director-production-report-pdf/index.ts` | Closed in `PDF-Z2`. |
| Warehouse incoming register | `src/lib/pdf/warehousePdf.shared.ts` | `supabase/functions/warehouse-pdf/index.ts` | Closed in `PDF-Z3`. |
| Warehouse issue register | `src/lib/pdf/warehousePdf.shared.ts` | `supabase/functions/warehouse-pdf/index.ts` | Closed in `PDF-FINAL`. |
| Foreman request | `src/lib/pdf/foremanRequestPdf.shared.ts` | `supabase/functions/foreman-request-pdf/index.ts` | Closed in `PDF-Z4`. |
| Purchaser proposal | `src/screens/buyer/buyerProposalPdf.manifest.ts` | persisted descriptor cache | Closed in `PDF-PUR-1`. |
| Accountant payment report | `src/screens/accountant/accountantPaymentReportPdf.manifest.ts` | persisted descriptor cache | Closed in `PDF-ACC-1`. |
| Accountant proposal | `src/screens/accountant/accountantProposalPdf.manifest.ts` | persisted descriptor cache | Closed in `PDF-ACC-FINAL`. |
| Accountant PDF attachment | `src/screens/accountant/accountantAttachmentPdf.manifest.ts` | existing attachment artifact descriptor | Closed in `PDF-ACC-FINAL`. |
| Contractor act | `src/screens/contractor/contractorPdf.manifest.ts` | persisted descriptor cache | Closed in `PDF-Z5`. |

## PDF-FINAL Contract Addition

Warehouse `issue_register` now has:

- Manifest version: `pdf_final_warehouse_issue_register_manifest_v1`.
- Document kind: `warehouse_issue_register`.
- Source version prefix: `wissue_src_v1`.
- Artifact version prefix: `wissue_art_v1`.
- Artifact path root: `warehouse/issue_register/artifacts/v1`.
- Manifest path root: `warehouse/issue_register/manifests/v1`.
- Render contract version: `backend_warehouse_pdf_v1`.
- Template version: `warehouse_issue_register_template_v1`.

The backend artifact path is derived from `artifact_version`; repeat same-version requests do not create random storage paths.

## Freshness Policy

- Same business data and same template/render versions: reuse ready artifact/descriptor.
- Meaningful source change: new `source_version`, therefore new `artifact_version`.
- Noise fields: ignored in source version.
- Persisted descriptor reuse is accepted only if the stored source/artifact version matches the current manifest.
- Stale mismatches are removed and rebuilt through the canonical source path.
- `inFlight` is registered before any manifest, cache, storage, source, render, upload, or signing await.
