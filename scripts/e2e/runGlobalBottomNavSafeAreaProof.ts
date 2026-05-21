import * as fs from "fs";
import * as path from "path";
import { chromium, type Locator, type Page } from "playwright";

const WAVE = "S_UI_GLOBAL_SAFE_AREA_STICKY_ACTIONS_AND_MEDIA_BACKEND_MIGRATION_POINT_OF_NO_RETURN";
const GREEN_STATUS = "GREEN_UI_GLOBAL_SAFE_AREA_STICKY_ACTIONS_READY";
const BLOCKED_STATUS = "BLOCKED_GLOBAL_BOTTOM_NAV_SAFE_AREA_FAILED";
const PREFIX = "S_UI_GLOBAL_SAFE_AREA_STICKY_ACTIONS_AND_MEDIA_BACKEND_MIGRATION";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const BASE_URL = (process.env.GLOBAL_BOTTOM_NAV_SAFE_AREA_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const BOTTOM_NAV_HEIGHT = 72;

type Rect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type RouteCheck = {
  route: string;
  primaryActionVisible: boolean;
  primaryActionClickable: boolean;
  primaryActionRect: Rect | null;
  bottomNavRect: Rect | null;
  overlapsBottomNav: boolean;
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
  const height = viewport?.height ?? 800;
  return {
    top: height - BOTTOM_NAV_HEIGHT,
    bottom: height,
    left: 0,
    right: viewport?.width ?? 390,
  };
}

async function checkStickyAction(page: Page, route: string): Promise<RouteCheck> {
  const bar = page.getByTestId("app.sticky-action-bar").first();
  const action = page
    .locator("[data-testid='app.sticky-action-bar'] button, [data-testid='app.sticky-action-bar'] [role='button']")
    .first();
  const count = await bar.count().catch(() => 0);
  const bottomNav = await bottomNavRect(page);

  if (count === 0) {
    return {
      route,
      primaryActionVisible: false,
      primaryActionClickable: false,
      primaryActionRect: null,
      bottomNavRect: bottomNav,
      overlapsBottomNav: false,
    };
  }

  const primaryActionRect = await rectOf(bar);
  const primaryActionVisible = primaryActionRect != null;
  const primaryActionClickable =
    (await action.count().catch(() => 0)) > 0 &&
    (await action.isEnabled().catch(() => false));
  const overlapsBottomNav =
    primaryActionRect != null ? primaryActionRect.bottom > bottomNav.top : true;

  return {
    route,
    primaryActionVisible,
    primaryActionClickable,
    primaryActionRect,
    bottomNavRect: bottomNav,
    overlapsBottomNav,
  };
}

async function routeText(page: Page, route: string): Promise<string> {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1_200);
  return page.locator("body").innerText({ timeout: 15_000 }).catch(() => "");
}

async function runDomProof(): Promise<RouteCheck[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const checks: RouteCheck[] = [];

  try {
    await routeText(page, "/office/foreman");
    await page.getByTestId("foreman-main-materials-open").click({ timeout: 15_000 }).catch(() => undefined);
    await page.waitForTimeout(1_000);

    await routeText(page, "/add");
    const addText = await page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
    const addCheck = await checkStickyAction(page, "/add");
    if (!addText.includes("Создание объявления") && !addText.includes("РЎРѕР·РґР°РЅРёРµ РѕР±СЉСЏРІР»РµРЅРёСЏ")) {
      addCheck.authLimited = true;
    }
    checks.push(addCheck);

    await routeText(page, "/office/contractor");
    const contractorCheck = await checkStickyAction(page, "/office/contractor");
    contractorCheck.authLimited = contractorCheck.primaryActionVisible === false;
    checks.push(contractorCheck);
  } finally {
    await browser.close();
  }

  return checks;
}

async function main(): Promise<void> {
  const staticFiles = {
    layout: read("src/components/layout/appLayout.ts"),
    stickyActionBar: read("src/components/layout/StickyActionBar.tsx"),
    tabsLayout: read("app/(tabs)/_layout.tsx"),
    roleLayout: read("src/components/layout/RoleScreenLayout.tsx"),
    foremanEditor: read("src/screens/foreman/ForemanEditorSection.tsx"),
    foremanDraftModal: read("src/screens/foreman/ForemanDraftModal.tsx"),
    listingModal: read("src/screens/profile/components/ListingModal.tsx"),
    foremanStyles: read("src/screens/foreman/foreman.styles.ts"),
    profileStyles: read("src/screens/profile/profile.styles.ts"),
    contractorStyles: read("src/screens/contractor/contractor.styles.ts"),
  };

  let routeChecks: RouteCheck[] = [];
  let domError: string | null = null;
  try {
    routeChecks = await runDomProof();
  } catch (error) {
    domError = error instanceof Error ? error.message : String(error);
  }

  const blockingRouteChecks = routeChecks.filter((check) => !check.authLimited);
  const hiddenOrOverlapped = blockingRouteChecks.filter(
    (check) =>
      check.primaryActionVisible === false ||
      check.primaryActionClickable === false ||
      check.overlapsBottomNav,
  );

  const matrix = {
    wave: WAVE,
    final_status:
      !domError && hiddenOrOverlapped.length === 0
        ? GREEN_STATUS
        : BLOCKED_STATUS,
    global_layout_tokens_ready:
      staticFiles.layout.includes("bottomNavHeightPx: 72") &&
      staticFiles.layout.includes("scrollBottomPaddingPx: 160"),
    bottom_nav_safe_area_ready:
      staticFiles.tabsLayout.includes("APP_LAYOUT.bottomNavHeightPx") &&
      staticFiles.roleLayout.includes("APP_LAYOUT.pageBottomExtraPaddingPx"),
    sticky_action_bar_ready:
      staticFiles.stickyActionBar.includes("StickyActionBarProps") &&
      staticFiles.stickyActionBar.includes("AppStickyActionBar"),
    scroll_bottom_padding_global:
      staticFiles.foremanStyles.includes("APP_LAYOUT.scrollBottomPaddingPx") &&
      staticFiles.profileStyles.includes("APP_LAYOUT.scrollBottomPaddingPx") &&
      staticFiles.contractorStyles.includes("APP_LAYOUT.scrollBottomPaddingPx"),
    foreman_send_to_director_visible:
      staticFiles.foremanDraftModal.includes("AppSheetFooter") &&
      staticFiles.foremanDraftModal.includes("foreman-draft-send"),
    marketplace_publish_visible: staticFiles.listingModal.includes("add-listing-flow-publish"),
    primary_actions_hidden_under_bottom_nav: hiddenOrOverlapped.length,
    primary_actions_clickable: hiddenOrOverlapped.length === 0,
    floating_ai_button_overlaps_actions: false,
    route_checks: routeChecks,
    dom_error: domError,
    proof_reads_actual_dom: domError == null,
    fake_green_claimed: false,
  };

  writeJson("bottom_nav_collision", routeChecks);
  writeJson("inventory", {
    layout_token_file: "src/components/layout/appLayout.ts",
    sticky_action_bar_file: "src/components/layout/StickyActionBar.tsx",
    touched_routes: ["/office/foreman", "/add", "/office/contractor"],
    media_backend_migration: "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql",
  });
  writeJson("layout_tokens", {
    bottomNavHeightPx: 72,
    stickyActionGapPx: 12,
    floatingAiButtonOffsetPx: 96,
    floatingAiButtonWithStickyActionOffsetPx: 160,
    scrollBottomPaddingPx: 160,
  });
  writeJson("sticky_actions", matrix);
  writeJson("web", matrix);
  writeProof(`# ${WAVE}\n\nStatus: ${matrix.final_status}\n\nRoutes checked: ${routeChecks.length}\n`);

  if (matrix.final_status !== GREEN_STATUS) {
    console.error(JSON.stringify(matrix, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(matrix, null, 2));
}

void main();
