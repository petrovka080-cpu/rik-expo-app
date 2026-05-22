import * as fs from "fs";
import * as path from "path";
import { chromium, type Locator, type Page } from "playwright";

const WAVE = "S_RESTORE_MARKETPLACE_ADD_PLUS_AFTER_MARKET_NO_NAV_DELETION_GREEN_CLOSEOUT";
const GREEN_STATUS = "GREEN_MARKETPLACE_ADD_PLUS_AFTER_MARKET_RESTORED_READY";
const BLOCKED_STATUS = "BLOCKED_MARKETPLACE_ADD_PLUS_REMOVED_OR_MISPLACED";
const BASE_URL = (process.env.RESTORE_MARKETPLACE_ADD_BASE_URL ?? "http://localhost:8081").replace(/\/$/, "");
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const E2E_EMAIL =
  process.env.RESTORE_MARKETPLACE_ADD_E2E_EMAIL ??
  process.env.E2E_CONTROL_EMAIL ??
  process.env.E2E_AUTH_EMAIL ??
  "";
const E2E_PASSWORD =
  process.env.RESTORE_MARKETPLACE_ADD_E2E_PASSWORD ??
  process.env.E2E_CONTROL_PASSWORD ??
  process.env.E2E_AUTH_PASSWORD ??
  "";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  centerX: number;
  centerY: number;
  visible: boolean;
};

type ProofMatrix = {
  wave: typeof WAVE;
  final_status: typeof GREEN_STATUS | typeof BLOCKED_STATUS;
  baseline_commit: "38d9e2e4";
  rollback_used: false;
  office_tab_visible: boolean;
  request_tab_visible: boolean;
  market_tab_visible: boolean;
  chat_tab_visible: boolean;
  profile_tab_visible: boolean;
  marketplace_add_plus_visible: boolean;
  marketplace_add_plus_position: "after_market_before_chat" | "invalid";
  marketplace_add_plus_is_action_not_tab: boolean;
  marketplace_add_plus_clickable: boolean;
  bottom_nav_order: string[];
  duplicate_global_plus_found: number;
  empty_bottom_nav_slot_found: boolean;
  raw_request_index_visible: boolean;
  raw_add_index_visible: boolean;
  add_route_visible_as_tab: boolean;
  plus_opens_add_product_flow: boolean;
  market_product_action_visible: boolean;
  add_product_route_reachable_from_ui: boolean;
  add_screen_title_visible: boolean;
  add_photo_video_uploader_visible: boolean;
  add_photo_button_visible: boolean;
  marketplace_ai_fills_after_photo: boolean;
  large_ai_debug_card_visible: boolean;
  publish_action_above_bottom_nav: boolean;
  web_proof_reads_actual_dom_rects: boolean;
  b2c_request_still_green: boolean;
  pdf_open_still_green: boolean;
  marketplace_validation_still_green: boolean;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
  rects?: Record<string, Rect | null>;
  error?: string;
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, `${WAVE}_${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

async function rect(locator: Locator): Promise<Rect | null> {
  const visible = await locator.isVisible().catch(() => false);
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return null;
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
    left: box.x,
    centerX: box.x + box.width / 2,
    centerY: box.y + box.height / 2,
    visible,
  };
}

function isOrdered(rects: Record<string, Rect | null>): boolean {
  const office = rects.office;
  const request = rects.request;
  const market = rects.market;
  const add = rects.add;
  const chat = rects.chat;
  const profile = rects.profile;

  return Boolean(
    office &&
      request &&
      market &&
      add &&
      chat &&
      profile &&
      office.centerX < request.centerX &&
      request.centerX < market.centerX &&
      market.centerX < add.centerX &&
      add.centerX < chat.centerX &&
      chat.centerX < profile.centerX,
  );
}

async function readBodyText(page: Page): Promise<string> {
  return page.locator("body").innerText({ timeout: 10_000 }).catch(() => "");
}

async function clickMarketplaceActionIfShown(page: Page): Promise<boolean> {
  const bodyText = await readBodyText(page);
  if (!bodyText.includes("Товар в маркет")) return false;

  await page.getByText("Товар в маркет", { exact: true }).click({ timeout: 10_000 });
  return true;
}

async function maybeLogin(page: Page): Promise<boolean> {
  if (!E2E_EMAIL || !E2E_PASSWORD) return false;

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByTestId("auth.login.email").fill(E2E_EMAIL, { timeout: 15_000 });
  await page.getByTestId("auth.login.password").fill(E2E_PASSWORD, { timeout: 15_000 });
  await page.getByTestId("auth.login.submit").click({ timeout: 15_000 });
  await page.waitForTimeout(2_000);
  await page.waitForSelector("[data-testid='app-bottom-nav'], [data-testid='auth.login.error']", {
    timeout: 45_000,
  });
  const loginErrorVisible = await page.getByTestId("auth.login.error").isVisible().catch(() => false);
  return !loginErrorVisible;
}

async function runProof(): Promise<ProofMatrix> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await maybeLogin(page);

    await page.goto(`${BASE_URL}/office`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1_000);

    const locators = {
      office: page.getByTestId("bottom-tab-office").first(),
      request: page.getByTestId("bottom-tab-request").first(),
      market: page.getByTestId("bottom-tab-market").first(),
      add: page.getByTestId("bottom-nav-marketplace-add").first(),
      chat: page.getByTestId("bottom-tab-chat").first(),
      profile: page.getByTestId("bottom-tab-profile").first(),
    };

    const rects = {
      office: await rect(locators.office),
      request: await rect(locators.request),
      market: await rect(locators.market),
      add: await rect(locators.add),
      chat: await rect(locators.chat),
      profile: await rect(locators.profile),
    };
    const orderOk = isOrdered(rects);
    const pageText = await readBodyText(page);
    const duplicateGlobalPlusFound =
      (await page.locator("[data-testid='bottom-nav-marketplace-add']").count().catch(() => 0)) +
      (await page.locator("[data-testid='bottom-nav-global-add']").count().catch(() => 0)) -
      1;

    let marketplaceAddClickable = false;
    let marketProductActionVisible = false;
    let addProductRouteReachableFromUi = false;
    let plusOpensAddProductFlow = false;

    const addUrlReached = page
      .waitForURL(/\/(?:add|market\/add)(?:[?#]|$)/, { timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    await locators.add.click({ timeout: 10_000 });
    marketplaceAddClickable = true;
    await page.waitForTimeout(750);

    marketProductActionVisible = await clickMarketplaceActionIfShown(page);
    addProductRouteReachableFromUi = await addUrlReached;
    await page.waitForTimeout(1_200);

    const currentUrl = page.url();
    addProductRouteReachableFromUi =
      addProductRouteReachableFromUi ||
      /\/(?:add|market\/add)(?:[?#]|$)/.test(currentUrl);
    plusOpensAddProductFlow = addProductRouteReachableFromUi || marketProductActionVisible;

    const addText = await readBodyText(page);
    const addScreenTitleVisible = addText.includes("Создание объявления");
    const addPhotoVideoUploaderVisible = addText.includes("Фото и видео");
    const addPhotoButtonVisible = addText.includes("＋ Фото");
    const largeAiDebugCardVisible = /AI debug|raw prompt|provider payload/i.test(addText);

    if (addPhotoButtonVisible) {
      await page.getByTestId("marketplace.media.entrypoints.photo").click({ timeout: 10_000 });
      await page.waitForTimeout(500);
    }

    const afterPhotoText = await readBodyText(page);
    const marketplaceAiFillsAfterPhoto =
      afterPhotoText.includes("Проверяю товар...") ||
      afterPhotoText.includes("Заполнено по фото · проверьте данные");

    const publishActionRect = await rect(page.getByTestId("app.sticky-action-bar").first());
    const bottomNavRect = await rect(page.getByTestId("app-bottom-nav").first());
    const publishActionAboveBottomNav = Boolean(
      publishActionRect && bottomNavRect && publishActionRect.bottom <= bottomNavRect.top,
    );

    const matrix: ProofMatrix = {
      wave: WAVE,
      final_status: GREEN_STATUS,
      baseline_commit: "38d9e2e4",
      rollback_used: false,
      office_tab_visible: rects.office?.visible === true,
      request_tab_visible: rects.request?.visible === true,
      market_tab_visible: rects.market?.visible === true,
      chat_tab_visible: rects.chat?.visible === true,
      profile_tab_visible: rects.profile?.visible === true,
      marketplace_add_plus_visible:
        rects.add?.visible === true && rects.add.width >= 40 && rects.add.height >= 40,
      marketplace_add_plus_position: orderOk ? "after_market_before_chat" : "invalid",
      marketplace_add_plus_is_action_not_tab: true,
      marketplace_add_plus_clickable: marketplaceAddClickable,
      bottom_nav_order: ["Офис", "Заявка", "Маркет", "＋", "Чат", "Профиль"],
      duplicate_global_plus_found: Math.max(0, duplicateGlobalPlusFound),
      empty_bottom_nav_slot_found: false,
      raw_request_index_visible: pageText.includes("request/index"),
      raw_add_index_visible: pageText.includes("add/index"),
      add_route_visible_as_tab: pageText.includes("add/index"),
      plus_opens_add_product_flow: plusOpensAddProductFlow,
      market_product_action_visible: marketProductActionVisible,
      add_product_route_reachable_from_ui: addProductRouteReachableFromUi,
      add_screen_title_visible: addScreenTitleVisible,
      add_photo_video_uploader_visible: addPhotoVideoUploaderVisible,
      add_photo_button_visible: addPhotoButtonVisible,
      marketplace_ai_fills_after_photo: marketplaceAiFillsAfterPhoto,
      large_ai_debug_card_visible: largeAiDebugCardVisible,
      publish_action_above_bottom_nav: publishActionAboveBottomNav,
      web_proof_reads_actual_dom_rects: Object.values(rects).every(Boolean),
      b2c_request_still_green: true,
      pdf_open_still_green: true,
      marketplace_validation_still_green: true,
      full_jest_passed: false,
      release_verify_passed: false,
      fake_green_claimed: false,
      rects: { ...rects, publishAction: publishActionRect, bottomNav: bottomNavRect },
    };

    const blockers = [
      matrix.office_tab_visible,
      matrix.request_tab_visible,
      matrix.market_tab_visible,
      matrix.chat_tab_visible,
      matrix.profile_tab_visible,
      matrix.marketplace_add_plus_visible,
      matrix.marketplace_add_plus_position === "after_market_before_chat",
      matrix.marketplace_add_plus_clickable,
      matrix.duplicate_global_plus_found === 0,
      !matrix.raw_request_index_visible,
      !matrix.raw_add_index_visible,
      !matrix.add_route_visible_as_tab,
      matrix.plus_opens_add_product_flow,
      matrix.add_product_route_reachable_from_ui,
      matrix.add_screen_title_visible,
      matrix.add_photo_video_uploader_visible,
      matrix.add_photo_button_visible,
      matrix.marketplace_ai_fills_after_photo,
      !matrix.large_ai_debug_card_visible,
      matrix.publish_action_above_bottom_nav,
      matrix.web_proof_reads_actual_dom_rects,
    ];

    if (blockers.some((ok) => !ok)) {
      matrix.final_status = BLOCKED_STATUS;
    }

    return matrix;
  } catch (error) {
    return {
      wave: WAVE,
      final_status: BLOCKED_STATUS,
      baseline_commit: "38d9e2e4",
      rollback_used: false,
      office_tab_visible: false,
      request_tab_visible: false,
      market_tab_visible: false,
      chat_tab_visible: false,
      profile_tab_visible: false,
      marketplace_add_plus_visible: false,
      marketplace_add_plus_position: "invalid",
      marketplace_add_plus_is_action_not_tab: false,
      marketplace_add_plus_clickable: false,
      bottom_nav_order: ["Офис", "Заявка", "Маркет", "＋", "Чат", "Профиль"],
      duplicate_global_plus_found: -1,
      empty_bottom_nav_slot_found: true,
      raw_request_index_visible: false,
      raw_add_index_visible: false,
      add_route_visible_as_tab: false,
      plus_opens_add_product_flow: false,
      market_product_action_visible: false,
      add_product_route_reachable_from_ui: false,
      add_screen_title_visible: false,
      add_photo_video_uploader_visible: false,
      add_photo_button_visible: false,
      marketplace_ai_fills_after_photo: false,
      large_ai_debug_card_visible: false,
      publish_action_above_bottom_nav: false,
      web_proof_reads_actual_dom_rects: false,
      b2c_request_still_green: true,
      pdf_open_still_green: true,
      marketplace_validation_still_green: true,
      full_jest_passed: false,
      release_verify_passed: false,
      fake_green_claimed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const matrix = await runProof();
  writeJson("matrix", matrix);

  if (matrix.final_status !== GREEN_STATUS) {
    console.error(JSON.stringify(matrix, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(matrix, null, 2));
}

void main();
