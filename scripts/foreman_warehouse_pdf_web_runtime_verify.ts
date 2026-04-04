import fs from "node:fs";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  type RuntimeTestUser,
} from "./_shared/testUserDiscipline";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const baseUrl = String(process.env.RIK_WEB_BASE_URL ?? "http://localhost:8083").trim();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0] || "";
const supabaseStorageKey = `sb-${projectRef}-auth-token`;
const admin = createVerifierAdmin("foreman-warehouse-pdf-web-runtime-verify");

type RuntimeConsoleEntry = {
  type: string;
  text: string;
};

type RuntimeHttpEntry = {
  url: string;
  method: string;
  status: number;
};

type FunctionResponseEntry = RuntimeHttpEntry & {
  headers: Record<string, string>;
  requestHeaders: Record<string, string>;
  payload: unknown;
  signedUrl: string | null;
  sourceKind: string | null;
};

type RuntimeCapture = {
  console: RuntimeConsoleEntry[];
  pageErrors: string[];
  badResponses: RuntimeHttpEntry[];
  functionResponses: FunctionResponseEntry[];
};

type ProofResult = {
  status: "GREEN" | "NOT_GREEN";
  role: "foreman" | "warehouse";
  checkedAt: string;
  baseUrl: string;
  finalUrl: string;
  iframeSrc: string | null;
  eventCounts: Record<string, number>;
  pageErrors: string[];
  badResponses: RuntimeHttpEntry[];
  functionResponses: FunctionResponseEntry[];
  blockingConsole: RuntimeConsoleEntry[];
  consoleTail: RuntimeConsoleEntry[];
  extra?: Record<string, unknown>;
};

type PageRuntime = {
  runtime: RuntimeCapture;
  responseTasks: Promise<void>[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeBodyText(value: string) {
  return String(value || "").replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim();
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 45_000,
  delayMs = 300,
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

function countToken(entries: RuntimeConsoleEntry[], token: string) {
  return entries.filter((entry) => entry.text.includes(token)).length;
}

function writeJsonArtifact(relativePath: string, payload: unknown) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeHtmlArtifact(relativePath: string, page: Page) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, await page.content(), "utf8");
}

async function signInSession(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "foreman-warehouse-pdf-web-runtime-signin",
      },
    },
  });

  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw signIn.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return signIn.data.session;
}

function attachRuntime(page: Page, functionMatcher: RegExp): PageRuntime {
  const runtime: RuntimeCapture = {
    console: [],
    pageErrors: [],
    badResponses: [],
    functionResponses: [],
  };
  const responseTasks: Promise<void>[] = [];

  page.on("console", (message) => {
    runtime.console.push({ type: message.type(), text: message.text() });
  });

  page.on("pageerror", (error) => {
    runtime.pageErrors.push(String(error?.message ?? error));
  });

  page.on("response", (response) => {
    const entry = {
      url: response.url(),
      method: response.request().method(),
      status: response.status(),
    };

    if (response.status() >= 400) {
      runtime.badResponses.push(entry);
    }

    if (!functionMatcher.test(response.url())) return;

    responseTasks.push(
      (async () => {
        let payload: unknown = null;
        try {
          const raw = await response.text();
          payload = raw.trim() ? (JSON.parse(raw) as unknown) : null;
        } catch {
          payload = null;
        }

        const payloadRecord =
          payload && typeof payload === "object" && !Array.isArray(payload)
            ? (payload as Record<string, unknown>)
            : null;

        runtime.functionResponses.push({
          ...entry,
          headers: response.headers(),
          requestHeaders: response.request().headers(),
          payload,
          signedUrl: payloadRecord ? String(payloadRecord.signedUrl ?? "").trim() || null : null,
          sourceKind: payloadRecord ? String(payloadRecord.sourceKind ?? "").trim() || null : null,
        });
      })(),
    );
  });

  return { runtime, responseTasks };
}

async function createBrowser(): Promise<Browser> {
  return chromium.launch({
    channel: "msedge",
    headless: true,
  });
}

async function preparePage(page: Page, session: unknown) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: supabaseStorageKey,
      value: JSON.stringify(session),
    },
  );
}

async function waitForViewerReady(page: Page, runtime: RuntimeCapture) {
  await page.waitForURL(/\/pdf-viewer/i, { timeout: 45_000 });
  await poll(
    "web-viewer-ready",
    async () =>
      runtime.console.some((entry) => entry.text.includes("[pdf-viewer] ready")) ? true : null,
    45_000,
    500,
  );
  await sleep(1500);
}

async function saveProofArtifacts(relativeBase: string, page: Page, proof: ProofResult) {
  await page.screenshot({
    path: path.join(projectRoot, `${relativeBase}.png`),
    fullPage: true,
  });
  await writeHtmlArtifact(`${relativeBase}.html`, page);
  writeJsonArtifact(`${relativeBase}.json`, proof);
}

async function runForemanProof(browser: Browser): Promise<ProofResult> {
  let user: RuntimeTestUser | null = null;
  let requestId: string | null = null;
  let page: Page | null = null;

  try {
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Foreman Web PDF Proof",
      emailPrefix: "foreman-web-pdf-proof",
    });

    const requestInsert = await admin
      .from("requests")
      .insert({
        created_by: user.id,
        foreman_name: user.displayLabel,
        display_no: `REQ-WEB-${Date.now().toString(36).toUpperCase()}`,
        status: "pending",
      })
      .select("id, display_no, status")
      .single();

    if (requestInsert.error || !requestInsert.data) {
      throw requestInsert.error ?? new Error("Unable to insert Foreman proof request");
    }
    requestId = String(requestInsert.data.id);

    const session = await signInSession(user);
    const context = await browser.newContext();
    page = await context.newPage();
    const { runtime, responseTasks } = attachRuntime(page, /foreman-request-pdf/i);
    await preparePage(page, session);

    await page.goto(`${baseUrl}/foreman`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await sleep(4_000);

    let controls = page.locator('button,[role="button"],a[role="tab"],div[tabindex],input,textarea');
    await controls.nth(1).click({ force: true });
    await sleep(2_500);

    controls = page.locator('button,[role="button"],a[role="tab"],div[tabindex],input,textarea');
    await controls.nth(18).fill("Foreman Web PDF Proof");
    await controls.nth(19).click({ force: true });
    await sleep(2_000);

    controls = page.locator('button,[role="button"],a[role="tab"],div[tabindex],input,textarea');
    await controls.nth(9).click({ force: true });

    const pdfButton = page.locator(`[data-testid="foreman-history-pdf:${requestId}"]`).first();
    await pdfButton.waitFor({ state: "visible", timeout: 45_000 });
    await pdfButton.click({ force: true });

    await waitForViewerReady(page, runtime);
    await Promise.all(responseTasks);

    const proof: ProofResult = {
      status: "GREEN",
      role: "foreman",
      checkedAt: new Date().toISOString(),
      baseUrl,
      finalUrl: page.url(),
      iframeSrc: await page.locator("iframe").first().getAttribute("src").catch(() => null),
      eventCounts: {
        payload_ready: countToken(runtime.console, "payload_ready"),
        backend_invoke_start: countToken(runtime.console, "backend_invoke_start"),
        backend_invoke_success: countToken(runtime.console, "backend_invoke_success"),
        signed_url_received: countToken(runtime.console, "signed_url_received"),
        viewer_route_mounted: countToken(runtime.console, "[pdf-viewer] viewer_route_mounted"),
        open: countToken(runtime.console, "[pdf-viewer] open"),
        viewer_before_render: countToken(runtime.console, "[pdf-viewer] viewer_before_render"),
        web_iframe_render: countToken(runtime.console, "[pdf-viewer] web_iframe_render"),
        web_iframe_load: countToken(runtime.console, "[pdf-viewer] web_iframe_load"),
        ready: countToken(runtime.console, "[pdf-viewer] ready"),
        busy_cleared: countToken(runtime.console, "busy_cleared"),
      },
      pageErrors: runtime.pageErrors,
      badResponses: runtime.badResponses,
      functionResponses: runtime.functionResponses,
      blockingConsole: runtime.console.filter(
        (entry) => /error|failed|cors|preflight/i.test(entry.text) && !/favicon/i.test(entry.text),
      ),
      consoleTail: runtime.console.slice(-80),
      extra: {
        requestId,
        bodySample: normalizeBodyText(await page.evaluate(() => document.body.innerText || "")).slice(0, 1200),
      },
    };

    await saveProofArtifacts("artifacts/foreman-web-pdf-runtime-proof", page, proof);
    await context.close();
    return proof;
  } finally {
    if (requestId) {
      try {
        await admin.from("requests").delete().eq("id", requestId);
      } catch {
        // best effort cleanup
      }
    }
    await cleanupTempUser(admin, user).catch(() => undefined);
  }
}

async function runWarehouseProof(browser: Browser): Promise<ProofResult> {
  let user: RuntimeTestUser | null = null;
  let page: Page | null = null;

  try {
    user = await createTempUser(admin, {
      role: "warehouse",
      fullName: "Warehouse Web PDF Proof",
      emailPrefix: "warehouse-web-pdf-proof",
    });

    const session = await signInSession(user);
    const context = await browser.newContext();
    page = await context.newPage();
    const { runtime, responseTasks } = attachRuntime(page, /warehouse-pdf/i);
    await preparePage(page, session);

    await page.goto(`${baseUrl}/warehouse`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await sleep(3_000);

    let controls = page.locator('button,[role="button"],a[role="tab"],div[tabindex],input,textarea');
    await controls.nth(11).fill("Warehouse Web PDF Proof");
    await controls.nth(12).click({ force: true });
    await sleep(3_000);

    controls = page.locator('button,[role="button"],a[role="tab"],div[tabindex],input,textarea');
    await controls.nth(4).click({ force: true });
    await sleep(2_000);

    controls = page.locator('button,[role="button"],a[role="tab"],div[tabindex],input,textarea');
    await controls.nth(5).click({ force: true });

    const dayRow = page.locator('[data-testid^="warehouse-report-day:"]').first();
    await dayRow.waitFor({ state: "visible", timeout: 45_000 });
    await dayRow.click({ force: true });

    const registerButton = page.locator('[data-testid="warehouse-day-register-pdf"]').first();
    await registerButton.waitFor({ state: "visible", timeout: 45_000 });
    await registerButton.click({ force: true });

    await waitForViewerReady(page, runtime);
    await Promise.all(responseTasks);

    const proof: ProofResult = {
      status: "GREEN",
      role: "warehouse",
      checkedAt: new Date().toISOString(),
      baseUrl,
      finalUrl: page.url(),
      iframeSrc: await page.locator("iframe").first().getAttribute("src").catch(() => null),
      eventCounts: {
        payload_ready: countToken(runtime.console, "payload_ready"),
        backend_invoke_start: countToken(runtime.console, "backend_invoke_start"),
        backend_invoke_success: countToken(runtime.console, "backend_invoke_success"),
        signed_url_received: countToken(runtime.console, "signed_url_received"),
        viewer_route_mounted: countToken(runtime.console, "[pdf-viewer] viewer_route_mounted"),
        open: countToken(runtime.console, "[pdf-viewer] open"),
        viewer_before_render: countToken(runtime.console, "[pdf-viewer] viewer_before_render"),
        web_iframe_render: countToken(runtime.console, "[pdf-viewer] web_iframe_render"),
        web_iframe_load: countToken(runtime.console, "[pdf-viewer] web_iframe_load"),
        ready: countToken(runtime.console, "[pdf-viewer] ready"),
        busy_cleared: countToken(runtime.console, "busy_cleared"),
      },
      pageErrors: runtime.pageErrors,
      badResponses: runtime.badResponses,
      functionResponses: runtime.functionResponses,
      blockingConsole: runtime.console.filter(
        (entry) => /error|failed|cors|preflight/i.test(entry.text) && !/favicon/i.test(entry.text),
      ),
      consoleTail: runtime.console.slice(-80),
      extra: {
        bodySample: normalizeBodyText(await page.evaluate(() => document.body.innerText || "")).slice(0, 1200),
        dayRowsVisible: await page.locator('[data-testid^="warehouse-report-day:"]').count(),
      },
    };

    await saveProofArtifacts("artifacts/warehouse-web-pdf-runtime-proof", page, proof);
    await context.close();
    return proof;
  } finally {
    await cleanupTempUser(admin, user).catch(() => undefined);
  }
}

async function main() {
  const browser = await createBrowser();
  try {
    const foreman = await runForemanProof(browser);
    const warehouse = await runWarehouseProof(browser);

    writeJsonArtifact("artifacts/foreman-warehouse-web-pdf-runtime-summary.json", {
      status: foreman.status === "GREEN" && warehouse.status === "GREEN" ? "GREEN" : "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      baseUrl,
      foreman: {
        finalUrl: foreman.finalUrl,
        eventCounts: foreman.eventCounts,
        functionResponses: foreman.functionResponses,
        pageErrors: foreman.pageErrors,
        badResponses: foreman.badResponses,
      },
      warehouse: {
        finalUrl: warehouse.finalUrl,
        eventCounts: warehouse.eventCounts,
        functionResponses: warehouse.functionResponses,
        pageErrors: warehouse.pageErrors,
        badResponses: warehouse.badResponses,
      },
    });
  } finally {
    await browser.close().catch(() => undefined);
  }
}

void main();
