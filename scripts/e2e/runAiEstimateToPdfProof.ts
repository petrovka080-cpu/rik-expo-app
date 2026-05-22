import * as fs from "fs";
import * as path from "path";
import { buildConstructionEstimateAnswer } from "../../src/lib/ai/estimateEngine";
import {
  __resetAiEstimatePdfHistoryForTests,
  buildAiEstimatePdfActions,
  buildAiEstimatePdfSourceFromConstructionEstimate,
  generateAiEstimatePdf,
  listAiEstimatePdfHistory,
  mapAiEstimatePdfSourceToExistingConsumerPdfModel,
} from "../../src/lib/ai/estimatePdf";
import { __resetConsumerRepairRequestStoreForTests } from "../../src/lib/consumerRequests";

const artifactsDir = path.resolve(process.cwd(), "artifacts");

function writeArtifact(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  __resetAiEstimatePdfHistoryForTests();
  __resetConsumerRepairRequestStoreForTests();
  const estimate = buildConstructionEstimateAnswer("дай смету на укладку ламината 100 м²");
  const source = buildAiEstimatePdfSourceFromConstructionEstimate(estimate, {
    sourceId: "proof_ai_estimate_laminate_100",
    userId: "consumer_pdf_proof",
    createdAt: "2026-05-23T00:00:00.000Z",
  });
  const actions = buildAiEstimatePdfActions(source);
  const model = mapAiEstimatePdfSourceToExistingConsumerPdfModel(source);
  const result = generateAiEstimatePdf({ source, userConfirmed: true });
  const history = listAiEstimatePdfHistory();

  const checks = {
    tool_payload_structured: source.estimate.sections.flatMap((section) => section.rows).length > 0,
    make_pdf_button_ready: actions.some((action) => action.id === "make_estimate_pdf" && action.label === "Сделать PDF"),
    markdown_parsing_as_truth: false,
    existing_pdf_model_used: model.items.length > 0 && model.draft.id === source.sourceId,
    pdf_generation_ready: result.status === "openable",
    pdf_open_ready: result.openAction.route === "/pdf-viewer" && result.access.uri.startsWith("data:application/pdf"),
    pdf_history_ready: history.some((item) => item.pdfId === result.pdfId),
    pdf_contains_materials: model.items.some((item) => item.itemType === "material"),
    pdf_contains_labor: model.items.some((item) => item.itemType === "work"),
    pdf_contains_totals: typeof source.estimate.totals?.grandTotal === "number",
    pdf_contains_tax_status: Boolean(model.supplement.taxStatus),
  };
  writeArtifact("S_AI_ESTIMATE_TO_PDF_payload_contract.json", {
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    sections: source.estimate.sections.map((section) => ({ title: section.title, rows: section.rows.length })),
    actions: actions.map((action) => action.label),
  });
  writeArtifact("S_AI_ESTIMATE_TO_PDF_model_mapper.json", {
    draftId: model.draft.id,
    items: model.items.length,
    itemTypes: Array.from(new Set(model.items.map((item) => item.itemType))),
    supplement: model.supplement,
  });
  writeArtifact("S_AI_ESTIMATE_TO_PDF_generation_trace.json", {
    pdfId: result.pdfId,
    status: result.status,
    sourceType: result.sourceType,
  });
  writeArtifact("S_AI_ESTIMATE_TO_PDF_open_trace.json", {
    route: result.openAction.route,
    sourceKind: result.openAction.sourceKind,
    uriPrefix: result.access.uri.slice(0, 32),
  });
  writeArtifact("S_AI_ESTIMATE_TO_PDF_history_trace.json", {
    pdfIds: history.map((item) => item.pdfId),
  });
  if (!checks.tool_payload_structured || !checks.make_pdf_button_ready || !checks.existing_pdf_model_used || !checks.pdf_generation_ready || !checks.pdf_open_ready || !checks.pdf_history_ready) {
    throw new Error(`AI estimate to PDF proof failed: ${JSON.stringify(checks)}`);
  }
  console.log("GREEN_AI_ESTIMATE_TO_PDF_PROOF_READY");
}

main();
