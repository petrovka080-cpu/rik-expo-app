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
const roleMode = String(process.env.RIK_PDF_WEB_ROLE_MODE ?? "membership").trim().toLowerCase();
const runtimeRoles = new Set(
  String(process.env.RIK_PDF_WEB_RUNTIME_ROLES ?? "foreman,warehouse")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

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

function redactSensitiveText(value: string) {
  return String(value ?? "")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .replace(/https:\/\/[^\s"']*storage\/v[^\s"']*/gi, "[signed-pdf-url:redacted]")
    .replace(
      /https:\/\/[^\s"']*\/storage\/v1\/object\/sign\/[^\s"']+/gi,
      "[signed-pdf-url:redacted]",
    )
    .replace(/(token=)[^&\s"']+/gi, "$1[redacted]")
    .replace(/(apikey[=:]\s*)[A-Za-z0-9._-]+/gi, "$1[redacted]");
}

function redactHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey === "authorization" ||
        normalizedKey === "apikey" ||
        normalizedKey === "cookie" ||
        normalizedKey === "set-cookie"
      ) {
        return [key, "[redacted]"];
      }
      return [key, redactSensitiveText(value)];
    }),
  );
}

function redactPayload(value: unknown): unknown {
  if (typeof value === "string") return redactSensitiveText(value);
  if (Array.isArray(value)) return value.map(redactPayload);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      const normalizedKey = key.toLowerCase();
      if (
        normalizedKey === "authorization" ||
        normalizedKey === "apikey" ||
        normalizedKey === "token"
      ) {
        return [key, "[redacted]"];
      }
      return [key, redactPayload(child)];
    }),
  );
}

function writeJsonArtifact(relativePath: string, payload: unknown) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function writeHtmlArtifact(relativePath: string, page: Page) {
  const fullPath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, redactSensitiveText(await page.content()), "utf8");
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

async function createMembershipCompany(ownerUserId: string) {
  const result = await admin
    .from("companies")
    .insert({
      owner_user_id: ownerUserId,
      name: `Runtime PDF Company ${Date.now().toString(36).toUpperCase()}`,
    })
    .select("id")
    .single();
  if (result.error || !result.data) {
    throw result.error ?? new Error("Failed to create PDF membership company");
  }

  const companyId = String(result.data.id);
  const ownerMembership = await admin.from("company_members").upsert(
    {
      company_id: companyId,
      user_id: ownerUserId,
      role: "director",
    },
    { onConflict: "company_id,user_id" },
  );
  if (ownerMembership.error) throw ownerMembership.error;
  return companyId;
}

async function attachCompanyMember(params: {
  companyId: string;
  userId: string;
  role: "foreman" | "warehouse";
}) {
  const result = await admin.from("company_members").upsert(
    {
      company_id: params.companyId,
      user_id: params.userId,
      role: params.role,
    },
    { onConflict: "company_id,user_id" },
  );
  if (result.error) throw result.error;
}

async function readRoleProbe(user: RuntimeTestUser) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "foreman-warehouse-pdf-web-runtime-role-probe",
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

  const [{ data: authUser, error: authError }, { data: rpcRole, error: rpcError }, memberships] = await Promise.all([
    client.auth.getUser(),
    client.rpc("get_my_role"),
    client.from("company_members").select("company_id,role").eq("user_id", user.id),
  ]);
  if (authError) throw authError;
  if (rpcError) throw rpcError;

  await client.auth.signOut().catch(() => undefined);

  return {
    authUserId: String(authUser.user?.id ?? "").trim(),
    appMetadataRole:
      String(
        (
          authUser.user?.app_metadata
          && typeof authUser.user.app_metadata === "object"
          && "role" in authUser.user.app_metadata
            ? (authUser.user.app_metadata as Record<string, unknown>).role
            : ""
        ) ?? "",
      ).trim() || null,
    rpcRole: String(rpcRole ?? "").trim() || null,
    companyMemberships: Array.isArray(memberships.data)
      ? memberships.data.map((row) => ({
          companyId: String(row.company_id ?? "").trim() || null,
          role: String(row.role ?? "").trim() || null,
        }))
      : [],
  };
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
    runtime.console.push({ type: message.type(), text: redactSensitiveText(message.text()) });
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
          headers: redactHeaders(response.headers()),
          requestHeaders: redactHeaders(response.request().headers()),
          payload: redactPayload(payload),
          signedUrl: payloadRecord
            ? redactSensitiveText(String(payloadRecord.signedUrl ?? "").trim()) || null
            : null,
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

async function maybeConfirmFioModal(page: Page, label: string) {
  const input = page.getByTestId("warehouse-fio-input").first();
  if ((await input.count().catch(() => 0)) === 0) return false;
  await input.fill(label);
  const confirm = page.getByTestId("warehouse-fio-confirm").first();
  await confirm.click({ force: true });
  await poll(
    "fio-confirm-close",
    async () => ((await input.count().catch(() => 0)) === 0 ? true : null),
    45_000,
    500,
  );
  return true;
}

async function waitForViewerReady(page: Page, runtime: RuntimeCapture, afterReadyCount = 0) {
  await poll(
    "web-viewer-url",
    () => (/\/pdf-viewer/i.test(page.url()) ? true : null),
    45_000,
    250,
  );
  await poll(
    "web-viewer-ready",
    async () =>
      countToken(runtime.console, "[pdf-viewer] ready") > afterReadyCount ? true : null,
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
  let ownerUser: RuntimeTestUser | null = null;
  let companyId: string | null = null;
  let user: RuntimeTestUser | null = null;
  let requestId: string | null = null;
  let page: Page | null = null;

  try {
    user = await createTempUser(admin, {
      role: roleMode === "membership" ? "director" : "foreman",
      fullName: "Foreman Web PDF Proof",
      emailPrefix: "foreman-web-pdf-proof",
      userProfile: {
        usage_build: true,
      },
    });
    if (roleMode === "membership") {
      ownerUser = await createTempUser(admin, {
        role: "director",
        fullName: "Foreman PDF Company Owner",
        emailPrefix: "foreman-pdf-owner",
        userProfile: {
          usage_build: true,
        },
      });
      companyId = await createMembershipCompany(ownerUser.id);
      await attachCompanyMember({
        companyId,
        userId: user.id,
        role: "foreman",
      });
    }

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
    const roleProbe = await readRoleProbe(user);

    const session = await signInSession(user);
    const context = await browser.newContext();
    page = await context.newPage();
    const { runtime, responseTasks } = attachRuntime(page, /foreman-request-pdf/i);
    await preparePage(page, session);

    await page.goto(`${baseUrl}/foreman`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await sleep(2_000);

    const materialsOpen = page.getByTestId("foreman-main-materials-open").first();
    await materialsOpen.waitFor({ state: "visible", timeout: 45_000 });
    await materialsOpen.click({ force: true });
    await sleep(1_500);

    await maybeConfirmFioModal(page, "Foreman Web PDF Proof");

    const historyOpen = page.getByTestId("foreman-request-history-open").first();
    await historyOpen.waitFor({ state: "visible", timeout: 45_000 });
    await historyOpen.click({ force: true });

    const pdfButton = page.locator(`[data-testid="foreman-history-pdf:${requestId}"]`).first();
    await poll(
      "foreman-history-request-materialized",
      async () => ((await pdfButton.count().catch(() => 0)) > 0 ? true : null),
      45_000,
      500,
    );
    await pdfButton.waitFor({ state: "visible", timeout: 15_000 });
    await pdfButton.click({ force: true });

    await waitForViewerReady(page, runtime);
    await Promise.all(responseTasks);

    const proof: ProofResult = {
      status: "GREEN",
      role: "foreman",
      checkedAt: new Date().toISOString(),
      baseUrl,
      finalUrl: page.url(),
      iframeSrc: redactSensitiveText(
        (await page.locator("iframe").first().getAttribute("src").catch(() => null)) ?? "",
      ) || null,
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
        roleMode,
        companyId,
        roleProbe,
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
    if (companyId) {
      try {
        await admin.from("company_members").delete().eq("company_id", companyId);
      } catch {
        // best effort cleanup
      }
      try {
        await admin.from("companies").delete().eq("id", companyId);
      } catch {
        // best effort cleanup
      }
    }
    await cleanupTempUser(admin, user).catch(() => undefined);
    await cleanupTempUser(admin, ownerUser).catch(() => undefined);
  }
}

async function runWarehouseProof(browser: Browser): Promise<ProofResult> {
  let ownerUser: RuntimeTestUser | null = null;
  let companyId: string | null = null;
  let user: RuntimeTestUser | null = null;
  let page: Page | null = null;

  try {
    user = await createTempUser(admin, {
      role: roleMode === "membership" ? "director" : "warehouse",
      fullName: "Warehouse Web PDF Proof",
      emailPrefix: "warehouse-web-pdf-proof",
      userProfile: {
        usage_build: true,
      },
    });
    if (roleMode === "membership") {
      ownerUser = await createTempUser(admin, {
        role: "director",
        fullName: "Warehouse PDF Company Owner",
        emailPrefix: "warehouse-pdf-owner",
        userProfile: {
          usage_build: true,
        },
      });
      companyId = await createMembershipCompany(ownerUser.id);
      await attachCompanyMember({
        companyId,
        userId: user.id,
        role: "warehouse",
      });
    }
    const roleProbe = await readRoleProbe(user);

    const session = await signInSession(user);
    const context = await browser.newContext();
    page = await context.newPage();
    const { runtime, responseTasks } = attachRuntime(page, /warehouse-pdf/i);
    await preparePage(page, session);

    await page.goto(`${baseUrl}/office/warehouse`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await sleep(2_000);

    await maybeConfirmFioModal(page, "Warehouse Web PDF Proof");

    const reportsTab = page.getByTestId("warehouse-tab-reports").first();
    await reportsTab.waitFor({ state: "visible", timeout: 45_000 });
    await reportsTab.click({ force: true });
    await sleep(1_500);

    const issueMode = page.getByTestId("warehouse-reports-mode-issue").first();
    const incomingMode = page.getByTestId("warehouse-reports-mode-incoming").first();
    if ((await issueMode.count().catch(() => 0)) > 0) {
      await issueMode.click({ force: true });
    } else if ((await incomingMode.count().catch(() => 0)) > 0) {
      await incomingMode.click({ force: true });
    }
    await sleep(2_000);

    const registerButton = page.getByTestId("warehouse-reports-action-pdf").first();
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
      iframeSrc: redactSensitiveText(
        (await page.locator("iframe").first().getAttribute("src").catch(() => null)) ?? "",
      ) || null,
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
        roleMode,
        companyId,
        roleProbe,
        bodySample: normalizeBodyText(await page.evaluate(() => document.body.innerText || "")).slice(0, 1200),
        dayRowsVisible: await page.locator('[data-testid^="warehouse-report-day:"]').count(),
        registerButtonVisible: await page.getByTestId("warehouse-reports-action-pdf").count(),
      },
    };

    await saveProofArtifacts("artifacts/warehouse-web-pdf-runtime-proof", page, proof);
    await context.close();
    return proof;
  } finally {
    if (companyId) {
      try {
        await admin.from("company_members").delete().eq("company_id", companyId);
      } catch {
        // best effort cleanup
      }
      try {
        await admin.from("companies").delete().eq("id", companyId);
      } catch {
        // best effort cleanup
      }
    }
    await cleanupTempUser(admin, user).catch(() => undefined);
    await cleanupTempUser(admin, ownerUser).catch(() => undefined);
  }
}

async function main() {
  const browser = await createBrowser();
  try {
    const foreman = runtimeRoles.has("foreman") ? await runForemanProof(browser) : null;
    const warehouse = runtimeRoles.has("warehouse") ? await runWarehouseProof(browser) : null;
    const statuses = [foreman?.status, warehouse?.status].filter(Boolean);

    writeJsonArtifact("artifacts/foreman-warehouse-web-pdf-runtime-summary.json", {
      status: statuses.length > 0 && statuses.every((status) => status === "GREEN") ? "GREEN" : "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      baseUrl,
      roles: Array.from(runtimeRoles),
      foreman: foreman
        ? {
            finalUrl: foreman.finalUrl,
            eventCounts: foreman.eventCounts,
            functionResponses: foreman.functionResponses,
            pageErrors: foreman.pageErrors,
            badResponses: foreman.badResponses,
          }
        : null,
      warehouse: warehouse
        ? {
            finalUrl: warehouse.finalUrl,
            eventCounts: warehouse.eventCounts,
            functionResponses: warehouse.functionResponses,
            pageErrors: warehouse.pageErrors,
            badResponses: warehouse.badResponses,
          }
        : null,
    });
  } finally {
    await browser.close().catch(() => undefined);
  }
}

void main();
