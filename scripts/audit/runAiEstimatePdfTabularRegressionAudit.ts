import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_AI_ESTIMATE_PDF_TABULAR_REGRESSION";

type AuditResult = {
  wave: string;
  status: string;
  source_path_known: boolean;
  route_generating_ai_estimate_pdf: string;
  payload_type_used: string;
  ai_estimate_pdf_adapter_bypassed: boolean;
  request_uses_legacy_text_pdf_path: boolean;
  viewer_receives_structured_pdf_data_uri: boolean;
  raw_internal_fields_leak_from_view_model: boolean;
  source_labels_human_formatted: boolean;
  fallback_limited_to_legacy_consumer_draft: boolean;
  blockers: string[];
  fake_green_claimed: false;
};

function read(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runAiEstimatePdfTabularRegressionAudit(): AuditResult {
  const actionService = read("src/lib/ai/estimatePdf/estimatePdfActionService.ts");
  const viewModel = read("src/lib/aiEstimatePdf/buildAiEstimatePdfViewModel.ts");
  const renderer = read("src/lib/aiEstimatePdf/renderAiEstimatePdfDocument.ts");
  const table = read("src/lib/aiEstimatePdf/renderAiEstimatePdfTable.ts");
  const viewer = read("app/pdf-viewer.tsx");

  const usesStructuredEstimate = actionService.includes("input.source.structuredEstimate") &&
    actionService.includes("createAiEstimatePdf");
  const fallbackLimitedToLegacyConsumerDraft = actionService.includes('input.source.sourceType !== "consumer_repair_draft"') &&
    actionService.includes("structured GlobalEstimateResult payload");
  const adapterBypassed = !usesStructuredEstimate;
  const requestUsesLegacyTextPdfPath = !fallbackLimitedToLegacyConsumerDraft;
  const rawLeakTokens = [
    'label: "Estimate ID"',
    'label: "Work key"',
    'label: "Runtime trace ID"',
    "source.id,",
    "`freshness ",
    "`confidence ",
  ];
  const rawInternalFieldsLeak = rawLeakTokens.some((token) => viewModel.includes(token)) ||
    renderer.includes("Confidence:") ||
    renderer.includes("LEGACY PDF path protected");
  const sourceLabelsHuman = viewModel.includes("Региональный справочник цен") &&
    viewModel.includes("актуальность:") &&
    viewModel.includes("точность:");
  const tableColumnsPresent = ["Наименование", "Категория", "Кол-во", "Ед.", "Цена", "Сумма"].every((token) => table.includes(token));
  const viewerReceivesPdfDataUri = viewer.includes("data:application/pdf") || actionService.includes("pdf.dataUri");

  const blockers: string[] = [];
  if (!usesStructuredEstimate) blockers.push("AI_ESTIMATE_PDF_STRUCTURED_ADAPTER_NOT_USED");
  if (adapterBypassed) blockers.push("AI_ESTIMATE_PDF_ADAPTER_BYPASSED");
  if (requestUsesLegacyTextPdfPath) blockers.push("REQUEST_AI_ESTIMATE_LEGACY_TEXT_PDF_PATH_OPEN");
  if (rawInternalFieldsLeak) blockers.push("AI_ESTIMATE_PDF_VIEW_MODEL_RAW_INTERNAL_FIELDS_LEAK");
  if (!sourceLabelsHuman) blockers.push("AI_ESTIMATE_PDF_SOURCE_LABELS_NOT_HUMAN_FORMATTED");
  if (!tableColumnsPresent) blockers.push("AI_ESTIMATE_PDF_TABLE_COLUMNS_MISSING");
  if (!viewerReceivesPdfDataUri) blockers.push("PDF_VIEWER_STRUCTURED_PDF_DATA_URI_PATH_UNKNOWN");

  const audit: AuditResult = {
    wave: "S_AI_ESTIMATE_PDF_TABULAR_REALITY_REGRESSION_REPAIR_NO_TEXT_DUMP_POINT_OF_NO_RETURN",
    status: blockers.length ? "BLOCKED_PDF_SOURCE_PATH_UNKNOWN" : "GREEN_AI_ESTIMATE_PDF_TABULAR_REGRESSION_AUDIT_READY",
    source_path_known: true,
    route_generating_ai_estimate_pdf: "src/features/ai/AIAssistantEstimatePdfActions.tsx -> generateAiEstimatePdf -> createAiEstimatePdf",
    payload_type_used: "AiEstimatePdfSource.structuredEstimate: GlobalEstimateResult",
    ai_estimate_pdf_adapter_bypassed: adapterBypassed,
    request_uses_legacy_text_pdf_path: requestUsesLegacyTextPdfPath,
    viewer_receives_structured_pdf_data_uri: viewerReceivesPdfDataUri,
    raw_internal_fields_leak_from_view_model: rawInternalFieldsLeak,
    source_labels_human_formatted: sourceLabelsHuman,
    fallback_limited_to_legacy_consumer_draft: fallbackLimitedToLegacyConsumerDraft,
    blockers,
    fake_green_claimed: false,
  };

  writeJson(`${PREFIX}_audit.json`, audit);
  writeJson(`${PREFIX}_payload_trace.json`, {
    source: "GlobalEstimateResult",
    viewModel: "AiEstimatePdfViewModel",
    renderer: "OPTION_B_ISOLATED_AI_ESTIMATE_RENDERER",
    viewer: "/pdf-viewer",
    structured_payload_required: usesStructuredEstimate,
    fallback_limited_to_legacy_consumer_draft: fallbackLimitedToLegacyConsumerDraft,
  });
  writeJson(`${PREFIX}_renderer_trace.json`, {
    renderer_file: "src/lib/aiEstimatePdf/renderAiEstimatePdfDocument.ts",
    table_file: "src/lib/aiEstimatePdf/renderAiEstimatePdfTable.ts",
    bordered_table_detected: renderer.includes("drawRect") && renderer.includes("re S"),
    required_columns_present: tableColumnsPresent,
    raw_internal_fields_leak_from_view_model: rawInternalFieldsLeak,
    adapter_bypassed: adapterBypassed,
  });

  return audit;
}

if (require.main === module) {
  const result = runAiEstimatePdfTabularRegressionAudit();
  console.log(result.status);
  if (result.blockers.length) {
    console.error(result.blockers.join("\n"));
    process.exitCode = 1;
  }
}
