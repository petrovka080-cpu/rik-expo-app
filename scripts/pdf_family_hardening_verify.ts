import fs from "node:fs";
import path from "node:path";

type JestAssertion = {
  fullName: string;
  status: string;
};

type JestSuite = {
  assertionResults?: JestAssertion[];
};

type JestReport = {
  success: boolean;
  numFailedTests: number;
  numPassedTests: number;
  testResults?: JestSuite[];
};

const root = process.cwd();

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const readJson = <T,>(relativePath: string): T =>
  JSON.parse(readText(relativePath)) as T;

const writeJson = (relativePath: string, value: unknown) => {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const targetFiles = {
  pdfRunner: "src/lib/pdfRunner.ts",
  pdfDocumentActions: "src/lib/documents/pdfDocumentActions.ts",
  pdfHtmlRunner: "src/lib/pdf/pdf.runner.ts",
  paymentSource: "src/lib/api/paymentPdf.service.ts",
  directorSource: "src/lib/api/directorPdfSource.service.ts",
  viewer: "app/pdf-viewer.tsx",
  viewerContract: "src/lib/pdf/pdfViewerContract.ts",
  lifecycle: "src/lib/pdf/pdfLifecycle.ts",
};

const fileContents = Object.fromEntries(
  Object.entries(targetFiles).map(([key, relativePath]) => [key, readText(relativePath)]),
) as Record<keyof typeof targetFiles, string>;

const hasNoSilentCatch = (source: string) => !/catch\s*\{\s*\}/.test(source);
const has = (source: string, token: string) => source.includes(token);

const jestReport = readJson<JestReport>("artifacts/pdf-family-jest.json");
const assertions = (jestReport.testResults ?? []).flatMap((suite) => suite.assertionResults ?? []);
const passed = (needle: string) =>
  assertions.some((assertion) => assertion.status === "passed" && assertion.fullName.includes(needle));

const failureClassification = {
  source_load: "source_load_fail",
  data_shaping: "shape_fail",
  template: "template_fail",
  render: "render_fail",
  output_prepare: "output_fail",
  open_view: "open_fail",
} as const;

const stageInventory = {
  source_load: [
    "src/lib/api/directorPdfSource.service.ts",
    "src/lib/api/paymentPdf.service.ts",
  ],
  data_shaping: [
    "src/lib/api/pdf_director.data.ts",
    "src/lib/api/paymentPdf.service.ts",
  ],
  template: [
    "src/lib/pdf/pdf.runner.ts",
  ],
  render: [
    "src/lib/pdf/pdf.runner.ts",
    "src/lib/api/directorPdfRender.service.ts",
  ],
  output_prepare: [
    "src/lib/documents/pdfDocumentActions.ts",
    "src/lib/pdfRunner.ts",
  ],
  open_view: [
    "src/lib/documents/pdfDocumentActions.ts",
    "app/pdf-viewer.tsx",
  ],
};

const stageChecks = {
  templateStageSeparated:
    has(fileContents.pdfHtmlRunner, 'stage: "template"')
    && has(fileContents.pdfHtmlRunner, 'event: "pdf_template_prepare"'),
  renderStageSeparated:
    has(fileContents.pdfHtmlRunner, 'stage: "render"')
    && has(fileContents.pdfHtmlRunner, 'event: "pdf_render_execute"'),
  sourceStageSeparated:
    has(fileContents.paymentSource, 'stage: "source_load"')
    && has(fileContents.directorSource, 'stage: "source_load"'),
  shapingStageSeparated:
    has(fileContents.paymentSource, 'stage: "data_shaping"'),
  outputStageSeparated:
    has(fileContents.pdfDocumentActions, 'stage: "output_prepare"')
    && has(fileContents.pdfRunner, 'event: "pdf_runner_output_prepare"'),
  openStageSeparated:
    has(fileContents.pdfDocumentActions, 'stage: "open_view"')
    && has(fileContents.pdfRunner, 'event: "pdf_runner_open_view"')
    && has(fileContents.viewer, "resolvePdfViewerResolution"),
};

const sourceBoundaryChecks = {
  paymentPdfRpcOnly:
    !has(fileContents.paymentSource, "legacy_fallback")
    && !has(fileContents.paymentSource, "get_payment_order_data")
    && !has(fileContents.paymentSource, "proposal_payment_allocations"),
  directorPdfSourceRpcOnly:
    !has(fileContents.directorSource, "legacy_fallback")
    && !has(fileContents.directorSource, "buildDirectorFinancePdfFallbackSource")
    && !has(fileContents.directorSource, "buildDirectorProductionPdfFallbackSource")
    && !has(fileContents.directorSource, "buildDirectorSubcontractPdfFallbackSource"),
};

const silentCatchChecks = {
  pdfRunner: hasNoSilentCatch(fileContents.pdfRunner),
  pdfDocumentActions: hasNoSilentCatch(fileContents.pdfDocumentActions),
  pdfHtmlRunner: hasNoSilentCatch(fileContents.pdfHtmlRunner),
  paymentSource: hasNoSilentCatch(fileContents.paymentSource),
  directorSource: hasNoSilentCatch(fileContents.directorSource),
  viewer: hasNoSilentCatch(fileContents.viewer),
};

const scenarioChecks = {
  directorProductionPdfWorks: passed("Director production PDF works through source -> shaping -> render"),
  directorFinancePdfWorks: passed("Director finance PDF works through source -> shaping -> render"),
  paymentPdfWorks: passed("loads payment PDF source from canonical rpc only"),
  sourceFailVisible:
    passed("surfaces source load failure for Director production PDF")
    && passed("hard-fails and stays rpc-only when canonical rpc errors"),
  renderFailVisible: passed("Render fail is visible during HTML PDF render"),
  openFailVisible:
    passed("Open fail is visible during direct preview fallback")
    && passed("does not fail silently when popup open is blocked on web"),
  viewerRemoteUrlWorks: passed("Viewer opens remote-url through the embedded contract"),
  noSilentFail: Object.values(silentCatchChecks).every(Boolean),
};

const observabilityChecks = {
  lifecycleHelperPresent:
    has(fileContents.lifecycle, "beginPdfLifecycleObservation")
    && has(fileContents.lifecycle, "PdfLifecycleError"),
  viewerUsesSharedContract:
    has(fileContents.viewer, 'from "../src/lib/pdf/pdfViewerContract"'),
  documentActionsObservable:
    has(fileContents.pdfDocumentActions, 'event: "pdf_output_prepare"')
    && has(fileContents.pdfDocumentActions, 'event: "pdf_preview_open"'),
  runnerObservable:
    has(fileContents.pdfRunner, 'event: "pdf_runner_source_load"')
    && has(fileContents.pdfRunner, 'event: "pdf_runner_open_view"'),
  sourceServicesObservable:
    has(fileContents.paymentSource, 'event: "payment_pdf_source_load"')
    && has(fileContents.directorSource, 'event: "director_finance_pdf_source_load"')
    && has(fileContents.directorSource, 'event: "director_production_pdf_source_load"'),
};

const green =
  jestReport.success === true
  && jestReport.numFailedTests === 0
  && Object.values(stageChecks).every(Boolean)
  && Object.values(sourceBoundaryChecks).every(Boolean)
  && Object.values(silentCatchChecks).every(Boolean)
  && Object.values(scenarioChecks).every(Boolean)
  && Object.values(observabilityChecks).every(Boolean);

writeJson("artifacts/pdf-family-hardening-summary.json", {
  status: green ? "passed" : "failed",
  gate: green ? "GREEN" : "NOT_GREEN",
  inventory: stageInventory,
  checks: {
    jest: {
      success: jestReport.success,
      numPassedTests: jestReport.numPassedTests,
      numFailedTests: jestReport.numFailedTests,
    },
    stageChecks,
    sourceBoundaryChecks,
    silentCatchChecks,
    scenarioChecks,
    observabilityChecks,
  },
});

writeJson("artifacts/pdf-failure-classification.json", {
  status: green ? "passed" : "failed",
  failureClassification,
  classificationCoverage: {
    lifecycleHelperDefined: has(fileContents.lifecycle, "const PDF_FAILURE_BY_STAGE"),
    sourceLoadObserved: stageChecks.sourceStageSeparated,
    templateObserved: stageChecks.templateStageSeparated,
    renderObserved: stageChecks.renderStageSeparated,
    outputObserved: stageChecks.outputStageSeparated,
    openObserved: stageChecks.openStageSeparated,
  },
});

writeJson("artifacts/pdf-runner-observability-proof.json", {
  status: green ? "passed" : "failed",
  proof: {
    runnerEvents: [
      "pdf_runner_source_load",
      "pdf_runner_output_prepare",
      "pdf_runner_open_view",
    ],
    documentActionEvents: [
      "pdf_output_prepare",
      "pdf_preview_output_prepare",
      "pdf_preview_open",
      "pdf_share_open",
      "pdf_external_open",
    ],
    passedTests: assertions
      .filter((assertion) => assertion.status === "passed")
      .map((assertion) => assertion.fullName),
  },
});

console.log(
  JSON.stringify(
    {
      gate: green ? "GREEN" : "NOT_GREEN",
      scenarios: scenarioChecks,
      stageChecks,
      sourceBoundaryChecks,
    },
    null,
    2,
  ),
);

if (!green) {
  process.exitCode = 1;
}
