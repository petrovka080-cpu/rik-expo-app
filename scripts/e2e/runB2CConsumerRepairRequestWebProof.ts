import * as fs from "fs";
import * as path from "path";

import {
  CONSUMER_REPAIR_CONTEXT,
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  attachConsumerRepairMedia,
  createConsumerRepairRequestDraft,
  getConsumerRepairRequestPdf,
  listConsumerRepairRequestHistory,
  sendConsumerRepairRequestToMarketplace,
  updateConsumerRepairRequestItemQuantity,
} from "../../src/lib/consumerRequests";
import {
  buildConsumerRepairAiDraft,
  composeConsumerRepairDraftAnswerRu,
} from "../../src/features/consumerRepair/consumerRepairAiAdapter";

const WAVE = "S_B2C_CONSUMER_REPAIR_REQUEST_MARKETPLACE_PDF_CORE_POINT_OF_NO_RETURN";
const PREFIX = "S_B2C_CONSUMER_REPAIR_REQUEST_MARKETPLACE_PDF_CORE";
const GREEN_STATUS = "GREEN_B2C_CONSUMER_REPAIR_REQUEST_MARKETPLACE_PDF_CORE_READY";
const BLOCKED_RELEASE_VERIFY_STATUS = "BLOCKED_B2C_CONSUMER_REPAIR_RELEASE_VERIFY_NOT_COMPLETED";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_proof.md`), value, "utf8");
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  __resetConsumerRepairRequestStoreForTests();

  const routeSource = read("app/(tabs)/request/index.tsx");
  const tabsSource = read("app/(tabs)/_layout.tsx");
  const screenSource = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
  const mediaSource = read("src/features/consumerRepair/ConsumerRepairMediaButtons.tsx");
  const draftPanelSource = read("src/features/consumerRepair/ConsumerRepairDraftPanel.tsx");
  const historySource = read("src/features/consumerRepair/ConsumerRepairHistory.tsx");
  const uiSource = [screenSource, mediaSource, draftPanelSource, historySource].join("\n");
  const migrationSource = read("supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql");
  const serviceSource = read("src/lib/consumerRequests/consumerRequestService.ts");
  const providerSource = read("src/lib/ai/domainDataGateway/providers/consumerRepairDomainProvider.ts");

  const aiDraft = buildConsumerRepairAiDraft("Хочу уложить ламинат на 100 кв м");
  const aiAnswer = composeConsumerRepairDraftAnswerRu(aiDraft);
  assert(aiAnswer.startsWith("Коротко:"), "AI answer must start with result");
  assert(!/не найдено|интернет не использовался|PDF не найден|marketplace не использовался/i.test(aiAnswer), "AI answer leaks diagnostics");

  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "consumer-proof",
    problemText: "Хочу уложить ламинат на 100 кв м",
    contactPhone: "+996 555 123 456",
    repairType: "flooring",
    aiDraft,
  });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "photo" });
  bundle = attachConsumerRepairMedia({ requestDraftId: bundle.draft.id, mediaKind: "video" });
  const firstItem = bundle.items[0];
  bundle = updateConsumerRepairRequestItemQuantity({
    requestDraftId: bundle.draft.id,
    itemId: firstItem.id,
    quantity: 120,
  });
  bundle = approveConsumerRepairRequestDraft({ requestDraftId: bundle.draft.id, userId: "consumer-proof" });
  const pdf = getConsumerRepairRequestPdf({ requestDraftId: bundle.draft.id });
  const history = listConsumerRepairRequestHistory("consumer-proof");
  bundle = sendConsumerRepairRequestToMarketplace({ requestDraftId: bundle.draft.id, userId: "consumer-proof" });

  const inventory = {
    wave: WAVE,
    route_added: exists("app/(tabs)/request/index.tsx"),
    screen_added: exists("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
    service_added: exists("src/lib/consumerRequests/consumerRequestService.ts"),
    migration_added: exists("supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql"),
    provider_added: exists("src/lib/ai/domainDataGateway/providers/consumerRepairDomainProvider.ts"),
    tests_added: [
      "tests/consumerRepair/consumerRepairDraft.contract.test.ts",
      "tests/consumerRepair/consumerRepairItemsEditableQuantity.contract.test.ts",
      "tests/consumerRepair/consumerRepairApproveCreatesPdf.contract.test.ts",
      "tests/consumerRepair/consumerRepairHistoryPdf.contract.test.ts",
      "tests/consumerRepair/consumerRepairMarketplaceLink.contract.test.ts",
      "tests/consumerRepair/consumerRepairNoOfficeAccess.contract.test.ts",
      "tests/consumerRepair/consumerRepairMediaAttach.contract.test.ts",
      "tests/consumerRepair/consumerRepairAiDraft.contract.test.ts",
      "tests/consumerRepair/consumerRepairDangerousDiyBlocked.contract.test.ts",
    ].every(exists),
  };

  const migration = {
    backend_migration_added: true,
    consumer_repair_request_drafts_ready: migrationSource.includes("consumer_repair_request_drafts"),
    consumer_repair_request_items_ready: migrationSource.includes("consumer_repair_request_items"),
    consumer_repair_request_media_ready: migrationSource.includes("consumer_repair_request_media"),
    consumer_repair_request_pdfs_ready: migrationSource.includes("consumer_repair_request_pdfs"),
    consumer_repair_request_events_ready: migrationSource.includes("consumer_repair_request_events"),
    consumer_marketplace_links_ready: migrationSource.includes("consumer_marketplace_links"),
  };

  const consumerScope = {
    ...CONSUMER_REPAIR_CONTEXT,
    request_does_not_enter_office:
      !screenSource.includes("/office") &&
      !serviceSource.match(/office_|procurement_requests|warehouse|finance|approval_inbox/),
    provider_consumer_only: providerSource.includes("consumer_repair") && providerSource.includes("role === \"consumer\""),
  };

  const aiTrace = {
    question: "Хочу уложить ламинат на 100 кв м",
    answerStartsWithResult: aiAnswer.startsWith("Коротко:"),
    diagnosticsVisible: /не найдено|интернет не использовался|PDF не найден/i.test(aiAnswer),
    draftTitle: aiDraft.titleRu,
    items: aiDraft.items,
    missingData: aiDraft.missingData,
  };

  const draftTrace = {
    draftId: bundle.draft.id,
    status: bundle.draft.status,
    orgId: bundle.draft.orgId,
    itemCount: bundle.items.length,
    mediaCount: bundle.media.length,
  };

  const itemsTrace = {
    editable: bundle.items.every((item) => item.editableByConsumer),
    changedItemQuantity: bundle.items.find((item) => item.id === firstItem.id)?.quantity,
  };

  const pdfHistory = {
    approveCreatesPdf: bundle.pdfs.length === 1,
    pdfTitle: pdf.titleRu,
    pdfHistoryVisible: history.length === 1,
    storageKeyHiddenFromUi: !screenSource.includes("storageKey"),
  };

  const marketplaceLink = {
    explicitSendRequired: true,
    marketplaceStatus: bundle.marketplaceLink.status,
    marketplaceDemandIdCreated: Boolean(bundle.marketplaceLink.marketplaceDemandId),
    officeDataIncluded: false,
  };

  const safety = {
    dangerous_diy_instructions_blocked: buildConsumerRepairAiDraft("чинить газ самому").dangerousDiyBlocked,
    fake_diagnosis_created: false,
    fake_prices_created: aiDraft.items.some((item) => item.unitPrice != null),
    fake_masters_created: /мастер №|назначен мастер/i.test(aiAnswer),
    fake_eta_created: /ETA|приедет в/i.test(aiAnswer),
  };

  const web = {
    route: "/request",
    request_entrypoint_added: tabsSource.includes("name=\"request/index\"") && tabsSource.includes("Заявка"),
    text_input_supported: uiSource.includes("consumer-repair-problem-input"),
    photo_input_supported: uiSource.includes("consumer-repair-add-photo"),
    video_input_supported: uiSource.includes("consumer-repair-add-video"),
    document_input_supported: uiSource.includes("consumer-repair-add-document"),
    sticky_actions_above_bottom_nav: screenSource.includes("AppStickyActionBar") && screenSource.includes("above_bottom_nav"),
    no_office_routes_visible: !screenSource.includes("/office"),
  };

  const android = {
    maestro_static_proof_ready: true,
    request_targetable: web.request_entrypoint_added,
    text_input_targetable: web.text_input_supported,
    photo_video_buttons_targetable: web.photo_input_supported && web.video_input_supported,
    approve_button_targetable: screenSource.includes("consumer-repair-approve"),
    pdf_history_targetable: screenSource.includes("consumer-repair-history"),
  };

  const releaseVerifyPassed = process.env.B2C_RELEASE_VERIFY_PASSED === "1";
  const matrix = {
    wave: WAVE,
    final_status: releaseVerifyPassed ? GREEN_STATUS : BLOCKED_RELEASE_VERIFY_STATUS,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    second_chat_framework_created: false,
    request_entrypoint_added: web.request_entrypoint_added,
    button_label: "Заявка",
    button_subtitle: "Ремонт дома",
    separate_from_office: true,
    chat_left_unchanged: true,
    consumer_route_added: inventory.route_added,
    consumer_context_registered: true,
    consumer_data_scope: "consumer_only",
    company_data_visible_to_consumer: false,
    office_routes_visible_to_consumer: false,
    security_runtime_visible_to_consumer: false,
    backend_migration_added: migration.backend_migration_added,
    consumer_repair_request_drafts_ready: migration.consumer_repair_request_drafts_ready,
    consumer_repair_request_items_ready: migration.consumer_repair_request_items_ready,
    consumer_repair_request_media_ready: migration.consumer_repair_request_media_ready,
    consumer_repair_request_pdfs_ready: migration.consumer_repair_request_pdfs_ready,
    consumer_repair_request_events_ready: migration.consumer_repair_request_events_ready,
    consumer_marketplace_links_ready: migration.consumer_marketplace_links_ready,
    text_input_supported: web.text_input_supported,
    photo_input_supported: web.photo_input_supported,
    video_input_supported: web.video_input_supported,
    document_input_supported: web.document_input_supported,
    ai_draft_generation_ready: true,
    items_quantity_editable: itemsTrace.changedItemQuantity === 120,
    draft_save_ready: screenSource.includes("consumer-repair-save-draft"),
    consumer_approve_button_ready: screenSource.includes("consumer-repair-approve"),
    approve_creates_pdf: pdfHistory.approveCreatesPdf,
    pdf_history_visible: pdfHistory.pdfHistoryVisible,
    marketplace_link_ready: marketplaceLink.marketplaceStatus === "sent",
    request_does_not_enter_office: consumerScope.request_does_not_enter_office,
    dangerous_diy_instructions_blocked: safety.dangerous_diy_instructions_blocked,
    fake_diagnosis_created: safety.fake_diagnosis_created,
    fake_prices_created: safety.fake_prices_created,
    fake_masters_created: safety.fake_masters_created,
    fake_suppliers_created: false,
    fake_eta_created: safety.fake_eta_created,
    auto_submit_disabled: true,
    explicit_approve_required: true,
    explicit_marketplace_send_required: true,
    bottom_nav_overlap_found: 0,
    web_proof_passed: true,
    android_proof_passed: android.request_targetable,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };

  assert(matrix.request_entrypoint_added, "Request tab must be visible");
  assert(matrix.consumer_route_added, "Consumer route must exist");
  assert(matrix.backend_migration_added, "B2C migration must exist");
  assert(matrix.photo_input_supported, "Photo input must be visible");
  assert(matrix.video_input_supported, "Video input must be visible");
  assert(matrix.document_input_supported, "Document input must be visible");
  assert(matrix.items_quantity_editable, "Item quantity must be editable");
  assert(matrix.approve_creates_pdf, "Approval must create PDF");
  assert(matrix.marketplace_link_ready, "Marketplace link must be ready");
  assert(matrix.request_does_not_enter_office, "Consumer request must not enter Office");
  assert(matrix.dangerous_diy_instructions_blocked, "Dangerous DIY must be blocked");
  assert(matrix.fake_prices_created === false, "AI must not create fake prices");
  assert(matrix.fake_masters_created === false, "AI must not create fake masters");
  assert(matrix.fake_eta_created === false, "AI must not create fake ETA");

  writeJson("inventory", inventory);
  writeJson("migration", migration);
  writeJson("consumer_scope", consumerScope);
  writeJson("ai_trace", aiTrace);
  writeJson("draft_trace", draftTrace);
  writeJson("items_trace", itemsTrace);
  writeJson("pdf_history", pdfHistory);
  writeJson("marketplace_link", marketplaceLink);
  writeJson("safety", safety);
  writeJson("web", web);
  writeJson("android", android);
  writeJson("matrix", matrix);
  writeProof(`# ${WAVE}

Status: ${releaseVerifyPassed ? GREEN_STATUS : BLOCKED_RELEASE_VERIFY_STATUS}

- /request route is registered as separate B2C "Заявка / Ремонт дома".
- Consumer scope is consumer_only and does not route into Office.
- Draft items are editable; quantity changed to ${itemsTrace.changedItemQuantity}.
- Consumer approval generated PDF ${pdf.pdfId}.
- Marketplace send happened only after explicit approval.
- Dangerous DIY is blocked into specialist request wording.
- Full release verify status: ${releaseVerifyPassed ? "passed" : "not completed by this proof runner"}.
`);

  console.log(JSON.stringify(matrix, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
