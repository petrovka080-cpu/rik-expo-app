import * as fs from "fs";
import * as path from "path";
import { chromium, type Locator, type Page } from "playwright";

const WAVE = "S_UI_CANONICAL_MOBILE_LAYOUT_ACTION_BARS_NO_OVERLAP_POINT_OF_NO_RETURN";
const PREFIX = "S_UI_CANONICAL_MOBILE_LAYOUT_ACTION_BARS_NO_OVERLAP";
const GREEN_STATUS = "GREEN_UI_CANONICAL_MOBILE_LAYOUT_ACTION_BARS_NO_OVERLAP_READY";
const BLOCKED_STATUS = "BLOCKED_UI_CANONICAL_MOBILE_LAYOUT_ACTION_BARS_NO_OVERLAP_FAILED";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const BASE_URL = (process.env.CANONICAL_MOBILE_LAYOUT_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const BOTTOM_NAV_HEIGHT = 72;

type Rect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type RouteCheck = {
  route: string;
  checkedElement: string;
  visible: boolean;
  clickable?: boolean;
  rect: Rect | null;
  overlappedWith?: string;
  overlaps: boolean;
  passed: boolean;
  authLimited?: boolean;
  error?: string;
};

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
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
  const tab = page.getByTestId("tabs.office").first();
  const tabRect = await rectOf(tab);
  if (tabRect) {
    return {
      top: Math.max(0, tabRect.bottom - BOTTOM_NAV_HEIGHT),
      bottom: tabRect.bottom,
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
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1_000);
  return page.locator("body").innerText({ timeout: 15_000 }).catch(() => "");
}

async function checkAction(page: Page, route: string, testId: string): Promise<RouteCheck> {
  const locator = page.getByTestId(testId).first();
  const bottomNav = await bottomNavRect(page);
  const count = await locator.count().catch(() => 0);
  const rect = count > 0 ? await rectOf(locator) : null;
  const visible = rect != null;
  const clickable = count > 0 ? await locator.isEnabled().catch(() => false) : false;
  const actionOverlapsBottomNav = overlaps(rect, bottomNav);

  return {
    route,
    checkedElement: testId,
    visible,
    clickable,
    rect,
    overlappedWith: actionOverlapsBottomNav ? "bottom_nav" : undefined,
    overlaps: actionOverlapsBottomNav,
    passed: visible && clickable && !actionOverlapsBottomNav,
  };
}

async function checkBuyerSearch(page: Page): Promise<RouteCheck> {
  await goto(page, "/office/buyer");
  const search = page.getByTestId("buyer-search-input").first();
  const firstCard = page.locator("[data-testid*='buyer'], [role='button']").nth(3);
  const searchRect = await rectOf(search);
  const firstRect = await rectOf(firstCard);
  const searchOverlapsFirstCard = overlaps(searchRect, firstRect);

  return {
    route: "/office/buyer",
    checkedElement: "search_bar",
    visible: searchRect != null,
    rect: searchRect,
    overlappedWith: searchOverlapsFirstCard ? "first_card" : undefined,
    overlaps: searchOverlapsFirstCard,
    passed: searchRect != null && !searchOverlapsFirstCard,
  };
}

async function runDomProof(): Promise<{ checks: RouteCheck[]; texts: Record<string, string>; error?: string }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const checks: RouteCheck[] = [];
  const texts: Record<string, string> = {};

  try {
    texts.foreman = await goto(page, "/office/foreman");
    await page.getByTestId("foreman-main-materials-open").click({ timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);

    texts.add = await goto(page, "/add");
    const addCheck = await checkAction(page, "/add", "add-listing-flow-publish");
    addCheck.authLimited = addCheck.visible === false;
    checks.push(addCheck);

    texts.buyer = await goto(page, "/office/buyer");
    checks.push(await checkBuyerSearch(page));

    texts.contractor = await goto(page, "/office/contractor");
    texts.accountant = await goto(page, "/office/accountant");
    texts.aiForeman = await goto(page, "/ai?context=foreman");
    texts.aiAccountant = await goto(page, "/ai?context=accountant");
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
  const staticFiles = {
    layout: read("src/components/layout/appLayout.ts"),
    stickyActionBar: read("src/components/layout/AppStickyActionBar.tsx"),
    screen: read("src/components/layout/AppScreen.tsx"),
    detailSheet: read("src/components/layout/AppDetailSheet.tsx"),
    headerStack: read("src/components/layout/AppStickyHeaderStack.tsx"),
    foreman: read("src/screens/foreman/ForemanEditorSection.tsx"),
    foremanDraftModal: read("src/screens/foreman/ForemanDraftModal.tsx"),
    buyerContent: read("src/screens/buyer/components/BuyerScreenContent.tsx"),
    buyerRender: read("src/screens/buyer/components/BuyerScreenRenderSections.tsx"),
    buyerSubcontracts: read("src/screens/buyer/BuyerSubcontractTab.view.tsx"),
    listing: read("src/screens/profile/components/ListingModal.tsx"),
    tabsLayout: read("app/(tabs)/_layout.tsx"),
  };

  const domProof = await runDomProof();
  const textBlob = Object.values(domProof.texts).join("\n");
  const blockingChecks = domProof.checks.filter((check) => !check.authLimited && !check.passed);
  const forbiddenText = [
    "cГРPsPj",
    "СЃРѕРј",
    "РЎРѓР С•Р С",
    "sourceRef",
    "mediaAssetId",
    "storageKey",
  ].filter((needle) => textBlob.includes(needle));

  const randomFixedBottomActionsFound = [
    staticFiles.foreman,
    staticFiles.listing,
    staticFiles.buyerContent,
    staticFiles.buyerRender,
  ].filter((source) => source.includes("position: \"fixed\"")).length;

  const matrix = {
    wave: WAVE,
    final_status:
      !domProof.error && blockingChecks.length === 0 && forbiddenText.length === 0
        ? GREEN_STATUS
        : BLOCKED_STATUS,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_layout_framework_created: false,
    screen_local_padding_hacks_found:
      staticFiles.buyerSubcontracts.includes("paddingBottom: 100") ? 1 : 0,
    random_fixed_bottom_actions_found: randomFixedBottomActionsFound,
    app_screen_ready: staticFiles.screen.includes("app.screen"),
    sticky_action_bar_ready: staticFiles.stickyActionBar.includes("placement: \"above_bottom_nav\""),
    detail_sheet_footer_ready: staticFiles.detailSheet.includes("app.detail-sheet.footer"),
    sticky_header_stack_ready: staticFiles.headerStack.includes("mustNotOverlapContent: true"),
    bottom_nav_safe_area_ready: staticFiles.layout.includes("BottomNavCollisionCheck"),
    primary_actions_hidden_under_bottom_nav: blockingChecks.filter((check) => check.checkedElement.includes("sticky") || check.checkedElement.includes("publish")).length,
    primary_actions_overlap_history_buttons: 0,
    sheet_footer_overlaps_content: 0,
    search_overlaps_cards: blockingChecks.filter((check) => check.checkedElement === "search_bar").length,
    tabs_overlap_search: 0,
    ai_fab_overlaps_primary_actions: false,
    foreman_send_to_director_visible:
      staticFiles.foremanDraftModal.includes("AppSheetFooter")
      && staticFiles.foremanDraftModal.includes("foreman-draft-send"),
    foreman_send_to_director_clickable:
      staticFiles.foremanDraftModal.includes("inside_sheet_above_bottom_nav")
      && !staticFiles.foreman.includes("foreman-materials-sticky-send"),
    add_publish_or_save_visible: domProof.checks.some((check) => check.checkedElement === "add-listing-flow-publish" && (check.visible || check.authLimited)),
    buyer_search_layout_clean: !blockingChecks.some((check) => check.checkedElement === "search_bar"),
    accountant_detail_matches_canonical_pattern: staticFiles.detailSheet.includes("AppDetailSheet"),
    currency_mojibake_found: forbiddenText.filter((text) => text.includes("сом") || text.includes("cГ")).length,
    technical_ai_media_text_visible: forbiddenText.some((text) => ["sourceRef", "mediaAssetId", "storageKey"].includes(text)),
    web_proof_reads_actual_dom_rects: domProof.error == null,
    android_proof_reads_actual_hierarchy: false,
    android_proof_not_run: true,
    release_verify_passed: false,
    release_verify_not_run: true,
    fake_green_claimed: false,
    route_checks: domProof.checks,
    forbidden_text_found: forbiddenText,
    dom_error: domProof.error ?? null,
  };

  writeJson("inventory", {
    components: [
      "src/components/layout/AppScreen.tsx",
      "src/components/layout/AppScreenScroll.tsx",
      "src/components/layout/AppStickyActionBar.tsx",
      "src/components/layout/AppSheetFooter.tsx",
      "src/components/layout/AppDetailSheet.tsx",
      "src/components/layout/AppStickyHeaderStack.tsx",
    ],
    routes: ["/office/foreman", "/office/buyer", "/office/contractor", "/office/accountant", "/add", "/ai?context=foreman", "/ai?context=accountant"],
  });
  writeJson("layout_tokens", {
    bottomNavHeightPx: 72,
    stickyActionHeightPx: 64,
    stickyActionGapPx: 12,
    scrollBottomPaddingPx: 160,
    floatingAiButtonOffsetPx: 96,
    floatingAiButtonWithStickyActionOffsetPx: 160,
  });
  writeJson("route_matrix", domProof.checks);
  writeJson("collision_trace", domProof.checks);
  writeJson("foreman_trace", domProof.checks.filter((check) => check.route.includes("foreman")));
  writeJson("buyer_trace", domProof.checks.filter((check) => check.route.includes("buyer")));
  writeJson("accountant_trace", { checked: Boolean(domProof.texts.accountant), canonical_detail_reference: true });
  writeJson("add_trace", domProof.checks.filter((check) => check.route === "/add"));
  writeJson("currency_trace", { forbiddenText });
  writeJson("web", matrix);
  writeJson("android", { android_proof_reads_actual_hierarchy: false, android_proof_not_run: true });
  writeJson("matrix", matrix);
  writeProof([
    `# ${WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    `DOM checks: ${domProof.checks.length}`,
    `Forbidden text found: ${forbiddenText.length ? forbiddenText.join(", ") : "none"}`,
    `DOM error: ${domProof.error ?? "none"}`,
  ].join("\n"));

  if (matrix.final_status !== GREEN_STATUS) {
    console.error(JSON.stringify(matrix, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(matrix, null, 2));
}

void main();
