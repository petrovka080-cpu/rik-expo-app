# Wave 6: PDF Layer Decomposition Proof

## Scope
- Narrow decomposition only in `src/lib/pdf`.
- No backend function, RPC contract, rollout logic, or viewer/open changes.

## Family Map
- Warehouse facade: `src/lib/pdf/pdf.warehouse.ts`
  - `src/lib/pdf/warehouse/issue.ts`
  - `src/lib/pdf/warehouse/incoming.ts`
  - `src/lib/pdf/warehouse/reports.ts`
  - `src/lib/pdf/warehouse/shared.ts`
- Director facade: `src/lib/pdf/pdf.director.templates.ts`
  - `src/lib/pdf/director/finance.ts`
  - `src/lib/pdf/director/supplier.ts`
  - `src/lib/pdf/director/management.ts`
  - `src/lib/pdf/director/production.ts`
  - `src/lib/pdf/director/subcontract.ts`
  - `src/lib/pdf/director/shared.ts`
- Shared section/layout helpers remained in `src/lib/pdf/pdf.director.sections.ts`.

## Proof
- `node node_modules/typescript/bin/tsc --noEmit --pretty false`
  - passed
- `node node_modules/jest/bin/jest.js src/lib/pdf/pdfLayerDecomposition.test.ts src/lib/api/pdf_director.test.ts src/screens/warehouse/warehouse.pdf.source.services.test.ts --runInBand --json --outputFile artifacts/wave6-pdf-layer-jest.json`
  - passed
  - 3 suites passed
  - 19 tests passed

## Notes
- Public import surfaces stayed stable through facade files.
- Director backend-first render path and warehouse source-service path remained intact.
- Typed cleanup was limited to the decomposed PDF scope; no product semantics changed.
