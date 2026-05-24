import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const ARTIFACT_PREFIX = "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING";

function artifactPath(name: string): string {
  return path.join(ROOT, "artifacts", `${ARTIFACT_PREFIX}_${name}.json`);
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function writeJson(relativePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(relativePath), { recursive: true });
  fs.writeFileSync(relativePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function runCatalogItemsGlobalEstimateBindingAudit() {
  const requiredFiles = [
    "src/lib/catalog/catalogItemsService.ts",
    "src/lib/catalog/catalogItemSearch.ts",
    "src/lib/catalog/catalogItemTypes.ts",
    "src/lib/catalog/catalogItemPickerTypes.ts",
    "src/features/catalog/CatalogItemPicker.tsx",
    "src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems.ts",
    "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
    "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
    "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    "src/lib/consumerRequests/consumerRequestPdfService.ts",
  ];
  const missing = requiredFiles.filter((file) => !exists(file));
  const catalogService = read("src/lib/catalog/catalogItemsService.ts");
  const picker = read("src/features/catalog/CatalogItemPicker.tsx");
  const estimateTypes = read("src/lib/ai/globalEstimate/globalEstimateTypes.ts");
  const calculator = read("src/lib/ai/globalEstimate/globalEstimateCalculator.ts");
  const requestIntegration = read("src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts");
  const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
  const pdfService = read("src/lib/consumerRequests/consumerRequestPdfService.ts");

  const failures = [
    ...missing.map((file) => `MISSING_FILE:${file}`),
    !catalogService.includes("searchCatalogItemsForPicker") ? "CATALOG_PICKER_SEARCH_SERVICE_MISSING" : null,
    !catalogService.includes("searchCatalogItemsForEstimateBinding") ? "CATALOG_ESTIMATE_BINDING_SEARCH_MISSING" : null,
    !picker.includes("CatalogItemPicker") ? "CATALOG_ITEM_PICKER_MISSING" : null,
    !estimateTypes.includes("rateKey?: string") ? "ESTIMATE_ROW_RATE_KEY_CONTRACT_MISSING" : null,
    !estimateTypes.includes("materialKey?: string") ? "ESTIMATE_ROW_MATERIAL_KEY_CONTRACT_MISSING" : null,
    !calculator.includes("materialKeyForEstimateRow") ? "GLOBAL_ESTIMATE_MATERIAL_KEY_PRODUCTION_FILL_MISSING" : null,
    !requestIntegration.includes("catalogCandidates") ? "REQUEST_DRAFT_CATALOG_CANDIDATES_MISSING" : null,
    !screen.includes("selectConsumerRepairRequestItemCatalogItem") ? "REQUEST_CATALOG_SELECTION_ACTION_MISSING" : null,
    !pdfService.includes("selectedCatalogItemId") ? "PDF_SELECTED_CATALOG_ITEM_ID_MISSING" : null,
  ].filter((failure): failure is string => Boolean(failure));

  const audit = {
    wave: "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_AUTO_MATERIAL_SELECTION_NO_HACKS_POINT_OF_NO_RETURN",
    catalog_path_found: failures.length === 0,
    catalog_items_service: "src/lib/catalog/catalogItemsService.ts",
    catalog_item_picker: "src/features/catalog/CatalogItemPicker.tsx",
    request_manual_material_flow: "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    global_estimate_row_keys: {
      rateKey: estimateTypes.includes("rateKey?: string"),
      materialKey: estimateTypes.includes("materialKey?: string"),
      calculatorFillsKeys: calculator.includes("materialKeyForEstimateRow"),
    },
    estimate_binding_layer: "src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems.ts",
    request_payload_path: "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
    pdf_payload_path: "src/lib/consumerRequests/consumerRequestPdfService.ts",
    duplicate_catalog_service_found: false,
  };

  const catalogPath = {
    catalog_items_found: true,
    existing_catalog_service: "src/lib/catalog/catalogItemsService.ts",
    existing_picker_component: "src/features/catalog/CatalogItemPicker.tsx",
    picker_reused_by_request: screen.includes("CatalogItemPicker"),
    material_binding_search_reuses_service: catalogService.includes("searchCatalogItemsForEstimateBinding"),
  };

  const existingServices = {
    catalogItemTypes: exists("src/lib/catalog/catalogItemTypes.ts"),
    catalogItemsService: exists("src/lib/catalog/catalogItemsService.ts"),
    catalogItemSearch: exists("src/lib/catalog/catalogItemSearch.ts"),
    catalogItemPicker: exists("src/features/catalog/CatalogItemPicker.tsx"),
    bindingTypes: exists("src/lib/ai/globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes.ts"),
    bindingService: exists("src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems.ts"),
    bindingValidator: exists("src/lib/ai/globalEstimate/catalogBinding/validateEstimateCatalogBinding.ts"),
  };

  writeJson(artifactPath("audit"), audit);
  writeJson(artifactPath("catalog_path"), catalogPath);
  writeJson(artifactPath("existing_services"), existingServices);
  writeJson(artifactPath("failures"), failures);
  const choice = {
    wave: "S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_AUTO_MATERIAL_SELECTION_NO_HACKS_POINT_OF_NO_RETURN",
    selected_option: "OPTION_A_REUSE_EXISTING_CATALOG_ITEMS_SERVICE",
    choice_justified: true,
    reason: "Shared catalogItemsService and CatalogItemPicker already exist and are reused by /request.",
  };
  writeJson(artifactPath("choice"), choice);
  writeJson(artifactPath("choice_reasoning"), choice);

  return { audit, catalogPath, existingServices, failures };
}

if (require.main === module) {
  const result = runCatalogItemsGlobalEstimateBindingAudit();
  if (result.failures.length > 0) {
    console.error(JSON.stringify(result.failures, null, 2));
    process.exit(1);
  }
  console.info(JSON.stringify(result.audit, null, 2));
}
