import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Browser, type BrowserContext, type Page, type Route } from "playwright";

const projectRoot = process.cwd();
type SmokeTarget = "web" | "android-chrome";
const smokeTarget: SmokeTarget = process.env.MARKET_ADD_SMOKE_TARGET === "android-chrome"
  ? "android-chrome"
  : "web";
const fakeSupabaseUrl = "http://127.0.0.1:54321";
const artifactBaseName = smokeTarget === "android-chrome"
  ? "market-add-android-chrome-media-publish-smoke"
  : "market-add-web-media-publish-smoke";
const artifactJsonPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.json`);
const artifactMdPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.md`);
const screenshotPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.png`);
const serverStdoutPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stdout.log`);
const serverStderrPath = path.join(projectRoot, "artifacts", `${artifactBaseName}.stderr.log`);

const USER_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const UPLOAD_SESSION_ID = "33333333-3333-4333-8333-333333333333";
const MEDIA_ASSET_ID = "44444444-4444-4444-8444-444444444444";
const LISTING_ID = "55555555-5555-4555-8555-555555555555";
const MEDIA_LINK_ID = "66666666-6666-4666-8666-666666666666";
const SUPABASE_AUTH_STORAGE_KEYS = [
  "sb-nxrnjywzxxfdpqmzjorh-auth-token",
  "sb-127-auth-token",
  "sb-127.0.0.1-auth-token",
] as const;

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

type FakeSupabaseCapture = {
  uploadSessionRequests: unknown[];
  uploadedStoragePaths: string[];
  completedUploadRequests: unknown[];
  listingInsertPayloads: unknown[];
  mediaConfirmRequests: unknown[];
  unhandledRequests: Array<{ method: string; url: string }>;
};

type SmokeResult = {
  checkedAt: string;
  status: "GREEN" | "NOT_GREEN";
  target: SmokeTarget;
  baseUrl: string;
  currentUrl: string | null;
  openStep: string | null;
  webServerStartedByVerifier: boolean;
  photoLimit: 5;
  selectedPhotoDisplayed: boolean;
  previewModalDisplayed: boolean;
  listingInserted: boolean;
  mediaLinkConfirmed: boolean;
  productImageDisplayed: boolean;
  listingId: string | null;
  mediaAssetId: string | null;
  insertedMediaAssetIds: string[];
  insertedMediaAssets: Array<{ mediaAssetId: string; mediaKind: string }>;
  confirmPurposes: string[];
  dialogMessages: string[];
  consoleWarnMessages: string[];
  consoleErrorMessages: string[];
  consoleWarnClassifications: string[];
  consoleWarnUnclassifiedMessages: string[];
  uploadSessionCount: number;
  storageUploadCount: number;
  completedUploadCount: number;
  fieldValuesBeforePublish: string[];
  publishButtonDisabled: boolean | null;
  publishStateText: string | null;
  errorSummaryText: string | null;
  pageErrorCount: number;
  consoleErrorCount: number;
  consoleWarnCount: number;
  screenshot: string | null;
  unhandledFakeSupabaseRequests: FakeSupabaseCapture["unhandledRequests"];
  error?: string;
};

type WebServerHandle = {
  baseUrl: string;
  started: boolean;
  stop: () => void;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function writeText(fullPath: string, value: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
}

function classifyKnownBootConsoleWarning(message: string): string | null {
  if (message.includes('"shadow*" style props are deprecated. Use "boxShadow".')) {
    return "react-native-web-shadow-style-deprecation";
  }
  if (
    message.includes("[supabaseClient] SUPABASE_URL host") &&
    message.includes("127.0.0.1:54321")
  ) {
    return "local-fake-supabase-host-warning";
  }
  if (
    message.startsWith("Require cycle: src/lib/estimateStructuredPipeline/") ||
    message.startsWith("Require cycle: src/lib/ai/constructionFormulas/resolveConstructionQuantityFormula.ts") ||
    message.startsWith("Require cycle: src/lib/ai/globalEstimate/globalEstimateCalculator.ts")
  ) {
    return "existing-ai-module-require-cycle-warning";
  }
  return null;
}

function writeJson(fullPath: string, value: unknown) {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function stopProcessTree(child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function adbArgs(args: string[]): string[] {
  const serial = String(process.env.ADB_SERIAL ?? "").trim();
  return serial ? ["-s", serial, ...args] : args;
}

function runAdb(args: string[]) {
  return spawnSync("adb", adbArgs(args), {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function ensureAdbOk(args: string[], errorMessage: string) {
  const result = runAdb(args);
  if (result.status !== 0) {
    throw new Error(`${errorMessage}: ${result.stderr || result.stdout || `adb ${args.join(" ")}`}`);
  }
  return result.stdout;
}

async function ensureAndroidChromeDevToolsReady() {
  const devices = ensureAdbOk(["devices"], "adb devices failed");
  if (!/\bdevice\b/.test(devices.split(/\r?\n/).slice(1).join("\n"))) {
    throw new Error("No online Android emulator/device for android-chrome smoke");
  }

  ensureAdbOk(
    ["shell", "am", "start", "-n", "com.android.chrome/com.google.android.apps.chrome.Main", "-d", "about:blank"],
    "Failed to launch Android Chrome",
  );
  await sleep(2_000);
  ensureAdbOk(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"], "Failed to forward Chrome DevTools");

  await poll(
    "market-add-android-chrome-smoke:cdp-ready",
    async () => {
      try {
        const response = await fetch("http://127.0.0.1:9222/json/version");
        return response.ok ? true : null;
      } catch {
        return null;
      }
    },
    20_000,
    500,
  );
}

async function findFreePort(startAt = 8097): Promise<number> {
  for (let port = startAt; port < startAt + 40; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => {
        server.close(() => resolve(true));
      });
      server.listen(port, "127.0.0.1");
    });
    if (free) return port;
  }
  throw new Error("No free local port for market add web smoke");
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 500,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  writeText(serverStdoutPath, "");
  writeText(serverStderrPath, "");

  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "-c", "--port", String(port)]
      : ["expo", "start", "--web", "-c", "--port", String(port)],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        CI: process.env.CI ?? "1",
        BROWSER: "none",
        EXPO_NO_DOTENV: "1",
        EXPO_PUBLIC_SUPABASE_URL: fakeSupabaseUrl,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "market-add-web-smoke-anon-key",
        EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "1",
        EXPO_PUBLIC_RELEASE_CHANNEL: "local",
        EXPO_PUBLIC_APP_ENV: "local",
        EXPO_PUBLIC_JOB_QUEUE_ENABLED: "0",
        JOB_QUEUE_ENABLED: "0",
      },
    },
  );

  child.stdout.on("data", (chunk) => fs.appendFileSync(serverStdoutPath, String(chunk)));
  child.stderr.on("data", (chunk) => fs.appendFileSync(serverStderrPath, String(chunk)));

  await poll(
    "market-add-web-smoke:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(serverStderrPath)
          ? fs.readFileSync(serverStderrPath, "utf8").slice(-3000)
          : "";
        throw new Error(`expo web server exited early (${child.exitCode}): ${stderr}`);
      }
      try {
        const response = await fetch(`${baseUrl}/market`);
        return response.ok ? true : null;
      } catch {
        return null;
      }
    },
    240_000,
    1_000,
  );

  if (smokeTarget === "android-chrome") {
    ensureAdbOk(["reverse", `tcp:${port}`, `tcp:${port}`], "Failed to reverse Expo web port to Android emulator");
  }

  return {
    baseUrl,
    started: true,
    stop: () => {
      if (smokeTarget === "android-chrome") {
        runAdb(["reverse", "--remove", `tcp:${port}`]);
      }
      stopProcessTree(child);
    },
  };
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "*",
};

function buildPublishedListingScopeRow() {
  return {
    id: LISTING_ID,
    name: "Web smoke marketplace photo",
    title: "Web smoke marketplace photo",
    category: "material",
    price: 1200,
    supplier_id: COMPANY_ID,
    supplier_name: "Smoke Supplier LLC",
    in_stock: true,
    unit: "шт",
    image_url: `${fakeSupabaseUrl}/storage/v1/object/public/public-marketplace-media/${COMPANY_ID}/market-add-web-smoke.png`,
    user_id: USER_ID,
    company_id: COMPANY_ID,
    seller_display_name: "Smoke Supplier LLC",
    city: "Бишкек",
    kind: "material",
    side: "offer",
    description: "Фото реально выбрано, отображено и отправлено в публикацию.",
    contacts_phone: "+996700111222",
    contacts_whatsapp: "+996700111222",
    contacts_email: "seller@example.test",
    items_json: [],
    erp_items_json: [],
    uom: "шт",
    uom_code: "шт",
    rik_code: null,
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    primary_rik_code: null,
    stock_qty_available: 1,
    stock_uom: "шт",
    total_available_count: 1,
    stock_match_count: 1,
    erp_item_count: 0,
    total_count: 1,
    active_demand_count: 0,
  };
}

async function routeJson(route: Route, value: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify(value),
  });
}

async function readRequestJson(route: Route): Promise<unknown> {
  const body = route.request().postData();
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function installFakeSupabase(context: BrowserContext, capture: FakeSupabaseCapture) {
  await context.route(`${fakeSupabaseUrl}/**`, async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const pathName = url.pathname;

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders, body: "" });
      return;
    }

    if (method === "GET" && pathName === "/auth/v1/user") {
      await routeJson(route, {
        id: USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: "market-add-web-smoke@example.test",
        phone: "+996700111222",
        app_metadata: { role: "seller" },
        user_metadata: {
          full_name: "Market Add Web Smoke",
          role: "seller",
        },
      });
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/user_profiles") {
      await routeJson(route, {
        id: "profile-web-smoke",
        user_id: USER_ID,
        full_name: "Market Add Web Smoke",
        phone: "+996700111222",
        city: "Бишкек",
        usage_market: true,
        usage_build: false,
        bio: null,
        telegram: null,
        whatsapp: "+996700111222",
        position: null,
      });
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/companies") {
      await routeJson(route, {
        id: COMPANY_ID,
        owner_user_id: USER_ID,
        name: "Smoke Supplier LLC",
        city: "Бишкек",
        phone_main: "+996700111222",
        phone_whatsapp: "+996700111222",
        email: "seller@example.test",
      });
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/company_members") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/tenders") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/auctions") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/catalog_items") {
      await routeJson(route, []);
      return;
    }

    if (method === "GET" && pathName === "/rest/v1/market_listings") {
      await routeJson(route, []);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/get_my_role") {
      await routeJson(route, "supplier");
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/ensure_my_profile") {
      await routeJson(route, null);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/marketplace_items_scope_page_v1") {
      await routeJson(route, capture.mediaConfirmRequests.length > 0 ? [buildPublishedListingScopeRow()] : []);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/marketplace_item_scope_detail_v1") {
      await routeJson(route, capture.mediaConfirmRequests.length > 0 ? buildPublishedListingScopeRow() : null);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/submit_jobs_claim") {
      await routeJson(route, []);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/submit_jobs_recover_stuck") {
      await routeJson(route, 0);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/media_backend_create_upload_session") {
      capture.uploadSessionRequests.push(await readRequestJson(route));
      await routeJson(route, UPLOAD_SESSION_ID);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/media_backend_complete_upload_session") {
      capture.completedUploadRequests.push(await readRequestJson(route));
      await routeJson(route, MEDIA_ASSET_ID);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/rpc/media_backend_confirm_link") {
      capture.mediaConfirmRequests.push(await readRequestJson(route));
      await routeJson(route, MEDIA_LINK_ID);
      return;
    }

    if (method === "POST" && pathName === "/rest/v1/market_listings") {
      capture.listingInsertPayloads.push(await readRequestJson(route));
      await routeJson(route, { id: LISTING_ID }, 201);
      return;
    }

    if ((method === "POST" || method === "PUT") && pathName.startsWith("/storage/v1/object/public-marketplace-media/")) {
      capture.uploadedStoragePaths.push(pathName);
      await routeJson(route, { Key: pathName.replace("/storage/v1/object/", "") });
      return;
    }

    if (method === "GET" && pathName.startsWith("/storage/v1/object/public/public-marketplace-media/")) {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": "image/png",
          "cache-control": "no-store",
        },
        body: onePixelPng,
      });
      return;
    }

    capture.unhandledRequests.push({ method, url: request.url() });
    await route.fulfill({
      status: 404,
      headers: {
        ...corsHeaders,
        "content-type": "application/json",
      },
      body: JSON.stringify({ error: `Unhandled fake Supabase request: ${method} ${pathName}` }),
    });
  });
}

async function fillNthField(page: Page, index: number, value: string) {
  const fields = page
    .locator('[data-testid="add-listing-owner-shell"]')
    .locator('input:not([type="file"]), textarea');
  await fields.nth(index).waitFor({ state: "visible", timeout: 30_000 });
  await fields.nth(index).fill(value);
}

async function readFieldValues(page: Page): Promise<string[]> {
  return page
    .locator('[data-testid="add-listing-owner-shell"]')
    .locator('input:not([type="file"]), textarea')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
          return node.value;
        }
        return "";
      }),
    );
}

async function openAddListingScreen(page: Page, baseUrl: string): Promise<string> {
  const shell = page.locator('[data-testid="add-listing-owner-shell"]');

  await page.goto(`${baseUrl}/add`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  try {
    await shell.waitFor({ state: "visible", timeout: 45_000 });
    return "direct-add-route";
  } catch {
    await page.goto(`${baseUrl}/market`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
  }

  const addButton = page.locator('[data-testid="bottom-nav-marketplace-add"]');
  await addButton.waitFor({ state: "visible", timeout: 90_000 });
  await addButton.click();
  try {
    await shell.waitFor({ state: "visible", timeout: 15_000 });
    return "bottom-nav-click";
  } catch {
    await page.goto(`${baseUrl}/add`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await shell.waitFor({ state: "visible", timeout: 90_000 });
    return "direct-add-route";
  }
}

function normalizeMediaAssets(value: unknown): Array<{ mediaAssetId: string; mediaKind: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return [{
      mediaAssetId: String(record.mediaAssetId ?? ""),
      mediaKind: String(record.mediaKind ?? ""),
    }];
  });
}

function readInsertedMediaAssetIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const value = record.marketplaceMediaAssetIds ?? record.mediaAssetIds;
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function readInsertedMediaAssets(payload: unknown): Array<{ mediaAssetId: string; mediaKind: string }> {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  return normalizeMediaAssets(record.marketplaceMediaAssets ?? record.mediaAssets);
}

function readConfirmMediaAssetIds(payloads: readonly unknown[]): string[] {
  return payloads.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const value = (entry as Record<string, unknown>).p_media_asset_id;
    return typeof value === "string" && value.trim() ? [value.trim()] : [];
  });
}

async function runSmoke(): Promise<SmokeResult> {
  if (smokeTarget === "android-chrome") {
    await ensureAndroidChromeDevToolsReady();
  }
  const server = await ensureLocalWebServer();
  let browser: Browser;
  let context: BrowserContext;
  if (smokeTarget === "android-chrome") {
    browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    context = browser.contexts()[0] ?? await browser.newContext();
    await context.setGeolocation({ latitude: 42.8746, longitude: 74.5698 });
    await context.grantPermissions(["geolocation"], { origin: server.baseUrl });
  } else {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      geolocation: { latitude: 42.8746, longitude: 74.5698 },
      permissions: ["geolocation"],
    });
  }
  await context.addInitScript(
    ({ storageKeys, userId }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
      const user = {
        id: userId,
        aud: "authenticated",
        role: "authenticated",
        email: "market-add-web-smoke@example.test",
        phone: "+996700111222",
        app_metadata: { role: "seller" },
        user_metadata: {
          full_name: "Market Add Web Smoke",
          role: "seller",
        },
      };
      window.localStorage.setItem("rik.office.localDeveloperFullAccess", "1");
      const session = JSON.stringify({
        access_token: "market-add-web-smoke-access-token",
        refresh_token: "market-add-web-smoke-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
        user,
      });
      for (const storageKey of storageKeys) {
        window.localStorage.setItem(storageKey, session);
      }
    },
    { storageKeys: SUPABASE_AUTH_STORAGE_KEYS, userId: USER_ID },
  );

  const capture: FakeSupabaseCapture = {
    uploadSessionRequests: [],
    uploadedStoragePaths: [],
    completedUploadRequests: [],
    listingInsertPayloads: [],
    mediaConfirmRequests: [],
    unhandledRequests: [],
  };
  await installFakeSupabase(context, capture);

  const page = context.pages()[0] ?? await context.newPage();
  const runtime = {
    pageErrorCount: 0,
    consoleErrorCount: 0,
    consoleWarnCount: 0,
    dialogMessages: [] as string[],
    consoleWarnMessages: [] as string[],
    consoleErrorMessages: [] as string[],
    consoleWarnClassifications: [] as string[],
    consoleWarnUnclassifiedMessages: [] as string[],
  };
  page.on("pageerror", () => {
    runtime.pageErrorCount += 1;
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtime.consoleErrorCount += 1;
      runtime.consoleErrorMessages.push(message.text());
    }
    if (message.type() === "warning") {
      runtime.consoleWarnCount += 1;
      const text = message.text();
      runtime.consoleWarnMessages.push(text);
      const classification = classifyKnownBootConsoleWarning(text);
      if (classification) {
        runtime.consoleWarnClassifications.push(classification);
      } else {
        runtime.consoleWarnUnclassifiedMessages.push(text);
      }
    }
  });
  page.on("dialog", async (dialog) => {
    runtime.dialogMessages.push(`${dialog.type()}:${dialog.message()}`);
    await dialog.accept().catch(() => undefined);
  });

  let selectedPhotoDisplayed = false;
  let previewModalDisplayed = false;
  let productImageDisplayed = false;
  let screenshot: string | null = null;
  let openStep: string | null = null;
  let fieldValuesBeforePublish: string[] = [];
  let publishButtonDisabled: boolean | null = null;
  let publishStateText: string | null = null;
  let errorSummaryText: string | null = null;

  try {
    openStep = await openAddListingScreen(page, server.baseUrl);

    const addMediaTile = page.locator('[data-testid="marketplace.media.entrypoints.add-media-tile"]');
    await addMediaTile.scrollIntoViewIfNeeded();
    await addMediaTile.click();
    await page.locator('[data-testid="marketplace.media.entrypoints.picker-sheet"]').waitFor({
      state: "visible",
      timeout: 30_000,
    });
    const chooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
    const galleryPhotoButton = page.locator('[data-testid="marketplace.media.entrypoints.gallery_photo_button"]');
    await galleryPhotoButton.click();
    const chooser = await chooserPromise;
    await chooser.setFiles({
      name: "market-add-web-smoke.png",
      mimeType: "image/png",
      buffer: onePixelPng,
    });

    const thumbnail = page.locator('[data-testid="marketplace.media.entrypoints.thumbnail.0"]');
    await thumbnail.waitFor({ state: "visible", timeout: 45_000 });
    await page.locator('[data-testid="marketplace.media.entrypoints.preview-image.0"]').waitFor({
      state: "visible",
      timeout: 45_000,
    });
    selectedPhotoDisplayed = true;

    await page.locator('[data-testid="marketplace.media.entrypoints.thumbnail.open.0"]').click();
    await page.locator('[data-testid="marketplace.media.entrypoints.preview-modal.image"]').waitFor({
      state: "visible",
      timeout: 30_000,
    });
    previewModalDisplayed = true;
    await page.locator('[data-testid="marketplace.media.entrypoints.preview-modal.close"]').click();

    await page.locator('[data-testid="market-add-kind-material"]').click();
    await fillNthField(page, 0, "Web smoke marketplace photo");
    await fillNthField(page, 1, "Фото реально выбрано, отображено и отправляется в публикацию.");
    await fillNthField(page, 2, "Бишкек");
    await fillNthField(page, 3, "1200");
    await fillNthField(page, 4, "+996700111222");

    fieldValuesBeforePublish = await readFieldValues(page);
    const publishButton = page.locator('[data-testid="add-listing-flow-publish"]');
    await publishButton.waitFor({ state: "visible", timeout: 30_000 });
    publishButtonDisabled = await publishButton.evaluate((node) =>
      node instanceof HTMLButtonElement ? node.disabled : node.getAttribute("aria-disabled") === "true",
    );
    await publishButton.click({ force: true });
    await page.waitForTimeout(1500);
    publishStateText = await page.locator('[data-testid="market-add-publish-state"]').textContent({ timeout: 500 }).catch(() => null);
    errorSummaryText = await page.locator('[data-testid="market-add-error-summary"]').textContent({ timeout: 500 }).catch(() => null);

    await poll(
      "market-add-web-smoke:listing-inserted-and-media-linked",
      () => capture.listingInsertPayloads.length > 0 && capture.mediaConfirmRequests.length > 0 ? true : null,
      45_000,
      500,
    );

    await page.goto(`${server.baseUrl}/product/${LISTING_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.locator('[data-testid="market_product_hero_image"]').waitFor({
      state: "visible",
      timeout: 45_000,
    });
    productImageDisplayed = true;

    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({
      path: screenshotPath,
      fullPage: smokeTarget !== "android-chrome",
      timeout: smokeTarget === "android-chrome" ? 10_000 : 30_000,
    }).then(() => {
      screenshot = path.relative(projectRoot, screenshotPath).replace(/\\/g, "/");
    }).catch(() => {
      screenshot = fs.existsSync(screenshotPath)
        ? path.relative(projectRoot, screenshotPath).replace(/\\/g, "/")
        : null;
    });

    const insertedPayload = capture.listingInsertPayloads[0] as Record<string, unknown> | undefined;
    const insertedMediaAssetIds = readInsertedMediaAssetIds(insertedPayload);
    const linkedMediaAssetIds = readConfirmMediaAssetIds(capture.mediaConfirmRequests);
    const insertedMediaAssets = readInsertedMediaAssets(insertedPayload);
    const confirmPurposes = capture.mediaConfirmRequests.map((entry) =>
      String((entry as Record<string, unknown> | null)?.p_purpose ?? ""),
    );
    const mediaLinkConfirmed = confirmPurposes.includes("product_photo");
    const listingInserted = capture.listingInsertPayloads.length > 0;
    const status =
      selectedPhotoDisplayed &&
      previewModalDisplayed &&
      listingInserted &&
      mediaLinkConfirmed &&
      linkedMediaAssetIds.includes(MEDIA_ASSET_ID) &&
      productImageDisplayed &&
      runtime.pageErrorCount === 0 &&
      runtime.consoleErrorCount === 0 &&
      runtime.consoleWarnUnclassifiedMessages.length === 0 &&
      capture.unhandledRequests.length === 0
        ? "GREEN"
        : "NOT_GREEN";

    return {
      checkedAt: new Date().toISOString(),
      status,
      target: smokeTarget,
      baseUrl: server.baseUrl,
      currentUrl: page.url(),
      openStep,
      webServerStartedByVerifier: server.started,
      photoLimit: 5,
      selectedPhotoDisplayed,
      previewModalDisplayed,
      productImageDisplayed,
      listingInserted,
      mediaLinkConfirmed,
      listingId: listingInserted ? LISTING_ID : null,
      mediaAssetId: linkedMediaAssetIds[0] ?? insertedMediaAssetIds[0] ?? null,
      insertedMediaAssetIds: linkedMediaAssetIds.length ? linkedMediaAssetIds : insertedMediaAssetIds,
      insertedMediaAssets,
      confirmPurposes,
      dialogMessages: runtime.dialogMessages,
      consoleWarnMessages: runtime.consoleWarnMessages.slice(0, 30),
      consoleErrorMessages: runtime.consoleErrorMessages.slice(0, 30),
      consoleWarnClassifications: [...new Set(runtime.consoleWarnClassifications)].sort(),
      consoleWarnUnclassifiedMessages: runtime.consoleWarnUnclassifiedMessages.slice(0, 30),
      uploadSessionCount: capture.uploadSessionRequests.length,
      storageUploadCount: capture.uploadedStoragePaths.length,
      completedUploadCount: capture.completedUploadRequests.length,
      fieldValuesBeforePublish,
      publishButtonDisabled,
      publishStateText,
      errorSummaryText,
      pageErrorCount: runtime.pageErrorCount,
      consoleErrorCount: runtime.consoleErrorCount,
      consoleWarnCount: runtime.consoleWarnCount,
      screenshot,
      unhandledFakeSupabaseRequests: capture.unhandledRequests,
    };
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      checkedAt: new Date().toISOString(),
      status: "NOT_GREEN",
      target: smokeTarget,
      baseUrl: server.baseUrl,
      currentUrl: page.url(),
      openStep,
      webServerStartedByVerifier: server.started,
      photoLimit: 5,
      selectedPhotoDisplayed,
      previewModalDisplayed,
      productImageDisplayed,
      listingInserted: capture.listingInsertPayloads.length > 0,
      mediaLinkConfirmed: capture.mediaConfirmRequests.length > 0,
      listingId: capture.listingInsertPayloads.length > 0 ? LISTING_ID : null,
      mediaAssetId: null,
      insertedMediaAssetIds: [],
      insertedMediaAssets: [],
      confirmPurposes: capture.mediaConfirmRequests.map((entry) =>
        String((entry as Record<string, unknown> | null)?.p_purpose ?? ""),
      ),
      dialogMessages: runtime.dialogMessages,
      consoleWarnMessages: runtime.consoleWarnMessages.slice(0, 30),
      consoleErrorMessages: runtime.consoleErrorMessages.slice(0, 30),
      consoleWarnClassifications: [...new Set(runtime.consoleWarnClassifications)].sort(),
      consoleWarnUnclassifiedMessages: runtime.consoleWarnUnclassifiedMessages.slice(0, 30),
      uploadSessionCount: capture.uploadSessionRequests.length,
      storageUploadCount: capture.uploadedStoragePaths.length,
      completedUploadCount: capture.completedUploadRequests.length,
      fieldValuesBeforePublish,
      publishButtonDisabled,
      publishStateText,
      errorSummaryText,
      pageErrorCount: runtime.pageErrorCount,
      consoleErrorCount: runtime.consoleErrorCount,
      consoleWarnCount: runtime.consoleWarnCount,
      screenshot: fs.existsSync(screenshotPath)
        ? path.relative(projectRoot, screenshotPath).replace(/\\/g, "/")
        : null,
      unhandledFakeSupabaseRequests: capture.unhandledRequests,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }
}

function writeProof(result: SmokeResult) {
  writeJson(artifactJsonPath, result);
  writeText(
    artifactMdPath,
    [
      "# Market Add Web Media Publish Smoke",
      "",
      `status: ${result.status}`,
      `target: ${result.target}`,
      `baseUrl: ${result.baseUrl}`,
      `currentUrl: ${result.currentUrl ?? "-"}`,
      `openStep: ${result.openStep ?? "-"}`,
      `photoLimit: ${result.photoLimit}`,
      `selectedPhotoDisplayed: ${result.selectedPhotoDisplayed}`,
      `previewModalDisplayed: ${result.previewModalDisplayed}`,
      `productImageDisplayed: ${result.productImageDisplayed}`,
      `listingInserted: ${result.listingInserted}`,
      `mediaLinkConfirmed: ${result.mediaLinkConfirmed}`,
      `listingId: ${result.listingId ?? "-"}`,
      `mediaAssetId: ${result.mediaAssetId ?? "-"}`,
      `confirmPurposes: ${result.confirmPurposes.join(", ") || "-"}`,
      `dialogMessages: ${result.dialogMessages.join(" | ") || "-"}`,
      `consoleWarnMessages: ${result.consoleWarnMessages.join(" | ") || "-"}`,
      `consoleErrorMessages: ${result.consoleErrorMessages.join(" | ") || "-"}`,
      `consoleWarnClassifications: ${result.consoleWarnClassifications.join(", ") || "-"}`,
      `consoleWarnUnclassifiedMessages: ${result.consoleWarnUnclassifiedMessages.join(" | ") || "-"}`,
      `uploadSessionCount: ${result.uploadSessionCount}`,
      `storageUploadCount: ${result.storageUploadCount}`,
      `completedUploadCount: ${result.completedUploadCount}`,
      `fieldValuesBeforePublish: ${result.fieldValuesBeforePublish.join(" | ") || "-"}`,
      `publishButtonDisabled: ${result.publishButtonDisabled}`,
      `publishStateText: ${result.publishStateText ?? "-"}`,
      `errorSummaryText: ${result.errorSummaryText ?? "-"}`,
      `pageErrorCount: ${result.pageErrorCount}`,
      `consoleErrorCount: ${result.consoleErrorCount}`,
      `consoleWarnCount: ${result.consoleWarnCount}`,
      result.screenshot ? `screenshot: ${result.screenshot}` : "screenshot: -",
      "",
    ].join("\n"),
  );
}

runSmoke()
  .then((result) => {
    writeProof(result);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      status: result.status,
      target: result.target,
      selectedPhotoDisplayed: result.selectedPhotoDisplayed,
      previewModalDisplayed: result.previewModalDisplayed,
      productImageDisplayed: result.productImageDisplayed,
      listingInserted: result.listingInserted,
      mediaLinkConfirmed: result.mediaLinkConfirmed,
      listingId: result.listingId,
      mediaAssetId: result.mediaAssetId,
      screenshot: result.screenshot,
      pageErrorCount: result.pageErrorCount,
      consoleErrorCount: result.consoleErrorCount,
      consoleWarnCount: result.consoleWarnCount,
      consoleWarnUnclassifiedCount: result.consoleWarnUnclassifiedMessages.length,
      consoleWarnClassifications: result.consoleWarnClassifications,
    }, null, 2));
    if (result.status !== "GREEN") {
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    const result: SmokeResult = {
      checkedAt: new Date().toISOString(),
      status: "NOT_GREEN",
      target: smokeTarget,
      baseUrl: "",
      currentUrl: null,
      openStep: null,
      webServerStartedByVerifier: false,
      photoLimit: 5,
      selectedPhotoDisplayed: false,
      previewModalDisplayed: false,
      productImageDisplayed: false,
      listingInserted: false,
      mediaLinkConfirmed: false,
      listingId: null,
      mediaAssetId: null,
      insertedMediaAssetIds: [],
      insertedMediaAssets: [],
      confirmPurposes: [],
      dialogMessages: [],
      consoleWarnMessages: [],
      consoleErrorMessages: [],
      consoleWarnClassifications: [],
      consoleWarnUnclassifiedMessages: [],
      uploadSessionCount: 0,
      storageUploadCount: 0,
      completedUploadCount: 0,
      fieldValuesBeforePublish: [],
      publishButtonDisabled: null,
      publishStateText: null,
      errorSummaryText: null,
      pageErrorCount: 0,
      consoleErrorCount: 0,
      consoleWarnCount: 0,
      screenshot: null,
      unhandledFakeSupabaseRequests: [],
      error: error instanceof Error ? error.message : String(error),
    };
    writeProof(result);
    // eslint-disable-next-line no-console
    console.error(result.error);
    process.exitCode = 1;
  });
