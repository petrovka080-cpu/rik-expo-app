# PDF-Z3.1 Boundary Map

Status: COMPLETE.

Selected path: warehouse `incoming_register` all-period register PDF.

## Owner Chain

- Route/screen: `/office/warehouse`, reports tab, incoming mode.
- UI click owner: `src/screens/warehouse/components/WarehouseReportsTab.tsx`.
- Client PDF action owner: `src/screens/warehouse/warehouse.pdfs.ts`.
- Source fingerprint owner: `src/screens/warehouse/hooks/useWarehouseScreenData.ts`.
- Backend client owner: `src/lib/api/warehousePdfBackend.service.ts`.
- Shared manifest/version contract owner: `src/lib/pdf/warehousePdf.shared.ts`.
- Canonical renderer contract owner: `src/lib/pdf/canonicalPdfPlatformContract.ts`.
- Edge render/materialization owner: `supabase/functions/warehouse-pdf/index.ts`.
- Source RPC: `acc_report_incoming_v2`.
- Storage bucket: canonical warehouse PDF export bucket returned by `warehouse-pdf`.

## Scope Freeze

Changed:

- `incoming_register` manifest/version/artifact reuse path.
- incoming-register client fingerprint handoff.
- incoming-register in-flight discipline.
- incoming-register persistent signed-artifact handoff with TTL.
- `artifact_cache` renderer typing.

Not changed:

- Warehouse formulas.
- Totals/grouping/ordering.
- PDF template semantics.
- UI semantics.
- Issue/materials/object/day PDF families.
- Director/Foreman/Buyer/Contractor PDFs.
- SQL.

## Invalidation Policy

- Same client source fingerprint and document scope: reuse is allowed.
- Changed period/data fingerprint/scope: cache key changes and backend path is used.
- Persistent handoff is TTL-bound to the signed URL window and is not authoritative for source truth.
- Server artifact path remains deterministic from `source_version + template/render/artifact versions`.
