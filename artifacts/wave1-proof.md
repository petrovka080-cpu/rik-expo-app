# Wave 1 Proof

## Commands

### Typecheck
```bash
npx tsc --noEmit --pretty false
```
- Result: PASS

### Targeted lint
```bash
npx eslint src/screens/foreman/hooks/useForemanPdf.ts src/screens/foreman/useForemanScreenController.ts src/screens/foreman/useForemanPdf.wave1.test.tsx src/screens/warehouse/warehouse.pdf.boundary.ts src/screens/warehouse/warehouse.pdf.boundary.test.tsx
```
- Result: PASS

### Targeted tests
```bash
node node_modules/jest/bin/jest.js src/screens/foreman/useForemanPdf.wave1.test.tsx src/screens/warehouse/warehouse.pdf.boundary.test.tsx src/lib/documents/pdfDocumentActions.test.ts --runInBand
```
- Result: PASS

### Additional regression shield
```bash
node node_modules/jest/bin/jest.js src/lib/documents/pdfDocumentActions.test.ts src/lib/pdf/pdfViewerContract.test.ts src/lib/pdf/pdfCrashBreadcrumbs.test.ts src/lib/pdf/pdf.runner.test.ts src/lib/pdfRunner.nativeOpen.test.ts src/lib/pdf/pdfSourceValidation.test.ts --runInBand
```
- Result: PASS

## Manual/product assertions covered
- Foreman PDF actions use immediate busy labels in active Wave 1 paths.
- Warehouse PDF boundary surfaces controlled failure instead of silent stop.
- Active touched PDF copy is free of mojibake.
- Shared PDF fallback message now defaults to readable Russian instead of English.

## Remaining limitation
- One duplicate inactive-looking Foreman controller branch still has mojibake literals in file source.
- Fresh device/browser runtime proof was not re-captured in this wave.
