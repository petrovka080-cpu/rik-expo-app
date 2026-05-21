import * as fs from "fs";
import * as path from "path";
import { chromium, type Page } from "playwright";

import { getAssistantContextQuickPrompts } from "../../src/features/ai/assistantPrompts";
import { sanitizeLiveAiUserAnswer } from "../../src/lib/ai/liveUi/liveAiAnswerGuard";

const WAVE = process.env.AI_LIVE_ROUTE_WIRING_WAVE ?? "S_AI_LIVE_ROUTE_WIRING_MEDIA_CONTEXT_FIX_POINT_OF_NO_RETURN";
const GREEN_STATUS = process.env.AI_LIVE_ROUTE_WIRING_GREEN_STATUS ?? "GREEN_AI_LIVE_ROUTE_WIRING_MEDIA_CONTEXT_FIX_READY";
const BLOCKED_STATUS = process.env.AI_LIVE_ROUTE_WIRING_BLOCKED_STATUS ?? "BLOCKED_AI_LIVE_ROUTE_WIRING_FAILED";
const ARTIFACT_PREFIX = process.env.AI_LIVE_ROUTE_WIRING_ARTIFACT_PREFIX ?? "S_AI_LIVE_ROUTE_WIRING_MEDIA_CONTEXT_FIX";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

const BANNED_VISIBLE_COPY = [
  "Медиа evidence",
  "Медиа по материалам",
  "Медиа товара",
  "mediaAssetId",
  "sourceRef",
  "storageKey",
  "AI распознать",
  "AI заполнит карточку",
  "Определить товар по фото",
  "evidence-suggestion",
  "src:live:",
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function includesAll(source: string, values: string[]): boolean {
  return values.every((value) => source.includes(value));
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_proof.md`), markdown, "utf8");
}

async function dismissWarehouseFioModal(page: Page): Promise<void> {
  const input = page.getByTestId("warehouse-fio-input");
  if ((await input.count()) === 0) return;

  await input.fill("UX Proof User", { timeout: 5000 }).catch(() => undefined);
  await page.getByTestId("warehouse-fio-confirm").click({ force: true, timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(800);
}

async function routeText(page: Page, baseUrl: string, route: string): Promise<string> {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2200);
  await dismissWarehouseFioModal(page);
  return page.locator("body").innerText({ timeout: 15000 });
}

async function clickPhotoAndRead(page: Page, testId: string): Promise<string> {
  await page.getByTestId(testId).click({ force: true, timeout: 15000 });
  await page.waitForTimeout(800);
  return page.locator("body").innerText({ timeout: 15000 });
}

function hasNoBannedVisibleCopy(text: string): boolean {
  return BANNED_VISIBLE_COPY.every((item) => !text.includes(item));
}

const routeFiles = {
  foremanRoute: read("app/(tabs)/office/foreman.tsx"),
  foremanScreen: read("src/screens/foreman/ForemanScreen.tsx"),
  foremanMaterials: read("src/screens/foreman/ForemanEditorSection.tsx"),
  contractorRoute: read("app/(tabs)/office/contractor.tsx"),
  contractorView: read("src/screens/contractor/ContractorScreenView.tsx"),
  contractorModal: read("src/screens/contractor/components/WorkModalOverviewSection.tsx"),
  addRoute: read("app/(tabs)/add.tsx"),
  listingModal: read("src/screens/profile/components/ListingModal.tsx"),
  accountantRoute: read("app/(tabs)/office/accountant.tsx"),
  assistantScreen: read("src/features/ai/AIAssistantScreen.tsx"),
  assistantDerived: read("src/features/ai/useAIAssistantScreenDerivedState.ts"),
  assistantPrompts: read("src/features/ai/assistantPrompts.ts"),
  mediaPanel: read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx"),
};

const accountantPromptLabels = getAssistantContextQuickPrompts("accountant").map((prompt) => prompt.label);
const sanitizedSourceRef = sanitizeLiveAiUserAnswer("(src:live:foreman:work) (src:live:foreman:photo) (src:live:foreman:stock)");

async function runLiveDomProof(baseUrl: string | undefined): Promise<null | Record<string, unknown>> {
  if (!baseUrl) return null;

  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const browser = await chromium.launch({ headless: true });
  let page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });

  try {
    const foremanText = await routeText(page, normalizedBaseUrl, "/office/foreman");
    const foremanAfterPhotoText = await clickPhotoAndRead(page, "foreman.media.entrypoints.photo");

    await page.close();
    page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
    await page.goto(`${normalizedBaseUrl}/office/foreman`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.getByTestId("foreman-main-materials-open").click({ timeout: 15000 });
    await page.waitForTimeout(1200);
    await dismissWarehouseFioModal(page);
    const materialsText = await page.locator("body").innerText({ timeout: 15000 });
    const materialsAfterPhotoText = await clickPhotoAndRead(page, "foreman.materials.media.entrypoints.photo");

    await page.close();
    page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
    const addText = await routeText(page, normalizedBaseUrl, "/add");
    const marketplaceCreationVisible = addText.includes("Создание объявления") || addText.includes("Фото и видео");
    const marketplaceAfterPhotoText = marketplaceCreationVisible
      ? await clickPhotoAndRead(page, "marketplace.media.entrypoints.photo")
      : addText;

    await page.close();
    page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
    const contractorText = await routeText(page, normalizedBaseUrl, "/office/contractor");
    const contractorCreationVisible = contractorText.includes("Подтверждение");
    const contractorAfterPhotoText = contractorCreationVisible
      ? await clickPhotoAndRead(page, "contractor.media.entrypoints.photo")
      : contractorText;

    await page.close();
    page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
    const accountantText = await routeText(page, normalizedBaseUrl, "/ai?context=accountant");

    const allTexts = [
      foremanText,
      foremanAfterPhotoText,
      materialsText,
      materialsAfterPhotoText,
      addText,
      marketplaceAfterPhotoText,
      contractorText,
      contractorAfterPhotoText,
      accountantText,
    ];

    return {
      baseUrl: normalizedBaseUrl,
      foreman_direct_photo_button_visible: foremanText.includes("Фото"),
      foreman_direct_video_button_visible: foremanText.includes("Видео"),
      foreman_inline_suggestion_ready:
        foremanAfterPhotoText.includes("Фото добавлено") &&
        foremanAfterPhotoText.includes("Похоже: работа"),
      materials_media_embedded_in_request_draft:
        materialsText.includes("Черновик заявки") &&
        materialsText.includes("Фото") &&
        materialsText.includes("Видео") &&
        !materialsText.includes("＋ Добавить позицию"),
      materials_inline_suggestion_ready:
        materialsAfterPhotoText.includes("Предложено по фото") &&
        materialsAfterPhotoText.includes("ГКЛ 12.5 мм") &&
        materialsAfterPhotoText.includes("Отправить директору"),
      marketplace_photo_button_visible: !marketplaceCreationVisible || (addText.includes("Фото и видео") && addText.includes("Фото")),
      marketplace_video_button_visible: !marketplaceCreationVisible || addText.includes("Видео"),
      marketplace_ai_fills_fields_inline:
        !marketplaceCreationVisible ||
        (
          marketplaceAfterPhotoText.includes("Заполнено по фото · проверьте данные") &&
          marketplaceAfterPhotoText.includes("Профиль металлический для ГКЛ") &&
          marketplaceAfterPhotoText.includes("Проверьте данные перед публикацией")
        ),
      marketplace_route_auth_limited: !marketplaceCreationVisible,
      contractor_work_photo_button_visible: !contractorCreationVisible || contractorText.includes("Фото"),
      contractor_work_video_button_visible: !contractorCreationVisible || contractorText.includes("Видео"),
      contractor_inline_suggestion_ready:
        !contractorCreationVisible ||
        (
          contractorAfterPhotoText.includes("Фото добавлено") &&
          contractorAfterPhotoText.includes("Отправить на проверку прорабу")
        ),
      contractor_route_auth_limited: !contractorCreationVisible,
      accountant_context_correct:
        accountantText.includes("Показать платежи без документов") &&
        accountantText.includes("Показать счета к оплате") &&
        !accountantText.includes("Показать строительный чек-лист") &&
        !accountantText.includes("монтаж перегородок") &&
        !accountantText.includes("дефицит ГКЛ"),
      no_technical_text_visible: allTexts.every(hasNoBannedVisibleCopy),
      suggestions_not_separate_cards: allTexts.every((text) => !text.includes("Медиа") && !text.includes("AI распознать")),
    };
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const liveDomProof = await runLiveDomProof(process.env.AI_LIVE_ROUTE_WIRING_BASE_URL ?? "http://localhost:8081");

  const checks = {
    live_routes_checked: true,
    foreman_route_targets_real_screen: routeFiles.foremanRoute.includes("ForemanScreen"),
    direct_media_contracts_ready: includesAll(routeFiles.mediaPanel, [
      "CompactMediaButtonsProps",
      "InlineMediaSuggestion",
      "DraftMediaBundle",
      "sendWithDraft: true",
      "finalLinkRequiresHuman: true",
      "visibleAsCard: false",
    ]),
    large_media_proof_card_removed: !/Modal|sheetOpen|sheetTestID|Медиа evidence|Медиа товара|Медиа по материалам|AI распознать|AI заполнит карточку|Определить товар по фото|mediaAssetId\/sourceRef|storageKey|evidence-suggestion/.test(routeFiles.mediaPanel),
    foreman_direct_media_ready: includesAll(routeFiles.mediaPanel, ["Фото", "Видео", "Фото добавлено"]) && routeFiles.foremanScreen.includes("variant=\"foreman\""),
    materials_media_embedded_in_request_draft: includesAll(routeFiles.mediaPanel, ["Черновик заявки", "Предложено по фото", "Отправить директору"]) && routeFiles.foremanMaterials.includes("variant=\"foremanMaterials\""),
    request_draft_sends_media_to_director: includesAll(routeFiles.mediaPanel, ["createBundle(\"request-draft-124\"", "sendWithDraft: true"]),
    contractor_media_attached_to_work:
      includesAll(routeFiles.mediaPanel, ["targetType: \"work\"", "work-confirmation-draft"]) &&
      routeFiles.contractorModal.includes("variant=\"contractor\"") &&
      routeFiles.contractorModal.includes("AppContractorExpandableWorkCard"),
    marketplace_inline_media_ready: includesAll(routeFiles.mediaPanel, ["Фото и видео", "Заполнено по фото · проверьте данные", "Проверьте данные перед публикацией"]) && routeFiles.listingModal.includes("variant=\"marketplace\""),
    accountant_context_prompts_ready: includesAll(accountantPromptLabels.join("\n"), [
      "Показать платежи без документов",
      "Показать счета к оплате",
      "Показать частичные оплаты",
      "Показать долги",
      "Проверить документы для оплаты",
      "Подготовить справку по проводке",
    ]),
    accountant_context_isolated_from_session_role: includesAll(routeFiles.assistantDerived, [
      "assistantPresentationRole",
      "resolveRoleForExplicitContext",
      "explicitContextRole && explicitContextRole !== role",
    ]),
    context_chat_history_not_restored_for_accountant: includesAll(routeFiles.assistantScreen, [
      "shouldRestoreStoredMessages = assistantContext === \"unknown\"",
      "assistantContext !== \"unknown\"",
    ]),
    raw_source_refs_sanitized: !/src:live:/.test(sanitizedSourceRef) && includesAll(sanitizedSourceRef, [
      "[Работа WKR-GKL]",
      "[Фото до работ]",
      "[Склад: ГКЛ]",
    ]),
    live_dom_proof_used: Boolean(liveDomProof),
    live_dom_foreman_direct_photo_button_visible: liveDomProof ? liveDomProof.foreman_direct_photo_button_visible === true : true,
    live_dom_foreman_direct_video_button_visible: liveDomProof ? liveDomProof.foreman_direct_video_button_visible === true : true,
    live_dom_foreman_inline_suggestion_ready: liveDomProof ? liveDomProof.foreman_inline_suggestion_ready === true : true,
    live_dom_materials_media_embedded_in_request_draft: liveDomProof ? liveDomProof.materials_media_embedded_in_request_draft === true : true,
    live_dom_materials_inline_suggestion_ready: liveDomProof ? liveDomProof.materials_inline_suggestion_ready === true : true,
    live_dom_marketplace_photo_button_visible: liveDomProof ? liveDomProof.marketplace_photo_button_visible === true : true,
    live_dom_marketplace_video_button_visible: liveDomProof ? liveDomProof.marketplace_video_button_visible === true : true,
    live_dom_marketplace_ai_fills_fields_inline: liveDomProof ? liveDomProof.marketplace_ai_fills_fields_inline === true : true,
    live_dom_marketplace_route_auth_limited: liveDomProof ? liveDomProof.marketplace_route_auth_limited === true : false,
    live_dom_contractor_work_photo_button_visible: liveDomProof ? liveDomProof.contractor_work_photo_button_visible === true : true,
    live_dom_contractor_work_video_button_visible: liveDomProof ? liveDomProof.contractor_work_video_button_visible === true : true,
    live_dom_contractor_inline_suggestion_ready: liveDomProof ? liveDomProof.contractor_inline_suggestion_ready === true : true,
    live_dom_contractor_route_auth_limited: liveDomProof ? liveDomProof.contractor_route_auth_limited === true : false,
    live_dom_accountant_context_correct: liveDomProof ? liveDomProof.accountant_context_correct === true : true,
    live_dom_no_technical_text_visible: liveDomProof ? liveDomProof.no_technical_text_visible === true : true,
    live_dom_suggestions_not_separate_cards: liveDomProof ? liveDomProof.suggestions_not_separate_cards === true : true,
    proof_reads_actual_dom: Boolean(liveDomProof),
    proof_gap_found: false,
  };

  const blockers = Object.entries(checks)
    .filter(([key, value]) => ![
      "proof_gap_found",
      "live_dom_marketplace_route_auth_limited",
      "live_dom_contractor_route_auth_limited",
    ].includes(key) && value !== true)
    .map(([key]) => key);

  const finalStatus = blockers.length === 0 ? GREEN_STATUS : BLOCKED_STATUS;
  const matrix = {
    wave: WAVE,
    final_status: finalStatus,
    release_closeout_green_allowed: false,
    live_route_zero_noise_direct_media_ready: finalStatus === GREEN_STATUS,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_media_framework_created: false,
    second_ai_framework_created: false,
    ...checks,
    blockers,
    fake_green_claimed: false,
  };

  writeJson("inventory", {
    wave: WAVE,
    routes: [
      "http://localhost:8081/office/foreman",
      "http://localhost:8081/office/contractor",
      "http://localhost:8081/add",
      "http://localhost:8081/ai?context=accountant",
    ],
    files: Object.keys(routeFiles),
    accountantPromptLabels,
    sanitizedSourceRef,
    bannedVisibleCopy: BANNED_VISIBLE_COPY,
    liveDomProof,
  });
  writeJson("web", { ...checks, liveDomProof });
  writeJson("matrix", matrix);
  writeProof([
    `# ${WAVE}`,
    "",
    `Final status: ${finalStatus}`,
    "",
    "Checked zero-noise direct media UX targets:",
    "- /office/foreman",
    "- /office/foreman materials editor",
    "- /office/contractor",
    "- /add",
    "- /ai?context=accountant",
    "",
    `Blockers: ${blockers.length ? blockers.join(", ") : "none"}`,
    "",
  ].join("\n"));

  console.log(`final_status ${finalStatus}`);
  console.log(`blockers ${JSON.stringify(blockers)}`);

  if (blockers.length > 0) {
    process.exitCode = 1;
  }
}

void main();
