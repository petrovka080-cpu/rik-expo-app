import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PREFIX = "S_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD";

function exists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

function read(relativePath: string): string {
  const absolute = path.resolve(process.cwd(), relativePath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runRequestEstimateDraftStatePayloadAudit() {
  const service = read("src/lib/consumerRequests/consumerRequestService.ts");
  const marketplace = read("src/lib/consumerRequests/consumerRequestMarketplaceService.ts");
  const pdf = read("src/lib/consumerRequests/consumerRequestPdfService.ts");
  const screen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
  const stateMachine = read("src/lib/consumerRequests/consumerRequestDraftStateMachine.ts");
  const payloadParity = read("src/lib/consumerRequests/consumerRequestPayloadParity.ts");

  const currentFlow = {
    request_route: "app/request -> ConsumerRepairRequestScreen",
    draft_service: "src/lib/consumerRequests/consumerRequestService.ts",
    marketplace_service: "src/lib/consumerRequests/consumerRequestMarketplaceService.ts",
    pdf_service: "src/lib/consumerRequests/consumerRequestPdfService.ts",
    state_machine_present: exists("src/lib/consumerRequests/consumerRequestDraftStateMachine.ts"),
    canonical_payload_present: exists("src/lib/consumerRequests/consumerRequestPayloadParity.ts"),
    save_path: service.includes("updateConsumerRepairRequestDraft"),
    pdf_path: service.includes("generateConsumerRepairRequestPdfForDraft") && pdf.includes("buildConsumerRepairPdfSummary"),
    send_path: marketplace.includes("sendConsumerRepairRequestToMarketplace"),
  };
  const stateMap = {
    statuses: ["draft", "consumer_approved", "sent_to_marketplace", "cancelled", "archived"],
    guarded_actions: [
      "create_draft",
      "update_draft_fields",
      "add_item",
      "remove_item",
      "update_item_quantity",
      "select_catalog_item",
      "attach_media",
      "generate_pdf",
      "approve",
      "send_to_marketplace",
    ],
    service_uses_state_machine: service.includes("assertConsumerRepairDraftActionAllowed"),
    marketplace_uses_state_machine: marketplace.includes("assertConsumerRepairDraftActionAllowed"),
  };
  const payloadMap = {
    canonical_builder: payloadParity.includes("buildConsumerRepairCanonicalDraftPayload"),
    parity_validator: payloadParity.includes("compareConsumerRepairPayloadParity"),
    preserves_catalog_item_id: payloadParity.includes("catalogItemId"),
    preserves_selected_catalog_item_id: payloadParity.includes("selectedCatalogItemId"),
    preserves_totals: payloadParity.includes("grandTotal"),
    pdf_summary_uses_current_items: pdf.includes("input.items.map"),
    screen_local_payload_builder_found: /buildConsumerRepairCanonicalDraftPayload|compareConsumerRepairPayloadParity/.test(screen),
  };
  const failures = [
    ...(!currentFlow.state_machine_present ? ["STATE_MACHINE_MISSING"] : []),
    ...(!currentFlow.canonical_payload_present ? ["CANONICAL_PAYLOAD_MISSING"] : []),
    ...(!stateMap.service_uses_state_machine ? ["SERVICE_STATE_MACHINE_NOT_USED"] : []),
    ...(!stateMap.marketplace_uses_state_machine ? ["MARKETPLACE_STATE_MACHINE_NOT_USED"] : []),
    ...(payloadMap.screen_local_payload_builder_found ? ["SCREEN_LOCAL_PAYLOAD_BUILDER_FOUND"] : []),
  ];

  writeJson("audit", currentFlow);
  writeJson("state_machine_map", stateMap);
  writeJson("payload_parity_map", payloadMap);
  writeJson("failures", failures);

  return { currentFlow, stateMap, payloadMap, failures };
}

if (require.main === module) {
  const result = runRequestEstimateDraftStatePayloadAudit();
  console.log(result.failures.length === 0 ? "GREEN_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD_AUDIT_READY" : "BLOCKED_REQUEST_ESTIMATE_DRAFT_STATE_PAYLOAD_AUDIT");
  if (result.failures.length > 0) process.exitCode = 1;
}
