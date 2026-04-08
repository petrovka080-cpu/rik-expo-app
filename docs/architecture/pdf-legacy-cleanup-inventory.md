# PDF Legacy Cleanup Inventory

## Canonical active paths

- `Foreman request`
  - Entry: `src/screens/foreman/foreman.requestPdf.service.ts`
  - Backend: `src/lib/api/foremanRequestPdfBackend.service.ts` -> `foreman-request-pdf`
  - Open contract: remote `PdfSource` -> `prepareAndPreviewGeneratedPdf` -> `/pdf-viewer`

- `Warehouse document/register/materials`
  - Entry: `src/screens/warehouse/warehouse.pdfs.ts`
  - Backend: `src/lib/api/warehousePdfBackend.service.ts` -> `warehouse-pdf`
  - Open contract: remote `PdfSource` -> `prepareAndPreviewPdfDocument` -> `/pdf-viewer`

- `Director supplier/production/subcontract`
  - Entries: `src/screens/director/director.finance.pdfService.ts`, `src/screens/director/director.reports.pdfService.ts`
  - Backends: role-specific backend services -> `director-finance-supplier-summary-pdf`, `director-production-report-pdf`, `director-subcontract-report-pdf`
  - Open contract: remote `PdfSource` -> `prepareAndPreviewGeneratedPdf` -> `/pdf-viewer`

- `Director management report`
  - Entry: `src/screens/director/director.finance.pdfService.ts`
  - Backend render: `src/lib/api/pdf_director.ts` -> `src/lib/api/directorPdfRender.service.ts` -> `director-pdf-render`
  - Open contract after this wave: remote `PdfSource` -> `prepareAndPreviewGeneratedPdf` -> `/pdf-viewer`

## Removed or hard-disabled legacy risk

- Migrated role families can no longer silently prepare a `local-file` or `blob` source at `pdfDocumentActions` boundary.
- Warehouse preview boundary no longer bridges backend result through legacy-style `getUri`; it now builds a remote `PdfSource`.
- Director management report descriptor no longer bridges backend result through legacy-style `getUri`; it now builds a remote `PdfSource`.

## Kept compat branches

- Shared local HTML/file PDF infra remains for non-migrated families such as request/proposal/payment/attachment flows.
- `director-pdf-render` management-report family is still a compat backend-render branch because the client still shapes the management HTML before backend render/storage. It stays because the active product path is green and no silent local/client fallback remains on the open boundary.

## Canonical enforcement after cleanup

- Active production role PDF families must resolve to `source.kind === "remote-url"` before preview/open.
- Active production role PDF families still converge on `/pdf-viewer` for visible open.
