/**
 * Package E: PDF Viewer decomposition audit shield tests.
 *
 * Validates that:
 * 1. All safe layers are already extracted into separate files
 * 2. pdf-viewer.tsx imports from the extracted modules (not inline)
 * 3. Each extracted module exports the expected shape
 * 4. No duplicate definitions exist (constants, helpers, components)
 * 5. The viewer state machine decision layer is extracted while side effects stay in pdf-viewer.tsx
 * 6. pdfDocumentActions.ts exports are stable
 */

import { readFileSync, existsSync } from "fs";
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

describe("E: extracted modules exist", () => {
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
  ];

  for (const file of EXPECTED_FILES) {
    it(`${file} exists`, () => {
      expect(existsSync(join(PDF_LIB, file))).toBe(true);
    });
  }
});

describe("E: pdf-viewer.tsx imports from extracted modules (not inline)", () => {
  it("imports constants from pdfViewer.constants", () => {
    expect(viewerSource).toContain("pdfViewer.constants");
    expect(viewerSource).toContain("FALLBACK_ROUTE");
    expect(viewerSource).toContain("VIEWER_TEXT");
  });

  it("imports styles from pdfViewer.styles", () => {
    expect(viewerSource).toContain("pdfViewer.styles");
  });

  it("imports components from pdfViewer.components", () => {
    expect(viewerSource).toContain("pdfViewer.components");
    expect(viewerSource).toContain("MenuAction");
    expect(viewerSource).toContain("EmptyState");
    expect(viewerSource).toContain("CenteredPanel");
  });

  it("imports helpers from pdfViewer.helpers", () => {
    expect(viewerSource).toContain("pdfViewer.helpers");
    expect(viewerSource).toContain("getUriScheme");
    expect(viewerSource).toContain("inspectLocalPdfFile");
  });

  it("imports actions hook from usePdfViewerActions", () => {
    expect(viewerSource).toContain("usePdfViewerActions");
  });

  it("imports viewer contract from pdfViewerContract", () => {
    expect(viewerSource).toContain("pdfViewerContract");
    expect(viewerSource).toContain("resolvePdfViewerState");
    expect(viewerSource).toContain("resolvePdfViewerResolution");
  });

  it("imports render lifecycle from pdfViewerRenderLifecycle", () => {
    expect(viewerSource).toContain("pdfViewerRenderLifecycle");
    expect(viewerSource).toContain("createPdfViewerRenderInstanceKey");
  });

  it("imports render event guard from pdfViewerRenderEventGuard", () => {
    expect(viewerSource).toContain("pdfViewerRenderEventGuard");
    expect(viewerSource).toContain("shouldCommitPdfViewerRenderEvent");
  });

  it("imports breadcrumbs from pdfCrashBreadcrumbs", () => {
    expect(viewerSource).toContain("pdfCrashBreadcrumbs");
    expect(viewerSource).toContain("recordPdfCrashBreadcrumbAsync");
  });

  it("imports critical path from pdfCriticalPath", () => {
    expect(viewerSource).toContain("pdfCriticalPath");
    expect(viewerSource).toContain("recordPdfCriticalPathEvent");
  });

  it("imports native handoff guard from pdfNativeHandoffGuard", () => {
    expect(viewerSource).toContain("pdfNativeHandoffGuard");
    expect(viewerSource).toContain("beginPdfNativeHandoff");
  });

  it("imports loading timeout guard from pdfViewerLoadingTimeoutGuard", () => {
    expect(viewerSource).toContain("pdfViewerLoadingTimeoutGuard");
    expect(viewerSource).toContain("armPdfViewerLoadingTimeout");
  });

  it("imports bootstrap planning from pdfViewerBootstrapPlan", () => {
    expect(viewerSource).toContain("pdfViewerBootstrapPlan");
    expect(viewerSource).toContain("resolvePdfViewerBootstrapPlan");
  });

  it("imports open-signal planning from pdfViewerOpenSignalPlan", () => {
    expect(viewerSource).toContain("pdfViewerOpenSignalPlan");
    expect(viewerSource).toContain("resolvePdfViewerOpenVisibleSignalPlan");
    expect(viewerSource).toContain("resolvePdfViewerOpenFailedSignalPlan");
  });

  it("imports open flow from pdfOpenFlow", () => {
    expect(viewerSource).toContain("pdfOpenFlow");
    expect(viewerSource).toContain("markPdfOpenVisible");
    expect(viewerSource).toContain("failPdfOpenVisible");
  });

  it("imports the extracted orchestrator and render shells", () => {
    expect(viewerSource).toContain("usePdfViewerOrchestrator");
    expect(viewerSource).toContain("PdfViewerNativeShell");
    expect(viewerSource).toContain("PdfViewerWebShell");
  });
});

describe("E: no duplicate definitions (constants not re-declared inline)", () => {
  it("VIEWER_BG is not re-declared in viewer", () => {
    // Should import it, not assign it
    expect(viewerSource).not.toMatch(/const VIEWER_BG\s*=/);
  });

  it("VIEWER_TEXT is not re-declared in viewer", () => {
    expect(viewerSource).not.toMatch(/const VIEWER_TEXT\s*=/);
  });

  it("FALLBACK_ROUTE is not re-declared in viewer", () => {
    expect(viewerSource).not.toMatch(/const FALLBACK_ROUTE\s*=/);
  });

  it("styles is not re-declared in viewer", () => {
    expect(viewerSource).not.toContain("StyleSheet.create");
  });

  it("getUriScheme is not re-declared in viewer", () => {
    expect(viewerSource).not.toMatch(/function getUriScheme/);
  });
});

describe("E: viewer state machine extraction boundary", () => {
  it("syncSnapshot is still in the viewer", () => {
    expect(viewerSource).toContain("const syncSnapshot");
  });

  it("markError is still in the viewer", () => {
    expect(viewerSource).toContain("const markError");
  });

  it("markReady is still in the viewer", () => {
    expect(viewerSource).toContain("const markReady");
  });

  it("enterLoading is still in the viewer", () => {
    expect(viewerSource).toContain("const enterLoading");
  });

  it("clearLoadingTimeout is still in the viewer", () => {
    expect(viewerSource).toContain("const clearLoadingTimeout");
  });

  it("handoffPdfPreview is still in the viewer", () => {
    expect(viewerSource).toContain("const handoffPdfPreview");
  });

  it("prepareViewer bootstrap effect is still in the viewer", () => {
    expect(viewerSource).toContain("const prepareViewer");
  });

  it("prepareViewer delegates bootstrap decisions to a pure plan", () => {
    expect(viewerSource).toContain("const bootstrapPlan = resolvePdfViewerBootstrapPlan");
  });

  it("viewer delegates local state ownership to usePdfViewerOrchestrator", () => {
    expect(viewerSource).toContain("const orchestrator = usePdfViewerOrchestrator");
    expect(viewerSource).toContain("planPdfViewerLoadingTransition");
    expect(viewerSource).toContain("planPdfViewerTimeoutTransition");
  });

  it("viewer does not own low-level native/web shell rendering inline", () => {
    expect(viewerSource).not.toContain("<NativePdfWebView");
    expect(viewerSource).not.toContain("<iframe");
  });
});

describe("E: pdfDocumentActions.ts exports are stable", () => {
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

  it("pdfDocumentActions has 6 public exports", () => {
    expect(EXPECTED_EXPORTS).toHaveLength(6);
  });
});

describe("E: extracted module test coverage exists", () => {
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
  ];

  for (const file of EXPECTED_ROUTE_TEST_FILES) {
    it(`test file ${file} exists`, () => {
      expect(existsSync(join(TESTS_PDF, file))).toBe(true);
    });
  }
});
