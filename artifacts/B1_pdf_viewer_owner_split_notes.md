**Scope**
`B1.PDF_VIEWER_OWNER_SPLIT` only touched the viewer boundary:

- [app/pdf-viewer.tsx](/C:/dev/rik-expo-app/app/pdf-viewer.tsx)
- [src/lib/pdf/pdfViewer.route.ts](/C:/dev/rik-expo-app/src/lib/pdf/pdfViewer.route.ts)
- [src/lib/pdf/pdfViewer.readiness.ts](/C:/dev/rik-expo-app/src/lib/pdf/pdfViewer.readiness.ts)
- [src/lib/pdf/pdfViewer.handoffPlan.ts](/C:/dev/rik-expo-app/src/lib/pdf/pdfViewer.handoffPlan.ts)
- [src/lib/pdf/pdfViewer.error.ts](/C:/dev/rik-expo-app/src/lib/pdf/pdfViewer.error.ts)
- [src/lib/pdf/pdfViewer.nativeWebView.ts](/C:/dev/rik-expo-app/src/lib/pdf/pdfViewer.nativeWebView.ts)
- [src/lib/pdf/PdfViewerScreenContent.tsx](/C:/dev/rik-expo-app/src/lib/pdf/PdfViewerScreenContent.tsx)

No PDF backend, manifest semantics, role business logic, RPC/API contract, auth flow, or document action semantics were changed.

**Initial Ownership Map**
Before `B1`, [app/pdf-viewer.tsx](/C:/dev/rik-expo-app/app/pdf-viewer.tsx) still owned all of these at once:

- route params intake
- snapshot parsing and direct-session fallback
- readiness/bootstrap state derivation
- native handoff planning
- render-state mapping
- terminal success/error normalization
- presenter/UI branch composition
- observability and breadcrumbs

That made route/readiness/error branches hard to test without booting the whole screen.

**New Owner Boundaries**
- `pdfViewer.route.ts`: pure route parsing, validation, direct snapshot fallback contract.
- `pdfViewer.readiness.ts`: pure readiness model, fallback eligibility, content/chrome mapping.
- `pdfViewer.handoffPlan.ts`: pure handoff/open plan selection, including manual re-open plan.
- `pdfViewer.error.ts`: pure viewer error normalization and intentional-detach classification.
- `pdfViewer.nativeWebView.ts`: isolated native WebView selection boundary.
- `PdfViewerScreenContent.tsx`: presenter-only UI composition and shell delegation.

**What Stayed In The Orchestrator**
[app/pdf-viewer.tsx](/C:/dev/rik-expo-app/app/pdf-viewer.tsx) now keeps only orchestration-side responsibilities:

- route input intake
- state ownership via `usePdfViewerOrchestrator`
- snapshot sync into the local screen cycle
- loading timeout arm/cancel
- open-visible/open-failed signal emission
- native handoff execution
- render event commit gating
- file inspection telemetry
- screen-level side effects and final presenter render

**Behavior Guarantees Preserved**
- Viewer route still accepts direct `uri` input and registry-backed sessions.
- Readiness/bootstrap semantics did not change.
- Native handoff vs embedded render selection did not change.
- Error/open/share/retry user semantics did not change.
- Web signed URL and iframe flow did not change.
- Side effects remain in the screen, while pure decisions moved out.

**Residual Risk Intentionally Left Alone**
- The viewer still emits module-level and runtime console telemetry because that is part of the existing support/debug contract.
- Android runtime proof depends on the installed dev launcher wiring, not only on viewer code; this was classified separately in proof rather than “fixed” inside `B1`.
