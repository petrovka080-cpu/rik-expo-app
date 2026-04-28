# S-PDF-1 WebView/PDF termination guards proof

Status: GREEN pending commit and push

## Scope

- HEAD before: `4727e99b4bc96ab413ba0082fc2ec2dc0afc5d45`
- Runtime files changed:
  - `app/pdf-viewer.tsx`
  - `src/lib/pdf/PdfViewerNativeShell.tsx`
  - `src/lib/pdf/PdfViewerScreenContent.tsx`
  - `src/lib/pdf/pdfViewerRenderEventGuard.ts`
- Tests changed:
  - `src/lib/pdf/pdfViewerRenderEventGuard.test.ts`
  - `tests/pdf/PdfViewerScreenContent.test.tsx`
  - `tests/pdf/PdfViewerShells.test.tsx`
  - `tests/routes/pdf-viewer.lifecycle.test.tsx`

## Guard Added

- Native WebView renderer termination is now handled through `onRenderProcessGone`.
- The termination event is converted into the existing controlled PDF render error path.
- Stale render events remain suppressed by the existing render-instance guard.
- The viewer records metadata-only console/breadcrumb commands and then calls the existing `markError` path.
- No PDF source selection, generation, permissions, storage, RPC, route, or visible UI workflow was changed.

## Proof

- `PdfViewerNativeShell` delegates `onRenderProcessGone`.
- `PdfViewerScreenContent` wires the callback through the existing presenter boundary.
- `pdfViewerRenderEventGuard` plans `native_webview_process_gone` as a terminal error without side effects.
- `app/pdf-viewer.tsx` commits the process-gone plan using the same `markError` and breadcrumb path as native WebView errors.
- Route-level lifecycle test proves a native renderer crash is converted to a controlled PDF error.

## Privacy / Logging

- Raw WebView row payload logged: NO
- Request/response body logged: NO
- Token logged: NO
- Signed URL intentionally added to logs: NO
- New metadata fields: `didCrash`, terminal event name, existing document metadata path
- Existing console emit path still redacts sensitive records before writing.

## Safety

- Business logic changed: NO
- PDF generation changed: NO
- PDF source/RPC changed: NO
- SQL/RPC changed: NO
- RLS changed: NO
- Navigation changed: NO
- Visible UI changed: NO
- Maestro YAML changed: NO
- App config changed: NO
- Package changed: NO
- Native dependency changed: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- OTA published: NO

## Gates

- targeted PDF tests: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `git diff --check`: PASS
- Android local release proof: PASS
  - `.\gradlew.bat assembleRelease`: PASS
  - `adb install -r android\app\build\outputs\apk\release\app-release.apk`: PASS
  - app launch via monkey: PASS
  - app process after launch: PASS
  - FATAL EXCEPTION / AndroidRuntime in recent logs: NO
- `npm run release:verify -- --json`: pending final post-commit check

## Release

- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
