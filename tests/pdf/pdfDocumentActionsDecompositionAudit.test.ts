import { existsSync, readFileSync } from "fs";
import { join } from "path";

const DOCS_LIB = join(__dirname, "..", "..", "src", "lib", "documents");
const ACTIONS_PATH = join(DOCS_LIB, "pdfDocumentActions.ts");

const actionsSource = readFileSync(ACTIONS_PATH, "utf8");

describe("B2: extracted document action owner-boundary files exist", () => {
  const EXPECTED_FILES = [
    "pdfDocumentActionTypes.ts",
    "pdfDocumentActionPreconditions.ts",
    "pdfDocumentActionError.ts",
    "pdfDocumentActionPlan.ts",
    "pdfDocumentPrepareAction.ts",
    "pdfDocumentPreviewAction.ts",
    "pdfDocumentShareAction.ts",
    "pdfDocumentExternalOpenAction.ts",
  ];

  for (const file of EXPECTED_FILES) {
    it(`${file} exists`, () => {
      expect(existsSync(join(DOCS_LIB, file))).toBe(true);
    });
  }
});

describe("B2: pdfDocumentActions keeps the same public contract", () => {
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
});

describe("B2: pdfDocumentActions is reduced to orchestration ownership", () => {
  it("imports the extracted pure and execution layers", () => {
    expect(actionsSource).toContain("pdfDocumentActionPreconditions");
    expect(actionsSource).toContain("pdfDocumentActionError");
    expect(actionsSource).toContain("pdfDocumentPrepareAction");
    expect(actionsSource).toContain("pdfDocumentPreviewAction");
    expect(actionsSource).toContain("pdfDocumentShareAction");
    expect(actionsSource).toContain("pdfDocumentExternalOpenAction");
  });

  it("keeps inflight and visibility orchestration in the public entrypoint", () => {
    expect(actionsSource).toContain("const activePreviewFlows = new Map");
    expect(actionsSource).toContain("const activePreviewFlowTimestamps = new Map");
    expect(actionsSource).toContain("const latestPreviewRunByKey = new Map");
    expect(actionsSource).toContain("function nextPdfActionRunId()");
    expect(actionsSource).toContain("function assertCurrentPdfActionRun");
    expect(actionsSource).toContain("function persistCriticalPdfBreadcrumb");
    expect(actionsSource).toContain("export async function prepareAndPreviewPdfDocument");
    expect(actionsSource).toContain("resolvePdfDocumentOpenFlowStartPlan");
    expect(actionsSource).toContain("resolvePdfDocumentVisibilityStartPlan");
    expect(actionsSource).toContain("beginPdfOpenVisibilityWait");
    expect(actionsSource).toContain("await previewPdfDocument");
    expect(actionsSource).toContain("resolvePdfDocumentBusyExecutionPlan");
  });

  it("does not inline the extracted execution logic anymore", () => {
    expect(actionsSource).not.toContain("preparePdfExecutionSource(");
    expect(actionsSource).not.toContain("createDocumentPreviewSession(");
    expect(actionsSource).not.toContain("createInMemoryDocumentPreviewSession(");
    expect(actionsSource).not.toContain("openPdfPreview(");
    expect(actionsSource).not.toContain("openPdfShare(");
    expect(actionsSource).not.toContain("openPdfExternal(");
    expect(actionsSource).not.toContain("checkPdfMobilePreviewEligibility(");
    expect(actionsSource).not.toContain("recordPdfPreviewOversizeBlocked(");
    expect(actionsSource).not.toContain("beginPdfLifecycleObservation({");
  });
});
