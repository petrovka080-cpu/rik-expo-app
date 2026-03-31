# Wave 7: Performance / Bundle Tightening

## Scope
- Safe lazy-loading for heavy optional branches
- Narrow platform pollution tightening
- Noncritical runtime noise reduction
- Dependency overlap inventory only

## Implemented Changes
- `xlsx` moved off eager director-screen imports into on-demand runtime loader:
  - `src/lib/runtime/loadXlsx.ts`
  - `src/lib/exports/xlsxExport.ts`
  - callers updated:
    - `src/screens/director/director.proposal.ts`
    - `src/screens/director/director.request.ts`
- Leaflet CSS moved from root-layout web bootstrap to the web map renderer:
  - `app/_layout.tsx`
  - `src/components/map/MapRenderer.web.tsx`
  - `src/components/map/leafletWebCss.ts`
- Noncritical production console noise reduced:
  - `src/screens/director/director.finance.pdfService.ts`

## Commands
```powershell
node node_modules/typescript/bin/tsc --noEmit --pretty false
```

Result: passed

```powershell
node node_modules/jest/bin/jest.js src/lib/exports/xlsxExport.test.ts src/components/map/leafletWebCss.test.ts --runInBand --json --outputFile artifacts/wave7-perf-bundle-jest.json
```

Result: passed
- suites: 2
- tests: 2
- failed: 0

## Static Smoke / Inventory Proof
- `rg -n "xlsx" src/screens/director src/lib`
  - confirmed director screen modules now depend on `src/lib/exports/xlsxExport.ts` instead of importing `xlsx` directly
- `rg -n "expo-av|expo-audio|react-native-portalize|leaflet|react-native-maps" src app package.json`
  - confirmed overlap/usage inventory recorded in JSON matrices

## Outcome
- Heavy optional `xlsx` no longer loads eagerly in director screens
- Leaflet web CSS no longer leaks from the root layout into every route
- Active overlap inventory is documented without unsafe dependency removal
- Production observability-critical PDF logs were preserved
