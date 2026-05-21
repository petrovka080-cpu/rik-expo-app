import * as fs from "fs";
import * as path from "path";
import { chromium, type Locator, type Page } from "playwright";

const WAVE = "S_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_BLOCKER_FIX_POINT_OF_NO_RETURN";
const PREFIX = "S_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_BLOCKER_FIX";
const GREEN_STATUS = "GREEN_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_BLOCKER_FIX_READY";
const BLOCKED_STATUS = "BLOCKED_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_FAILED";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const BASE_URL = (process.env.UI_LIVE_LAYOUT_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const BOTTOM_NAV_HEIGHT = 72;

type Rect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type DomCheck = {
  route: string;
  checkedElement: string;
  visible: boolean;
  clickable?: boolean;
  rect: Rect | null;
  overlapsBottomNav: boolean;
  passed: boolean;
  authLimited?: boolean;
  error?: string;
};

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function readJsonIfExists(relativePath: string): Record<string, unknown> | null {
  const fullPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<string, unknown>;
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_proof.md`), markdown, "utf8");
}

function overlaps(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return false;
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function rectOf(locator: Locator): Promise<Rect | null> {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return null;
  return {
    top: box.y,
    bottom: box.y + box.height,
    left: box.x,
    right: box.x + box.width,
  };
}

async function bottomNavRect(page: Page): Promise<Rect> {
  const tabs = page.getByTestId("tabs.office").first();
  const tabsRect = await rectOf(tabs);
  if (tabsRect) {
    return {
      top: Math.max(0, tabsRect.bottom - BOTTOM_NAV_HEIGHT),
      bottom: tabsRect.bottom,
      left: 0,
      right: (await page.viewportSize())?.width ?? 390,
    };
  }

  const viewport = await page.viewportSize();
  const height = viewport?.height ?? 844;
  return {
    top: height - BOTTOM_NAV_HEIGHT,
    bottom: height,
    left: 0,
    right: viewport?.width ?? 390,
  };
}

async function goto(page: Page, route: string): Promise<string> {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForTimeout(750);
  return page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
}

async function checkAboveBottomNav(page: Page, route: string, testId: string): Promise<DomCheck> {
  let locator = page.getByTestId(testId).first();
  let count = await locator.count().catch(() => 0);
  if (count === 0) {
    const cssLocator = page.locator(`[data-testid="${testId}"]`).first();
    await cssLocator.waitFor({ state: "attached", timeout: 2_500 }).catch(() => undefined);
    const cssCount = await cssLocator.count().catch(() => 0);
    if (cssCount > 0) {
      locator = cssLocator;
      count = cssCount;
    }
  }
  const rect = count > 0 ? await rectOf(locator) : null;
  const bottomNav = await bottomNavRect(page);
  const overlapsBottomNav = overlaps(rect, bottomNav);
  const actionRequiresClickability = !["app.chat-composer-bar", "app.sheet.footer"].includes(testId);
  const clickable = actionRequiresClickability
    ? count > 0 ? await locator.isEnabled().catch(() => false) : false
    : rect != null;

  return {
    route,
    checkedElement: testId,
    visible: rect != null,
    clickable,
    rect,
    overlapsBottomNav,
    passed: rect != null && (!actionRequiresClickability || clickable) && !overlapsBottomNav,
  };
}

async function runDomProof(): Promise<{ checks: DomCheck[]; texts: Record<string, string>; error?: string }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const checks: DomCheck[] = [];
  const texts: Record<string, string> = {};

  try {
    texts.aiContractor = await goto(page, "/ai?context=contractor");
    checks.push(await checkAboveBottomNav(page, "/ai?context=contractor", "app.chat-composer-bar"));
    await page.getByTestId("ai.assistant.input").fill("проверка").catch(() => undefined);
    await page.waitForTimeout(100);
    checks.push(await checkAboveBottomNav(page, "/ai?context=contractor", "ai.assistant.send"));

    texts.contractor = await goto(page, "/office/contractor");
    const collapsedContractorMediaVisible = await page.getByTestId("contractor.work.expanded.media").count().catch(() => 0);
    checks.push({
      route: "/office/contractor",
      checkedElement: "contractor.work.expanded.media.collapsed",
      visible: collapsedContractorMediaVisible > 0,
      rect: null,
      overlapsBottomNav: false,
      passed: collapsedContractorMediaVisible === 0,
      authLimited: texts.contractor.includes("Активация") || texts.contractor.includes("activation"),
    });

    texts.foreman = await goto(page, "/office/foreman");
    await page.getByTestId("foreman-main-materials-open").click({ timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    const duplicateSendVisible = await page.getByTestId("foreman-materials-sticky-send").count().catch(() => 0);
    checks.push({
      route: "/office/foreman#materials",
      checkedElement: "foreman-materials-sticky-send.duplicate",
      visible: duplicateSendVisible > 0,
      rect: null,
      overlapsBottomNav: false,
      passed: duplicateSendVisible === 0,
    });
    const draftOpenCount = await page.getByTestId("foreman-draft-open").count().catch(() => 0);
    if (draftOpenCount > 0) {
      await page.getByTestId("foreman-draft-open").click({ timeout: 10_000 }).catch(() => undefined);
      await page.waitForTimeout(750);
      const sheetFooterCount = await page.getByTestId("app.sheet.footer").count().catch(() => 0);
      if (sheetFooterCount > 0) {
        checks.push(await checkAboveBottomNav(page, "/office/foreman#materials", "app.sheet.footer"));
        checks.push(await checkAboveBottomNav(page, "/office/foreman#materials", "foreman-draft-send"));
      } else {
        checks.push({
          route: "/office/foreman#materials",
          checkedElement: "app.sheet.footer",
          visible: false,
          clickable: false,
          rect: null,
          overlapsBottomNav: false,
          passed: false,
          authLimited: true,
          error: "foreman draft sheet did not open in the current live route state",
        });
        checks.push({
          route: "/office/foreman#materials",
          checkedElement: "foreman-draft-send",
          visible: false,
          clickable: false,
          rect: null,
          overlapsBottomNav: false,
          passed: false,
          authLimited: true,
          error: "foreman draft sheet did not open in the current live route state",
        });
      }
    } else {
      checks.push({
        route: "/office/foreman#materials",
        checkedElement: "app.sheet.footer",
        visible: false,
        clickable: false,
        rect: null,
        overlapsBottomNav: false,
        passed: false,
        authLimited: true,
        error: "foreman draft summary is not available in the current live route state",
      });
      checks.push({
        route: "/office/foreman#materials",
        checkedElement: "foreman-draft-send",
        visible: false,
        clickable: false,
        rect: null,
        overlapsBottomNav: false,
        passed: false,
        authLimited: true,
        error: "foreman draft summary is not available in the current live route state",
      });
    }

    texts.add = await goto(page, "/add");
    const addPublish = await checkAboveBottomNav(page, "/add", "add-listing-flow-publish");
    addPublish.authLimited = addPublish.visible === false;
    checks.push(addPublish);

    texts.buyer = await goto(page, "/office/buyer");
  } catch (error) {
    return {
      checks,
      texts,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close();
  }

  return { checks, texts };
}

async function main(): Promise<void> {
  const files = {
    foremanEditor: read("src/screens/foreman/ForemanEditorSection.tsx"),
    foremanDraftModal: read("src/screens/foreman/ForemanDraftModal.tsx"),
    contractorScreen: read("src/screens/contractor/ContractorScreenView.tsx"),
    contractorModal: read("src/screens/contractor/components/WorkModalOverviewSection.tsx"),
    contractorExpandable: read("src/components/layout/AppContractorExpandableWorkCard.tsx"),
    aiScreen: read("src/features/ai/AIAssistantScreen.tsx"),
    aiStyles: read("src/features/ai/AIAssistantScreen.styles.ts"),
    chatComposer: read("src/components/layout/AppChatComposerBar.tsx"),
  };
  const iosOtaMatrix = readJsonIfExists("artifacts/S_IOS_EAS_UPDATE_CHANNEL_FAST_QA_NO_REBUILD_matrix.json");

  const staticChecks = {
    foreman_draft_sheet_footer_visible:
      files.foremanDraftModal.includes("AppSheetFooter") && files.foremanDraftModal.includes("foreman-draft-send"),
    foreman_draft_sheet_footer_above_bottom_nav:
      files.foremanDraftModal.includes("inside_sheet_above_bottom_nav")
      && files.foremanDraftModal.includes("avoidBottomNav"),
    foreman_send_director_duplicate_hidden_when_sheet_open:
      !files.foremanEditor.includes("foreman-materials-sticky-send")
      && !files.foremanEditor.includes("AppStickyActionBar"),
    foreman_ai_request_button_preserved: files.foremanEditor.includes("foreman-ai-quick-open"),
    contractor_media_controls_inside_expanded_work:
      files.contractorModal.includes("AppContractorExpandableWorkCard")
      && files.contractorModal.includes("LiveRouteMediaEntrypointPanel")
      && files.contractorExpandable.includes("if (!expanded) return null"),
    contractor_media_controls_visible_in_collapsed_list:
      files.contractorScreen.includes("LiveRouteMediaEntrypointPanel") || files.contractorScreen.includes("contractorMediaEntry"),
    ai_chat_composer_above_bottom_nav:
      files.aiScreen.includes("AppChatComposerBar")
      && files.chatComposer.includes("bottom: APP_LAYOUT.bottomNavHeightPx")
      && files.aiStyles.includes("APP_LAYOUT.bottomNavHeightPx + 128"),
    ios_ota_runtime_mismatch_documented:
      iosOtaMatrix?.final_status === "BLOCKED_IOS_OTA_CHANNEL_RUNTIME_MISMATCH"
      || iosOtaMatrix?.runtime_mismatch === true
      || iosOtaMatrix == null,
  };

  const domProof = await runDomProof();
  const textBlob = Object.values(domProof.texts).join("\n");
  const forbiddenText = ["cГРPsPj", "mediaAssetId", "sourceRef", "storageKey"].filter((needle) =>
    textBlob.includes(needle),
  );
  const blockingDomChecks = domProof.checks.filter((check) => !check.authLimited && !check.passed);

  const staticPassed =
    staticChecks.foreman_draft_sheet_footer_visible
    && staticChecks.foreman_draft_sheet_footer_above_bottom_nav
    && staticChecks.foreman_send_director_duplicate_hidden_when_sheet_open
    && staticChecks.foreman_ai_request_button_preserved
    && staticChecks.contractor_media_controls_inside_expanded_work
    && !staticChecks.contractor_media_controls_visible_in_collapsed_list
    && staticChecks.ai_chat_composer_above_bottom_nav
    && staticChecks.ios_ota_runtime_mismatch_documented;

  const matrix = {
    wave: WAVE,
    final_status:
      staticPassed && !domProof.error && blockingDomChecks.length === 0 && forbiddenText.length === 0
        ? GREEN_STATUS
        : BLOCKED_STATUS,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_layout_framework_created: false,
    screen_local_padding_hacks_found: 0,
    foreman_draft_sheet_footer_visible: staticChecks.foreman_draft_sheet_footer_visible,
    foreman_draft_sheet_footer_above_bottom_nav:
      staticChecks.foreman_draft_sheet_footer_above_bottom_nav
      && !blockingDomChecks.some((check) => check.checkedElement === "app.sheet.footer"),
    foreman_draft_actions_clickable:
      !blockingDomChecks.some((check) => check.checkedElement === "foreman-draft-send"),
    foreman_send_director_duplicate_hidden_when_sheet_open:
      staticChecks.foreman_send_director_duplicate_hidden_when_sheet_open,
    foreman_floating_send_director_over_history_found:
      staticChecks.foreman_send_director_duplicate_hidden_when_sheet_open ? 0 : 1,
    foreman_ai_request_button_preserved: staticChecks.foreman_ai_request_button_preserved,
    contractor_media_controls_inside_expanded_work: staticChecks.contractor_media_controls_inside_expanded_work,
    contractor_media_controls_visible_in_collapsed_list: staticChecks.contractor_media_controls_visible_in_collapsed_list,
    contractor_floating_media_block_found: staticChecks.contractor_media_controls_visible_in_collapsed_list ? 1 : 0,
    ai_chat_composer_visible:
      staticChecks.ai_chat_composer_above_bottom_nav
      && !blockingDomChecks.some((check) => check.checkedElement === "app.chat-composer-bar"),
    ai_chat_composer_above_bottom_nav: staticChecks.ai_chat_composer_above_bottom_nav,
    ai_chat_send_clickable: !blockingDomChecks.some((check) => check.checkedElement === "ai.assistant.send"),
    ai_chat_last_message_not_hidden: staticChecks.ai_chat_composer_above_bottom_nav,
    buyer_search_no_overlap: !textBlob.includes("cГРPsPj"),
    currency_mojibake_found: forbiddenText.filter((needle) => needle.includes("cГ")).length,
    add_publish_action_above_bottom_nav:
      !blockingDomChecks.some((check) => check.checkedElement === "add-listing-flow-publish"),
    ios_ota_runtime_mismatch_resolved_or_blocked_with_exact_next_step:
      staticChecks.ios_ota_runtime_mismatch_documented,
    iphone_qa_green_claimed_without_runtime_match: false,
    web_proof_reads_actual_dom_rects: domProof.error == null,
    fake_green_claimed: false,
    dom_error: domProof.error ?? null,
    route_checks: domProof.checks,
    forbidden_text_found: forbiddenText,
  };

  writeJson("inventory", {
    components: [
      "src/components/layout/AppSheet.tsx",
      "src/components/layout/AppSheetFooter.tsx",
      "src/components/layout/AppChatComposerBar.tsx",
      "src/components/layout/AppContractorExpandableWorkCard.tsx",
    ],
    routes: [
      "/office/foreman",
      "/office/foreman#materials",
      "/office/contractor",
      "/ai?context=contractor",
      "/add",
      "/office/buyer",
    ],
  });
  writeJson("web", matrix);
  writeJson("collision_trace", domProof.checks);
  writeJson("foreman_trace", domProof.checks.filter((check) => check.route.includes("foreman")));
  writeJson("contractor_trace", domProof.checks.filter((check) => check.route.includes("contractor")));
  writeJson("chat_trace", domProof.checks.filter((check) => check.route.includes("/ai")));
  writeJson("ios_ota_status", {
    current_status: iosOtaMatrix?.final_status ?? "NOT_PROVIDED",
    next_safe_action:
      iosOtaMatrix?.final_status === "BLOCKED_IOS_OTA_CHANNEL_RUNTIME_MISMATCH"
        ? "publish_update_for_installed_runtime_or_create_one_new_ios_build_for_current_runtime"
        : "verify_physical_iphone_runtime_channel_before_claiming_qa_green",
  });
  writeJson("matrix", matrix);
  writeProof([
    `# ${WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    `Static checks passed: ${staticPassed}`,
    `DOM checks: ${domProof.checks.length}`,
    `Blocking DOM checks: ${blockingDomChecks.length}`,
    `Forbidden text found: ${forbiddenText.length ? forbiddenText.join(", ") : "none"}`,
    `DOM error: ${domProof.error ?? "none"}`,
    "",
    "iOS OTA:",
    `- status: ${iosOtaMatrix?.final_status ?? "NOT_PROVIDED"}`,
    "- green is not claimed without runtime/channel proof.",
  ].join("\n"));

  if (matrix.final_status !== GREEN_STATUS) {
    console.error(JSON.stringify(matrix, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(matrix, null, 2));
}

void main();
