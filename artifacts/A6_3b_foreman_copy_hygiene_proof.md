# A6.3b Foreman Copy Hygiene Proof

Status: GREEN candidate

## Commands

```bash
npm test -- ForemanSubcontractPdfGuard --runInBand --no-coverage
npm test -- useForemanScreenController --runInBand --no-coverage
npm test -- foreman --runInBand --no-coverage
rg -n "Р§РµСЂРЅРѕРІРёРє|Р—Р°СЏРІРєР°|Р­РєСЃРїРѕСЂС‚" src/screens/foreman/useForemanScreenController.ts src/screens/foreman/hooks/useForemanSubcontractController.tsx
npx tsc --noEmit --pretty false
npx expo lint
git diff --check
npm test -- --runInBand
npm test
```

## Results

- `ForemanSubcontractPdfGuard`: PASS, 4 tests
- `useForemanScreenController`: PASS, 5 tests
- `foreman`: PASS, 26 suites / 181 tests
- Product grep for touched mojibake signatures: no matches
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `git diff --check`: PASS
- `npm test -- --runInBand`: PASS, 373 suites passed / 1 skipped, 2377 tests passed / 1 skipped
- `npm test`: PASS, 373 suites passed / 1 skipped, 2377 tests passed / 1 skipped

## Before / After

Before:

- Foreman PDF/export copy could render mojibake in descriptor titles and Excel placeholder alert.

After:

- Touched Foreman PDF/export copy is readable.
- Existing PDF descriptor factory and navigation behavior are unchanged.
