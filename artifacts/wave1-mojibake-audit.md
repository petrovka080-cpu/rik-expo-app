# Wave 1 Mojibake Audit

## Scope
- Foreman PDF open flow
- Warehouse PDF open boundary

## Fixed strings

### [useForemanPdf.ts](/c:/dev/rik-expo-app/src/screens/foreman/hooks/useForemanPdf.ts)
- Before: `РџРѕРґРіРѕС‚Р°РІР»РёРІР°СЋ С„Р°Р№Р»...`
- After: `Подготавливаю файл...`

- Before: `РћС‚РєСЂС‹РІР°СЋ PDFвЂ¦`
- After: `Открываю PDF…`

- Before: `РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ PDF`
- After: `Не удалось открыть PDF`

### [useForemanScreenController.ts](/c:/dev/rik-expo-app/src/screens/foreman/useForemanScreenController.ts)
- Before: `Request ${rid}`
- After: `Заявка ${rid}`

- Before: `Opening PDF...`
- After: `Открываю PDF…`

- Before: `Could not open PDF`
- After: `Не удалось открыть PDF`

### [warehouse.pdf.boundary.ts](/c:/dev/rik-expo-app/src/screens/warehouse/warehouse.pdf.boundary.ts)
- Before: `РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ PDF`
- After: `Не удалось открыть PDF`

### [pdfDocumentActions.ts](/c:/dev/rik-expo-app/src/lib/documents/pdfDocumentActions.ts)
- Before: default fallback `Could not open PDF`
- After: default fallback `Не удалось открыть PDF`

## Notes
- No runtime re-decoding helper was added.
- Source-of-truth literals were corrected directly in product files.
- Manual source verification confirms active Wave 1 PDF copy now reads as normal UTF-8 Russian.
- One duplicate legacy-looking Foreman controller block still contains mojibake literals in file source, but the active wired PDF entry path already uses the corrected copy.
