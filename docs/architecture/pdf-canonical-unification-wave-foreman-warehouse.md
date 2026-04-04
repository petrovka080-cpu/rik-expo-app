# Canonical PDF Unification Wave: Foreman / Warehouse

## Canonical reference

Director is the production reference path:

`client trigger -> typed backend payload -> backend source load -> backend render -> storage upload -> signed remote URL -> /pdf-viewer opens remote-url`

Confirmed code path:

- Client typed payload + backend invoke:
  - `src/screens/director/director.reports.pdfService.ts`
  - `src/lib/api/directorProductionReportPdfBackend.service.ts`
  - `src/lib/api/directorSubcontractReportPdfBackend.service.ts`
  - `src/lib/api/directorPdfBackendInvoker.ts`
- Backend render/upload/signed-url:
  - `supabase/functions/director-production-report-pdf/index.ts`
  - `supabase/functions/director-subcontract-report-pdf/index.ts`
  - `supabase/functions/director-pdf-render/index.ts`
- Shared viewer contract:
  - `src/lib/documents/pdfDocumentActions.ts`
  - `src/lib/pdf/pdfViewerContract.ts`
  - `app/pdf-viewer.tsx`

## Legacy paths

### Foreman

Foreman request PDFs are still legacy client-render:

- Entry points:
  - `src/screens/foreman/hooks/useForemanPdf.ts`
  - `src/screens/foreman/useForemanScreenController.ts`
- Current legacy chain:
  - `src/lib/documents/pdfDocumentGenerators.ts`
  - `src/lib/api/pdf_request.ts`
  - `src/lib/pdf/pdf.builder.ts`
  - `src/lib/pdf/pdf.template.ts`
  - `src/lib/pdf/pdf.runner.ts`
  - `src/lib/api/pdf.ts`
- Exact divergence from canonical:
  - source load happens on client
  - HTML render happens on client
  - transport becomes local-file / blob family instead of canonical remote-url

### Warehouse

Warehouse is partially migrated only at source boundary, but not at render/output boundary:

- Entry points:
  - `src/screens/warehouse/warehouse.pdfs.ts`
  - `src/screens/warehouse/warehouse.reports.ts`
  - `src/screens/warehouse/warehouse.reportPdf.service.ts`
  - `src/screens/warehouse/warehouse.incomingForm.pdf.service.ts`
- Current mixed chain:
  - some source loading is already canonical RPC-first:
    - `src/screens/warehouse/warehouse.incomingForm.pdf.service.ts`
    - `src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts`
    - `src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts`
    - `src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts`
  - final PDF render is still legacy client-side:
    - `src/lib/pdf/warehouse/shared.ts`
    - `src/lib/pdf/pdf.runner.ts`
    - `src/lib/api/pdf.ts`
- Exact divergence from canonical:
  - source load is sometimes backend-owned
  - final HTML -> PDF render and file transport are still client-owned

## Web viewer diagnosis

Viewer loop surface is `app/pdf-viewer.tsx`.

Current unstable points:

- lifecycle logs are emitted from render-sensitive paths instead of stable session-cycle boundaries
- web remote-url path marks ready before iframe terminal render completes
- session access bookkeeping (`touchDocumentSession`) feeds viewer state refreshes even when render source did not change

## Migrate now

- `app/pdf-viewer.tsx` lifecycle stabilization for single web open cycle
- Foreman request PDF entry points to backend-first remote-url transport
- Warehouse report + incoming PDF entry points to backend-first remote-url transport
- only the shared contracts and observability needed to support those migrations

## Intentionally untouched in this wave

- Director production paths
- `/pdf-viewer` route semantics
- unrelated PDF families
- broad `pdfRunner` rewrite
- UX / role navigation changes
