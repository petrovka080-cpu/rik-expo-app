import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_AI_ESTIMATE_BOQ_CATALOG";

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function exists(file: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), file));
}

function read(file: string): string {
  return exists(file) ? fs.readFileSync(path.resolve(process.cwd(), file), "utf8") : "";
}

export function runRequestAiEstimateBoqCatalogAudit() {
  const requestScreen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
  const aiAdapter = read("src/features/consumerRepair/consumerRepairAiAdapter.ts");
  const globalEstimateIntegration = read("src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts");
  const viewModel = read("src/features/consumerRepair/requestEstimateViewModel.ts");
  const catalogPicker = read("src/features/catalog/CatalogItemPicker.tsx");
  const catalogService = read("src/lib/catalog/catalogItemsService.ts");
  const consumerRequestService = read("src/lib/consumerRequests/consumerRequestService.ts");
  const calculator = read("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
  const seed = read("src/lib/ai/globalEstimate/globalEstimateSeedData.ts");

  const currentFlow = {
    route: "/request",
    ai_entrypoint: "src/features/consumerRepair/consumerRepairAiAdapter.ts:buildConsumerRepairAiDraft",
    uses_built_in_ai_ingress: aiAdapter.includes("answerBuiltInAi"),
    converts_global_estimate_to_draft_items:
      "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts:buildConsumerRepairAiDraftFromGlobalEstimate",
    summary_generated_by: "src/lib/ai/globalEstimate/formatRequestEstimateSummary.ts",
    screen_view_model: "src/features/consumerRepair/requestEstimateViewModel.ts",
    manual_material_button_opens_catalog_picker:
      requestScreen.includes("CatalogItemPicker") && requestScreen.includes("catalogPickerVisible"),
    pdf_payload_source: "src/lib/consumerRequests/consumerRequestPdfService.ts:buildConsumerRepairPdfSummary",
    fake_green_claimed: false,
  };

  const catalogPath = {
    selected_option: "OPTION_B_EXTRACT_SHARED_CATALOG_ITEM_PICKER_FROM_FOREMAN_FLOW",
    catalog_picker_component: exists("src/features/catalog/CatalogItemPicker.tsx"),
    catalog_service: exists("src/lib/catalog/catalogItemsService.ts"),
    uses_catalog_items_transport: catalogService.includes("loadCatalogItemsSearchPreviewRows"),
    preserves_catalog_item_id:
      requestScreen.includes("addConsumerRepairRequestCatalogItem") &&
      requestScreen.includes("selectConsumerRepairRequestItemCatalogItem") &&
      consumerRequestService.includes("catalogItemId: input.catalogItem.catalogItemId"),
    preserves_source_and_unit:
      consumerRequestService.includes("sourceId: input.catalogItem.sourceId") &&
      consumerRequestService.includes("unitLabel: input.catalogItem.unitLabel"),
    no_fake_stock_supplier_availability:
      !/fakeStock|fakeAvailability|fakeSupplier|stock\s*:|availability\s*:/.test(`${catalogPicker}\n${catalogService}`),
    fake_green_claimed: false,
  };

  const rendering = {
    summary_formatter: exists("src/lib/ai/globalEstimate/formatRequestEstimateSummary.ts"),
    unit_formatter: exists("src/lib/ai/globalEstimate/formatEstimateUnitLabel.ts"),
    money_formatter: exists("src/lib/ai/globalEstimate/formatEstimateMoney.ts"),
    user_text_filter: exists("src/lib/ai/globalEstimate/formatEstimateUserTextRu.ts"),
    request_summary_card: exists("src/features/consumerRepair/RequestEstimateSummaryCard.tsx"),
    request_items_editor: exists("src/features/consumerRepair/RequestEstimateItemsEditor.tsx"),
    strip_foundation_parser: calculator.includes("parseStripFoundationDimensions"),
    strip_foundation_template: seed.includes("STRIP_FOUNDATION_TEMPLATE"),
    boq_depth_policy: exists("src/lib/ai/globalEstimate/estimateBoqDepthPolicy.ts"),
    fake_green_claimed: false,
  };

  const failures = [
    currentFlow.uses_built_in_ai_ingress ? null : "REQUEST_AI_ENTRYPOINT_NOT_MAPPED",
    currentFlow.manual_material_button_opens_catalog_picker ? null : "MANUAL_CATALOG_PICKER_NOT_WIRED",
    catalogPath.uses_catalog_items_transport ? null : "CATALOG_ITEMS_PATH_NOT_FOUND",
    catalogPath.preserves_catalog_item_id ? null : "CATALOG_ITEM_ID_NOT_PRESERVED",
    rendering.strip_foundation_template ? null : "STRIP_FOUNDATION_TEMPLATE_NOT_FOUND",
  ].filter((item): item is string => Boolean(item));

  writeJson(`${PREFIX}_AUDIT_current_flow.json`, currentFlow);
  writeJson(`${PREFIX}_AUDIT_catalog_path.json`, catalogPath);
  writeJson(`${PREFIX}_AUDIT_request_estimate_rendering.json`, rendering);
  writeJson(`${PREFIX}_AUDIT_failures.json`, failures);

  return {
    currentFlow,
    catalogPath,
    rendering,
    failures,
  };
}

if (require.main === module) {
  const result = runRequestAiEstimateBoqCatalogAudit();
  console.log(result.failures.length === 0 ? "GREEN_REQUEST_AI_ESTIMATE_BOQ_CATALOG_AUDIT_READY" : "BLOCKED_CATALOG_ITEMS_PATH_NOT_FOUND");
  if (result.failures.length > 0) {
    console.error(JSON.stringify(result.failures, null, 2));
    process.exitCode = 1;
  }
}
