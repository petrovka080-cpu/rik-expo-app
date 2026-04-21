/**
 * Package E: PDF viewer decomposition audit shield tests.
 *
 * Validates that:
 * 1. All extracted viewer owner-boundary files exist
 * 2. `app/pdf-viewer.tsx` composes extracted modules instead of re-declaring them
 * 3. Decision logic is delegated to pure modules while side effects stay in the viewer
 * 4. Presenter/shell rendering is kept out of the screen orchestrator
 * 5. `pdfDocumentActions.ts` public exports stay stable for the next B2 wave
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const PDF_LIB = join(__dirname, "..", "..", "src", "lib", "pdf");
const TESTS_PDF = join(__dirname, "..", "..", "tests", "pdf");
const VIEWER_PATH = join(__dirname, "..", "..", "app", "pdf-viewer.tsx");
const ACTIONS_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "lib",
  "documents",
  "pdfDocumentActions.ts",
);

const viewerSource = readFileSync(VIEWER_PATH, "utf8");
const actionsSource = readFileSync(ACTIONS_PATH, "utf8");

describe("B1: extracted modules exist", () => {
  const EXPECTED_FILES = [
    "pdfViewer.constants.ts",
    "pdfViewer.styles.ts",
    "pdfViewer.components.tsx",
    "pdfViewer.helpers.ts",
    "usePdfViewerActions.ts",
    "pdfViewerContract.ts",
    "pdfViewerRenderLifecycle.ts",
    "pdfViewerRenderEventGuard.ts",
    "pdfViewerWebRenderUriCleanup.ts",
    "pdfViewerLoadingTimeoutGuard.ts",
    "pdfViewerBootstrapPlan.ts",
    "pdfViewerOpenSignalPlan.ts",
    "pdfNativeHandoffGuard.ts",
    "pdfCrashBreadcrumbs.ts",
    "pdfCriticalPath.ts",
    "pdfOpenFlow.ts",
    "pdfMobilePreviewSizeGuard.ts",
    "pdfSourceValidation.ts",
    "pdfLifecycle.ts",
    "usePdfViewerOrchestrator.ts",
    "PdfViewerNativeShell.tsx",
    "PdfViewerWebShell.tsx",
    "pdfViewer.route.ts",
    "pdfViewer.readiness.ts",
    "pdfViewer.handoffPlan.ts",
    "pdfViewer.error.ts",
    "pdfViewer.nativeWebView.ts",
    "PdfViewerScreenContent.tsx",
  ];

  for (const file of EXPECTED_FILES) {
    it(`${file} exists`, () => {
      expect(existsSync(join(PDF_LIB, file))).toBe(true);
    });
  }
});

describe("B1: pdf-viewer.tsx composes extracted modules", () => {
  it("imports constants from pdfViewer.constants", () => {
    expect(viewerSource).toContain("pdfViewer.constants");
    expect(viewerSource).toContain("FALLBACK_ROUTE");
  });

  it("imports styles from pdfViewer.styles", () => {
    expect(viewerSource).toContain("pdfViewer.styles");
  });

  it("imports helpers from pdfViewer.helpers", () => {
    expect(viewerSource).toContain("pdfViewer.helpers");
    expect(viewerSource).toContain("getUriScheme");
    expect(viewerSource).toContain("inspectLocalPdfFile");
  });

  it("imports actions hook from usePdfViewerActions", () => {
    expect(viewerSource).toContain("usePdfViewerActions");
  });

  it("imports contract helpers from pdfViewerContract", () => {
    expect(viewerSource).toContain("pdfViewerContract");
    expect(viewerSource).toContain("getReadAccessParentUri");
  });

  it("imports route parsing from pdfViewer.route", () => {
    expect(viewerSource).toContain("pdfViewer.route");
    expect(viewerSource).toContain("resolvePdfViewerRouteModel");
    expect(viewerSource).toContain("resolvePdfViewerSnapshot");
  });

  it("imports readiness mapping from pdfViewer.readiness", () => {
    expect(viewerSource).toContain("pdfViewer.readiness");
    expect(viewerSource).toContain("resolvePdfViewerReadinessModel");
    expect(viewerSource).toContain("resolvePdfViewerContentModel");
    expect(viewerSource).toContain("resolvePdfViewerChromeModel");
  });

  it("imports handoff planning from pdfViewer.handoffPlan", () => {
    expect(viewerSource).toContain("pdfViewer.handoffPlan");
    expect(viewerSource).toContain("resolvePdfViewerHandoffPlan");
    expect(viewerSource).toContain("resolvePdfViewerManualHandoffPlan");
  });

  it("imports error normalization from pdfViewer.error", () => {
    expect(viewerSource).toContain("pdfViewer.error");
    expect(viewerSource).toContain("normalizePdfViewerError");
  });

  it("imports native webview loading from pdfViewer.nativeWebView", () => {
    expect(viewerSource).toContain("pdfViewer.nativeWebView");
    expect(viewerSource).toContain("resolvePdfViewerNativeWebView");
  });

  it("imports render lifecycle and guard helpers", () => {
    expect(viewerSource).toContain("pdfViewerRenderLifecycle");
    expect(viewerSource).toContain("createPdfViewerRenderInstanceKey");
    expect(viewerSource).toContain("pdfViewerRenderEventGuard");
    expect(viewerSource).toContain("shouldCommitPdfViewerRenderEvent");
  });

  it("imports loading timeout and open-signal planning", () => {
    expect(viewerSource).toContain("pdfViewerLoadingTimeoutGuard");
    expect(viewerSource).toContain("armPdfViewerLoadingTimeout");
    expect(viewerSource).toContain("pdfViewerOpenSignalPlan");
    expect(viewerSource).toContain("resolvePdfViewerOpenVisibleSignalPlan");
    expect(viewerSource).toContain("resolvePdfViewerOpenFailedSignalPlan");
  });

  it("imports crash breadcrumbs, critical path, native handoff, and open flow boundaries", () => {
    expect(viewerSource).toContain("pdfCrashBreadcrumbs");
    expect(viewerSource).toContain("pdfCriticalPath");
    expect(viewerSource).toContain("pdfNativeHandoffGuard");
    expect(viewerSource).toContain("pdfNativeHandoffPlan");
    expect(viewerSource).toContain("pdfOpenFlow");
  });

  it("imports the extracted orchestrator and presenter", () => {
    expect(viewerSource).toContain("usePdfViewerOrchestrator");
    expect(viewerSource).toContain("PdfViewerScreenContent");
  });
});

describe("B1: no duplicate viewer definitions remain inline", () => {
  it("does not re-declare viewer constants in the screen", () => {
    expect(viewerSource).not.toMatch(/const VIEWER_BG\s*=/);
    expect(viewerSource).not.toMatch(/const VIEWER_TEXT\s*=/);
    expect(viewerSource).not.toMatch(/const FALLBACK_ROUTE\s*=/);
  });

  it("does not re-declare styles inline", () => {
    expect(viewerSource).not.toContain("StyleSheet.create");
  });

  it("does not re-declare route/readiness/handoff helpers inline", () => {
    expect(viewerSource).not.toMatch(/function resolvePdfViewerRouteModel/);
    expect(viewerSource).not.toMatch(/function resolvePdfViewerReadinessModel/);
    expect(viewerSource).not.toMatch(/function resolvePdfViewerHandoffPlan/);
    expect(viewerSource).not.toMatch(/function normalizePdfViewerError/);
  });
});

describe("B1: orchestrator keeps side effects while decision logic is extracted", () => {
  it("keeps syncSnapshot in the viewer", () => {
    expect(viewerSource).toContain("const syncSnapshot");
  });

  it("keeps markError in the viewer", () => {
    expect(viewerSource).toContain("const markError");
  });

  it("keeps markReady in the viewer", () => {
    expect(viewerSource).toContain("const markReady");
  });

  it("keeps enterLoading in the viewer", () => {
    expect(viewerSource).toContain("const enterLoading");
  });

  it("keeps clearLoadingTimeout in the viewer", () => {
    expect(viewerSource).toContain("const clearLoadingTimeout");
  });

  it("keeps handoffPdfPreview in the viewer", () => {
    expect(viewerSource).toContain("const handoffPdfPreview");
  });

  it("keeps prepareViewer bootstrap effect in the viewer", () => {
    expect(viewerSource).toContain("const prepareViewer");
  });

  it("delegates route parsing to the pure route module", () => {
    expect(viewerSource).toContain("const route = React.useMemo(");
    expect(viewerSource).toContain("resolvePdfViewerRouteModel({");
    expect(viewerSource).toContain("resolvePdfViewerSnapshot({");
  });

  it("delegates readiness and render-state mapping to the pure readiness module", () => {
    expect(viewerSource).toContain("resolvePdfViewerReadinessModel({");
    expect(viewerSource).toContain("resolvePdfViewerContentModel({");
    expect(viewerSource).toContain("resolvePdfViewerChromeModel({");
  });

  it("delegates bootstrap handoff decisions to the handoff planning module", () => {
    expect(viewerSource).toContain("const handoffPlan = resolvePdfViewerHandoffPlan({");
    expect(viewerSource).toContain("resolvePdfViewerManualHandoffPlan({");
  });

  it("delegates error normalization to the error module", () => {
    expect(viewerSource).toContain("normalizePdfViewerError({");
  });

  it("delegates local state ownership to usePdfViewerOrchestrator", () => {
    expect(viewerSource).toContain("const orchestrator = usePdfViewerOrchestrator");
    expect(viewerSource).toContain("planPdfViewerLoadingTransition");
    expect(viewerSource).toContain("planPdfViewerTimeoutTransition");
  });

  it("delegates presenter rendering outside the screen orchestrator", () => {
    expect(viewerSource).toContain("<PdfViewerScreenContent");
    expect(viewerSource).not.toContain("<PdfViewerNativeShell");
    expect(viewerSource).not.toContain("<PdfViewerWebShell");
    expect(viewerSource).not.toContain("<iframe");
  });
});

describe("B1: pdfDocumentActions.ts exports are stable", () => {
  const EXPECTED_EXPORTS = [
    "getPdfFlowErrorMessage",
    "preparePdfDocument",
    "previewPdfDocument",
    "sharePdfDocument",
    "prepareAndPreviewPdfDocument",
    "openPdfDocumentExternal",
  ];

  for (const name of EXPECTED_EXPORTS) {
    it(`exports ${name}`, () => {
      const hasAsync = actionsSource.includes(`export async function ${name}`);
      const hasSync = actionsSource.includes(`export function ${name}`);
      expect(hasAsync || hasSync).toBe(true);
    });
  }

  it("pdfDocumentActions keeps the same public export count", () => {
    expect(EXPECTED_EXPORTS).toHaveLength(6);
  });
});

describe("B1: extracted module test coverage exists", () => {
  const EXPECTED_TEST_FILES = [
    "pdfViewer.extraction.test.ts",
    "pdfViewerContract.test.ts",
    "pdfViewerRenderLifecycle.test.ts",
    "pdfViewerRenderEventGuard.test.ts",
    "pdfViewerWebRenderUriCleanup.test.ts",
    "pdfViewerLoadingTimeoutGuard.test.ts",
    "pdfViewerBootstrapPlan.test.ts",
    "pdfNativeHandoffGuard.test.ts",
    "pdfCrashBreadcrumbs.test.ts",
    "pdfCriticalPath.test.ts",
    "pdfSourceValidation.test.ts",
    "usePdfViewerActions.test.ts",
    "pdfLayerDecomposition.test.ts",
  ];

  for (const file of EXPECTED_TEST_FILES) {
    it(`test file ${file} exists`, () => {
      expect(existsSync(join(PDF_LIB, file))).toBe(true);
    });
  }

  const EXPECTED_ROUTE_TEST_FILES = [
    "usePdfViewerOrchestrator.test.ts",
    "PdfViewerShells.test.tsx",
    "PdfViewerScreenContent.test.tsx",
    "pdfViewer.route.test.ts",
    "pdfViewer.readiness.test.ts",
    "pdfViewer.handoffPlan.test.ts",
    "pdfViewer.error.test.ts",
  ];

  for (const file of EXPECTED_ROUTE_TEST_FILES) {
    it(`test file ${file} exists`, () => {
      expect(existsSync(join(TESTS_PDF, file))).toBe(true);
    });
  }
});
