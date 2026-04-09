# Wave 1 PDF Path Summary

## Exact entry points in scope
- [useForemanScreenController.ts](/c:/dev/rik-expo-app/src/screens/foreman/useForemanScreenController.ts)
  - `openHistoryPdfSafe`
- [useForemanPdf.ts](/c:/dev/rik-expo-app/src/screens/foreman/hooks/useForemanPdf.ts)
  - `runRequestPdf("preview" | "share")`
- [warehouse.pdf.boundary.ts](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.pdf.boundary.ts)
  - `useWarehousePdfPreviewBoundary`
- Shared orchestration:
  - [pdfDocumentActions.ts](/c:/dev/rik-expo-app/src/lib/documents/pdfDocumentActions.ts)

## Final path semantics after fix
1. User taps PDF action.
2. Busy/start signal is shown immediately through existing busy orchestration.
3. PDF prepare/open path runs through shared typed document flow.
4. Terminal success/failure is recorded in structured observability.
5. On failure, user sees a controlled alert instead of a silent stop.

## User-facing feedback
- Foreman history open: `Открываю PDF…`
- Foreman generated share: `Подготавливаю файл...`
- Foreman generated preview: `Открываю PDF…`
- Warehouse preview messages remain caller-defined, with controlled fallback `Не удалось открыть PDF`

## Observability
- Shared PDF flow remains instrumented in:
  - [pdfDocumentActions.ts](/c:/dev/rik-expo-app/src/lib/documents/pdfDocumentActions.ts)
- Foreman generated PDF failures now additionally record:
  - `foreman_request_pdf_open_failed`
  - `foreman_request_pdf_share_failed`
- Warehouse boundary keeps:
  - `warehouse_pdf_open_failed`

## What was intentionally not changed
- Backend auth/access policy
- PDF entitlement semantics
- Viewer transport/business logic
- Web/Android route behavior
