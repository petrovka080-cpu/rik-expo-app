import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { createAndroidHarness } from "./_shared/androidHarness";
import { buildRuntimeSummary, createFailurePlatformResult } from "./_shared/runtimeSummary";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const supabaseAnonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;
const baseUrl = "http://localhost:8081";
const password = "Pass1234";

if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "contractor-runtime-verify" } },
});

const artifactBase = "artifacts/contractor-runtime";
const webArtifactBase = "artifacts/contractor-web-smoke";
const webServerStdoutPath = path.join(projectRoot, "artifacts/contractor-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/contractor-web.stderr.log");
const androidDevClientPort = Number(process.env.CONTRACTOR_ANDROID_DEV_PORT ?? "8081");
const shouldRunWebRuntime = process.env.CONTRACTOR_RUNTIME_WEB === "1";
const webContractorRoute = "/office/contractor";
const webForemanRoute = "/office/foreman";
const androidContractorDeepLink = "rik://office/contractor";
const androidContractorDeepLinks = [
  androidContractorDeepLink,
  "rik:///office/contractor",
  "rik:///%28tabs%29/office/contractor",
];

const LABELS = {
  title: "Подрядчик",
  email: "Email",
  activationTitle: "Активация подрядчика",
  activationPlaceholder: "Введите код активации",
  activate: "Активировать",
  issuedSection: "Выдачи со склада",
  emptyIssued: "По этой работе еще не подтверждены выдачи материалов.",
  noApprovedHint: "Нет утвержденных заявок для подтягивания материалов.",
};

type TempUser = {
  id: string;
  email: string;
  password: string;
  role: string;
};

type SeededScope = {
  suffix: string;
  contractorId: string;
  contractorInn: string;
  contractorOrg: string;
  objectName: string;
  workName: string;
  subcontractId: string;
  requestId: string;
  requestItemId: string;
  purchaseId: string;
  purchaseItemId: string;
  progressId: string;
};

type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
  hint: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: androidDevClientPort,
});

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 250,
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

async function isWebServerReady() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  if (await isWebServerReady()) {
    return { started: false, stop: () => {} };
  }

  fs.mkdirSync(path.dirname(webServerStdoutPath), { recursive: true });
  fs.writeFileSync(webServerStdoutPath, "", "utf8");
  fs.writeFileSync(webServerStderrPath, "", "utf8");

  const child = spawn("cmd.exe", ["/c", "npx", "expo", "start", "--web", "-c"], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(webServerStdoutPath, String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(webServerStderrPath, String(chunk));
  });

  await poll(
    "contractor-runtime:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(webServerStderrPath)
          ? fs.readFileSync(webServerStderrPath, "utf8")
          : "";
        throw new Error(`expo web server exited early (${child.exitCode}): ${stderr}`);
      }
      return (await isWebServerReady()) ? true : null;
    },
    240_000,
    1_000,
  );

  return {
    started: true,
    stop: () => stopProcessTree(child),
  };
}

async function createTempUser(role: string, fullName: string): Promise<TempUser> {
  const email = `contractor.runtime.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@e.com`;
  const userResult = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
    app_metadata: { role },
  });
  if (userResult.error) throw userResult.error;

  const user = userResult.data.user;

  const profileResult = await admin
    .from("profiles")
    .upsert({ user_id: user.id, role, full_name: fullName }, { onConflict: "user_id" });
  if (profileResult.error) throw profileResult.error;

  const userProfileResult = await admin
    .from("user_profiles")
    .upsert({ user_id: user.id, full_name: fullName, is_contractor: true }, { onConflict: "user_id" });
  if (userProfileResult.error) throw userProfileResult.error;

  const contractorFlagResult = await admin
    .from("user_profiles")
    .update({ is_contractor: true })
    .eq("user_id", user.id)
    .select("user_id, is_contractor")
    .single();
  if (contractorFlagResult.error) throw contractorFlagResult.error;
  if (contractorFlagResult.data?.is_contractor !== true) {
    throw new Error("Temp user was not marked as contractor");
  }

  return { id: user.id, email, password, role };
}

async function seedContractorScope(user: TempUser): Promise<SeededScope> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const contractorOrg = `Runtime Contractor ${suffix}`;
  const contractorInn = `12345678${suffix.slice(-4).replace(/\D/g, "7").padEnd(4, "7")}`;
  const objectName = `Runtime Object ${suffix.toUpperCase()}`;
  const workName = `Runtime Work ${suffix}`;
  const contractorResult = await admin
    .from("contractors")
    .insert({
      user_id: user.id,
      full_name: "Contractor Runtime Smoke",
      company_name: contractorOrg,
      phone: "+996555000111",
      email: user.email,
      inn: contractorInn,
    })
    .select("id")
    .single();
  if (contractorResult.error) throw contractorResult.error;
  const contractorId = String(contractorResult.data.id);

  const subcontractResult = await admin
    .from("subcontracts")
    .insert({
      created_by: user.id,
      status: "approved",
      foreman_name: "Runtime Foreman",
      contractor_org: contractorOrg,
      contractor_inn: contractorInn,
      contractor_rep: "Runtime Rep",
      contractor_phone: "+996555000111",
      contract_number: `CTR-${suffix.toUpperCase()}`,
      contract_date: new Date().toISOString().slice(0, 10),
      object_name: objectName,
      work_zone: "Runtime Zone",
      work_type: workName,
      qty_planned: 10,
      uom: "pcs",
      date_start: new Date().toISOString().slice(0, 10),
      date_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      work_mode: "labor_only",
      price_per_unit: 100,
      total_price: 1000,
      price_type: "by_volume",
      foreman_comment: "Contractor runtime verify",
      approved_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (subcontractResult.error) throw subcontractResult.error;
  const subcontractId = String(subcontractResult.data.id);

  const requestResult = await admin
    .from("requests")
    .insert({
      created_by: user.id,
      role: "foreman",
      name: workName,
      object_name: objectName,
      subcontract_id: subcontractId,
      contractor_job_id: subcontractId,
      company_name_snapshot: contractorOrg,
      company_inn_snapshot: contractorInn,
      status: "Черновик",
      date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (requestResult.error) throw requestResult.error;
  const requestId = String(requestResult.data.id);

  const requestItemResult = await admin
    .from("request_items")
    .insert({
      request_id: requestId,
      name_human: workName,
      qty: 1,
      rik_code: `RUNTIME-${suffix.toUpperCase()}`,
      uom: "pcs",
      row_no: 1,
      position_order: 1,
      kind: "work",
    })
    .select("id")
    .single();
  if (requestItemResult.error) throw requestItemResult.error;
  const requestItemId = String(requestItemResult.data.id);

  const requestApproveResult = await admin
    .from("requests")
    .update({
      status: "Утверждено",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("id")
    .single();
  if (requestApproveResult.error) throw requestApproveResult.error;

  const purchaseResult = await admin
    .from("purchases")
    .insert({
      created_by: user.id,
      request_id: requestId,
      object_name: objectName,
      supplier: contractorOrg,
      currency: "KGS",
    })
    .select("id")
    .single();
  if (purchaseResult.error) throw purchaseResult.error;
  const purchaseId = String(purchaseResult.data.id);

  const purchaseItemResult = await admin
    .from("purchase_items")
    .insert({
      purchase_id: purchaseId,
      request_item_id: requestItemId,
      name_human: workName,
      qty: 1,
      uom: "pcs",
      price_per_unit: 100,
    })
    .select("id")
    .single();
  if (purchaseItemResult.error) throw purchaseItemResult.error;
  const purchaseItemId = String(purchaseItemResult.data.id);

  const progressId = randomUUID();
  const workProgressResult = await admin
    .from("work_progress")
    .insert({
      id: progressId,
      purchase_item_id: purchaseItemId,
      contractor_id: contractorId,
      contractor_name: contractorOrg,
      qty_planned: 1,
      qty_done: 0,
      qty_left: 1,
      status: "active",
      uom: "pcs",
      work_dt: new Date().toISOString().slice(0, 10),
      location: objectName,
    })
    .select("id")
    .single();
  if (workProgressResult.error) throw workProgressResult.error;

  await poll(
    "contractor_scope_row",
    async () => {
      const { data, error } = await admin.rpc("contractor_inbox_scope_v1" as never, {
        p_my_contractor_id: contractorId,
        p_is_staff: false,
      } as never);
      if (error) throw error;
      const rows = Array.isArray((data as Record<string, unknown> | null)?.rows)
        ? ((data as Record<string, unknown>).rows as Record<string, unknown>[])
        : [];
      const found =
        rows.find(
          (row) =>
            String(row.progressId ?? "").trim() === progressId ||
            String(row.workItemId ?? "").trim() === `progress:${progressId}`,
        ) ?? null;
      return found ? true : null;
    },
    20_000,
    500,
  );

  return {
    suffix,
    contractorId,
    contractorInn,
    contractorOrg,
    objectName,
    workName,
    subcontractId,
    requestId,
    requestItemId,
    purchaseId,
    purchaseItemId,
    progressId,
  };
}

async function cleanupSeededScope(scope: SeededScope | null) {
  if (!scope) return;
  try {
    await admin.from("work_progress_log_materials").delete().eq("log_id", scope.progressId);
  } catch {}
  try {
    await admin.from("work_progress_log").delete().eq("progress_id", scope.progressId);
  } catch {}
  try {
    await admin.from("work_progress").delete().eq("id", scope.progressId);
  } catch {}
  try {
    await admin.from("purchase_items").delete().eq("id", scope.purchaseItemId);
  } catch {}
  try {
    await admin.from("purchases").delete().eq("id", scope.purchaseId);
  } catch {}
  try {
    await admin.from("request_items").delete().eq("id", scope.requestItemId);
  } catch {}
  try {
    await admin.from("requests").delete().eq("id", scope.requestId);
  } catch {}
  try {
    await admin.from("subcontracts").delete().eq("id", scope.subcontractId);
  } catch {}
  try {
    await admin.from("contractors").delete().eq("id", scope.contractorId);
  } catch {}
}

async function cleanupTempUser(user: TempUser | null) {
  if (!user) return;
  try {
    await admin.from("user_profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await admin.from("profiles").delete().eq("user_id", user.id);
  } catch {}
  try {
    await admin.auth.admin.deleteUser(user.id);
  } catch {}
}

async function bodyText(page: import("playwright").Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

async function waitForBody(page: import("playwright").Page, needles: string | string[], timeoutMs = 30_000) {
  const list = Array.isArray(needles) ? needles : [needles];
  return poll(
    `body:${list.join("|")}`,
    async () => {
      const body = await bodyText(page);
      return list.some((needle) => body.includes(needle)) ? body : null;
    },
    timeoutMs,
    250,
  );
}

async function settleWebContractorRoute(page: import("playwright").Page) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const body = await bodyText(page);
    if (!body.includes(LABELS.activationTitle)) return;
    await page.waitForTimeout(1500);
    await page.goto(`${baseUrl}${webForemanRoute}`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.goto(`${baseUrl}${webContractorRoute}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  }
}

async function maybeActivateContractorWeb(page: import("playwright").Page) {
  const body = await bodyText(page);
  if (!body.includes(LABELS.activationTitle)) return;
  const input = page.locator("input").first();
  if ((await input.count()) > 0) {
    await input.fill("RUNTIME");
  }

  const activateButton = page.getByText(LABELS.activate, { exact: true }).first();
  if ((await activateButton.count()) > 0) {
    await activateButton.click();
  }

  await page.waitForTimeout(1500);
}

const isBlockingWebConsoleError = (entry: { type: string; text: string }) =>
  entry.type === "error" && !/Accessing element\.ref was removed in React 19/i.test(entry.text);

async function signInWebSession(user: TempUser) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "contractor-runtime-web-smoke",
      },
    },
  });

  const result = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return result.data.session;
}

async function runWebRuntime(user: TempUser, scope: SeededScope): Promise<Record<string, unknown>> {
  let browser: import("playwright").Browser | null = null;
  const webServer = await ensureLocalWebServer();
  const runtime = {
    console: [] as { type: string; text: string }[],
    pageErrors: [] as { message: string }[],
    responses: [] as { url: string; status: number; method: string }[],
  };

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("console", (message) => {
      runtime.console.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => {
      runtime.pageErrors.push({ message: String(error?.message || error) });
    });
    page.on("response", (response) => {
      runtime.responses.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    });

    const session = await signInWebSession(user);
    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      {
        key: supabaseStorageKey,
        value: JSON.stringify(session),
      },
    );

    await page.goto(`${baseUrl}${webContractorRoute}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await settleWebContractorRoute(page);
    await maybeActivateContractorWeb(page);
    await settleWebContractorRoute(page);
    await waitForBody(page, scope.contractorOrg, 45_000);

    const card = page.getByText(scope.contractorOrg, { exact: false }).first();
    if ((await card.count()) === 0) {
      throw new Error("Contractor card was not rendered on web");
    }
    await card.click();

    await waitForBody(page, [LABELS.issuedSection, scope.workName, scope.objectName], 30_000);
    const issuedToggle = page.getByText(LABELS.issuedSection, { exact: true }).last();
    await issuedToggle.click();

    const issuedBody = await waitForBody(page, [LABELS.emptyIssued, LABELS.noApprovedHint], 30_000);
    const screenshotPath = path.join(projectRoot, `${webArtifactBase}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const result = {
      status:
        runtime.pageErrors.length === 0 &&
        runtime.console.filter(isBlockingWebConsoleError).length === 0
          ? "passed"
          : "failed",
      contractorCardVisible: true,
      modalOpened: true,
      issuedExpanded: issuedBody.includes(LABELS.emptyIssued) || issuedBody.includes(LABELS.noApprovedHint),
      screenshot: `${webArtifactBase}.png`,
      webServerStarted: webServer.started,
      blockingConsoleErrors: runtime.console.filter(isBlockingWebConsoleError),
      pageErrors: runtime.pageErrors,
      platformSpecificIssues: [] as string[],
    };

    if (!result.issuedExpanded) {
      result.platformSpecificIssues.push("Issued section did not expand on web contractor modal");
      result.status = "failed";
    }

    writeJson(path.join(projectRoot, `${webArtifactBase}.json`), runtime);
    writeJson(path.join(projectRoot, `${webArtifactBase}.summary.json`), result);
    return { ...result, runtime };
  } finally {
    if (browser) await browser.close().catch(() => {});
    webServer.stop();
  }
}

const adb = (args: string[], encoding: BufferEncoding | "buffer" = "utf8") => {
  const result = spawnSync("adb", args, {
    cwd: projectRoot,
    encoding: encoding === "buffer" ? undefined : encoding,
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "")}`.trim());
  }
  return encoding === "buffer" ? (result.stdout as unknown as Buffer) : String(result.stdout ?? "");
};

const xcrunAvailable = (): boolean => {
  const result = spawnSync("xcrun", ["--version"], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 10_000,
  });
  return result.status === 0;
};

const parseAndroidNodes = (xml: string): AndroidNode[] => {
  const nodes: AndroidNode[] = [];
  const nodeRegex = /<node\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null = null;
  while ((match = nodeRegex.exec(xml))) {
    const attrs = match[1] ?? "";
    const pick = (name: string) => {
      const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
      return attrMatch?.[1] ?? "";
    };
    nodes.push({
      text: pick("text"),
      contentDesc: pick("content-desc"),
      className: pick("class"),
      clickable: pick("clickable") === "true",
      enabled: pick("enabled") === "true",
      bounds: pick("bounds"),
      hint: pick("hint"),
    });
  }
  return nodes;
};

const parseBoundsCenter = (bounds: string): { x: number; y: number } | null => {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  };
};

const tapAndroidBounds = (bounds: string) => {
  const center = parseBoundsCenter(bounds);
  if (!center) return false;
  execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  return true;
};

const pressAndroidKey = (keyCode: string | number) => {
  execFileSync("adb", ["shell", "input", "keyevent", String(keyCode)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const escapeAndroidInputText = (value: string) => String(value ?? "").replace(/ /g, "%s");

const dumpAndroidScreen = (name: string) => {
  const xmlDevicePath = `/sdcard/${name}.xml`;
  const xmlArtifactPath = path.join(projectRoot, "artifacts", `${name}.xml`);
  const pngArtifactPath = path.join(projectRoot, "artifacts", `${name}.png`);
  execFileSync("adb", ["shell", "uiautomator", "dump", xmlDevicePath], { cwd: projectRoot, stdio: "pipe" });
  execFileSync("adb", ["pull", xmlDevicePath, xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
  const screenshot = adb(["exec-out", "screencap", "-p"], "buffer") as Buffer;
  fs.writeFileSync(pngArtifactPath, screenshot);
  return {
    xmlPath: `artifacts/${name}.xml`,
    pngPath: `artifacts/${name}.png`,
    xml: fs.readFileSync(xmlArtifactPath, "utf8"),
  };
};

const detectAndroidPackage = (): string | null => {
  const packages = adb(["shell", "pm", "list", "packages"]);
  if (packages.includes("package:com.azisbek_dzhantaev.rikexpoapp")) {
    return "com.azisbek_dzhantaev.rikexpoapp";
  }
  if (packages.includes("package:host.exp.exponent")) {
    return "host.exp.exponent";
  }
  return null;
};

const clearAndroidAppData = (packageName: string | null) => {
  if (!packageName) return;
  execFileSync("adb", ["shell", "pm", "clear", packageName], {
    cwd: projectRoot,
    stdio: "pipe",
  });
};

const startAndroidRoute = (packageName: string | null, route: string) => {
  const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", route];
  if (packageName) args.push(packageName);
  execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
};

const startAndroidLoginRoute = (packageName: string | null) => {
  startAndroidRoute(packageName, "rik://auth/login");
};

const startAndroidContractorRoute = (packageName: string | null) => {
  startAndroidRoute(packageName, androidContractorDeepLink);
};

const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

const findAndroidLabelNode = (nodes: AndroidNode[], label: string, requireClickable = false): AndroidNode | null =>
  findAndroidNode(nodes, (node) => {
    const haystack = `${node.text} ${node.contentDesc}`.trim();
    if (!haystack.includes(label)) return false;
    if (requireClickable && (!node.clickable || !node.enabled)) return false;
    return true;
  });

const isAndroidLoginScreen = (xml: string) => xml.includes("Email") && /Войти|Login/i.test(xml);
const isAndroidActivationScreen = (xml: string) =>
  /Активац|РђРєС‚РёРІ|Активир|РђРєС‚РёРІРё/i.test(xml) && /EditText/i.test(xml);
const hasAndroidContractorOfficeHeader = (xml: string) =>
  xml.includes("Navigate up") && (xml.includes(LABELS.title) || xml.includes("Подрядчик"));
const isAndroidContractorRouteSurface = (xml: string) =>
  isAndroidActivationScreen(xml) || xml.includes("Активация подрядчика") || hasAndroidContractorOfficeHeader(xml);
const isAndroidContractorModalReady = (xml: string, scope: SeededScope) =>
  xml.includes(LABELS.issuedSection) && xml.includes(scope.contractorOrg) && xml.includes(scope.contractorInn);

const findAndroidLoginNode = (nodes: AndroidNode[]): AndroidNode | null =>
  findAndroidNode(
    nodes,
    (node) =>
      node.clickable &&
      node.enabled &&
      /Р’РѕР№С‚Рё|Login|Р вЂ™Р С•Р в„–РЎвЂљР С‘/i.test(`${node.text} ${node.contentDesc}`),
  );

async function loginContractorAndroid(user: TempUser, packageName: string | null) {
  writeJson(path.join(projectRoot, "artifacts/android-contractor-user.json"), user);
  {
    return androidHarness.loginAndroidWithProtectedRoute({
      packageName,
      user,
      protectedRoute: androidContractorDeepLink,
      artifactBase: "android-contractor",
      successPredicate: isAndroidContractorRouteSurface,
      renderablePredicate: (xml) => isAndroidLoginScreen(xml) || isAndroidContractorRouteSurface(xml),
      loginScreenPredicate: isAndroidLoginScreen,
    });
  }
  clearAndroidAppData(packageName);
  await sleep(1500);
  startAndroidLoginRoute(packageName);
  await sleep(1500);

  let current = await poll(
    "android:contractor_login_screen",
    async () => {
      const screen = dumpAndroidScreen("android-contractor-current");
      if (isAndroidLoginScreen(screen.xml)) return screen;
      startAndroidLoginRoute(packageName);
      return null;
    },
    45_000,
    1500,
  );

  const nodes = parseAndroidNodes(current.xml);
  const emailNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /email/i.test(`${node.text} ${node.hint}`),
  );
  const passwordNode = findAndroidNode(
    nodes,
    (node) =>
      node.enabled &&
      /android\.widget\.EditText/i.test(node.className) &&
      /пароль|password/i.test(`${node.text} ${node.hint}`.toLowerCase()),
  );
  const loginNode = findAndroidNode(
    nodes,
    (node) => node.enabled && node.clickable && /войти|login/i.test(`${node.text} ${node.contentDesc}`.toLowerCase()),
  );

  const stableLoginNode = findAndroidLoginNode(nodes) ?? loginNode;

  if (!emailNode || !passwordNode || !stableLoginNode) {
    throw new Error("Android contractor login controls were not found");
  }

  tapAndroidBounds(emailNode.bounds);
  await sleep(400);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.email)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(400);

  tapAndroidBounds(passwordNode.bounds);
  await sleep(400);
  execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.password)], {
    cwd: projectRoot,
    stdio: "pipe",
  });
  await sleep(400);

  pressAndroidKey(4);
  await sleep(500);
  tapAndroidBounds(stableLoginNode.bounds);
  await sleep(1200);
  pressAndroidKey(66);
  await sleep(1500);

  await poll(
    "android:contractor_login_complete",
    async () => {
      const screen = dumpAndroidScreen("android-contractor-after-login");
      if (isAndroidLoginScreen(screen.xml)) {
        const retryLoginNode = findAndroidLoginNode(parseAndroidNodes(screen.xml));
        if (retryLoginNode) {
          pressAndroidKey(4);
          await sleep(300);
          tapAndroidBounds(retryLoginNode.bounds);
        }
      }
      return isAndroidLoginScreen(screen.xml) ? null : screen;
    },
    45_000,
    1500,
  );
  startAndroidContractorRoute(packageName);
  await sleep(2000);
  return dumpAndroidScreen("android-contractor-route");
}

async function settleAndroidContractorRoute(packageName: string | null, current: ReturnType<typeof dumpAndroidScreen>) {
  let screen = current;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!isAndroidActivationScreen(screen.xml)) return screen;
    const okNode = findAndroidLabelNode(parseAndroidNodes(screen.xml), "OK");
    if (okNode) {
      tapAndroidBounds(okNode.bounds);
      await sleep(800);
    }
    await sleep(1500);
    const foremanTab = findAndroidLabelNode(parseAndroidNodes(screen.xml), "Прораб");
    if (foremanTab) {
      tapAndroidBounds(foremanTab.bounds);
      await sleep(1200);
    }
    const contractorTab = findAndroidLabelNode(parseAndroidNodes(screen.xml), "Подрядчик");
    if (contractorTab) {
      tapAndroidBounds(contractorTab.bounds);
      await sleep(1500);
    } else {
      startAndroidContractorRoute(packageName);
      await sleep(1500);
    }
    screen = dumpAndroidScreen(`android-contractor-route-${attempt + 1}`);
  }
  return screen;
}

async function runAndroidRuntime(user: TempUser, scope: SeededScope): Promise<Record<string, unknown>> {
  const devices = adb(["devices"]);
  if (!devices.includes("\tdevice")) {
    return {
      status: "failed",
      contractorCardVisible: false,
      modalOpened: false,
      issuedExpanded: false,
      platformSpecificIssues: ["No Android emulator/device detected"],
    };
  }

  const devClient = await androidHarness.ensureAndroidDevClientServer();
  const packageName = detectAndroidPackage();
  const preflight = androidHarness.runAndroidPreflight({ packageName, clearApp: true });
  await androidHarness.warmAndroidDevClientBundle(androidDevClientPort);
  const current = await loginContractorAndroid(user, packageName);
  let screen = await androidHarness.openAndroidRoute({
    packageName,
    routes: androidContractorDeepLinks,
    artifactBase: "android-contractor",
    predicate: (xml) => isAndroidContractorRouteSurface(xml) || xml.includes(scope.contractorOrg),
    renderablePredicate: (xml) => isAndroidLoginScreen(xml) || isAndroidContractorRouteSurface(xml),
    loginScreenPredicate: isAndroidLoginScreen,
    timeoutMs: 45_000,
    delayMs: 1500,
  });
  screen = await settleAndroidContractorRoute(packageName, screen);
  const platformSpecificIssues: string[] = [];
  if (isAndroidActivationScreen(screen.xml)) {
    platformSpecificIssues.push("Contractor activation screen persisted after authenticated Android login");
  }

  try {
    screen = await poll(
      "android:contractor_card_visible",
      async () => {
        const next = dumpAndroidScreen("android-contractor-home");
        return next.xml.includes(scope.contractorOrg) ? next : null;
      },
      30_000,
      1000,
    );
  } catch {
    platformSpecificIssues.push("Contractor runtime card was not visible on Android home screen");
  }

  let contractorCardVisible = screen.xml.includes(scope.contractorOrg);
  if (contractorCardVisible) {
    const cardNode = findAndroidLabelNode(parseAndroidNodes(screen.xml), scope.contractorOrg);
    if (cardNode) {
      tapAndroidBounds(cardNode.bounds);
      await sleep(1200);
    } else {
      contractorCardVisible = false;
      platformSpecificIssues.push("Contractor card node could not be tapped on Android");
    }
  }

  let modalScreen = screen;
  let modalOpened = false;
  try {
    modalScreen = await poll(
      "android:contractor_modal_open",
      async () => {
        const next = dumpAndroidScreen("android-contractor-modal");
        return isAndroidContractorModalReady(next.xml, scope) ? next : null;
      },
      30_000,
      1000,
    );
    modalOpened = isAndroidContractorModalReady(modalScreen.xml, scope);
  } catch {
    platformSpecificIssues.push("Contractor work modal did not open on Android");
  }

  let issuedExpanded = false;
  let issuedScreen = modalScreen;
  if (modalOpened) {
    const toggleNode = findAndroidLabelNode(parseAndroidNodes(modalScreen.xml), LABELS.issuedSection, true);
    if (toggleNode) {
      tapAndroidBounds(toggleNode.bounds);
      await sleep(1200);
      try {
        issuedScreen = await poll(
          "android:contractor_issued_section",
          async () => {
            const next = dumpAndroidScreen("android-contractor-issued");
            return next.xml.includes(LABELS.emptyIssued) || next.xml.includes(LABELS.noApprovedHint) ? next : null;
          },
          30_000,
          1000,
        );
        issuedExpanded =
          issuedScreen.xml.includes(LABELS.emptyIssued) ||
          issuedScreen.xml.includes(LABELS.noApprovedHint);
      } catch {
        platformSpecificIssues.push("Issued section did not expand on Android contractor modal");
      }
    } else {
      platformSpecificIssues.push("Issued section toggle was not found on Android contractor modal");
    }
  }

  const recovery = androidHarness.getRecoverySummary();
  devClient.cleanup();
  return {
    status: contractorCardVisible && modalOpened && issuedExpanded ? "passed" : "failed",
    packageName,
    androidPreflight: preflight,
    ...recovery,
    contractorCardVisible,
    modalOpened,
    issuedExpanded,
    currentXml: current.xmlPath,
    currentPng: current.pngPath,
    homeXml: screen.xmlPath,
    homePng: screen.pngPath,
    modalXml: modalScreen.xmlPath,
    modalPng: modalScreen.pngPath,
    issuedXml: issuedScreen.xmlPath,
    issuedPng: issuedScreen.pngPath,
    platformSpecificIssues,
  };
}

function runIosRuntime(): Record<string, unknown> {
  if (!xcrunAvailable()) {
    return {
      status: "residual",
      iosResidual: "xcrun is unavailable on this host; iOS simulator cannot be started from Windows",
      platformSpecificIssues: ["xcrun is unavailable on this host; iOS simulator cannot be started from Windows"],
    };
  }
  return {
    status: "failed",
    platformSpecificIssues: ["xcrun is available but automated contractor iOS runtime is not implemented in this host flow"],
  };
}

async function main() {
  let user: TempUser | null = null;
  let scope: SeededScope | null = null;

  try {
    user = await createTempUser(process.env.CONTRACTOR_WEB_ROLE || "foreman", "Contractor Runtime Smoke");
    scope = await seedContractorScope(user);

    const web = shouldRunWebRuntime
      ? await runWebRuntime(user, scope).catch((error) =>
          createFailurePlatformResult("web", error, {
            contractorCardVisible: false,
            modalOpened: false,
            issuedExpanded: false,
          }),
        )
      : {
          status: "skipped",
          contractorCardVisible: false,
          modalOpened: false,
          issuedExpanded: false,
          platformSpecificIssues: [],
          skipReason: "web smoke is not part of this WAVE 8 Android runtime proof",
        };
    const android = await runAndroidRuntime(user, scope).catch((error) => {
      const artifacts = androidHarness.captureFailureArtifacts("android-contractor-failure");
      return createFailurePlatformResult("android", error, {
        contractorCardVisible: false,
        modalOpened: false,
        issuedExpanded: false,
        ...androidHarness.getRecoverySummary(),
        ...artifacts,
      });
    });
    const ios = runIosRuntime();
    const androidRecord = android as Record<string, unknown>;

    const summary = buildRuntimeSummary({
      web,
      android,
      ios,
      scenariosPassed: {
        web: {
          contractorCardVisible: web.contractorCardVisible === true,
          modalOpened: web.modalOpened === true,
          issuedExpanded: web.issuedExpanded === true,
        },
        android: {
          contractorCardVisible: android.contractorCardVisible === true,
          modalOpened: android.modalOpened === true,
          issuedExpanded: android.issuedExpanded === true,
        },
        ios: {
          contractorCardVisible: ios.status === "passed",
          modalOpened: ios.status === "passed",
          issuedExpanded: ios.status === "passed",
        },
      },
      requiredPlatforms: {
        web: shouldRunWebRuntime,
        android: true,
        ios: true,
      },
      artifacts: {
        webScreenshot: shouldRunWebRuntime ? `${webArtifactBase}.png` : null,
        androidHomeXml: typeof androidRecord.homeXml === "string" ? androidRecord.homeXml : null,
        androidHomePng: typeof androidRecord.homePng === "string" ? androidRecord.homePng : null,
        androidModalXml: typeof androidRecord.modalXml === "string" ? androidRecord.modalXml : null,
        androidModalPng: typeof androidRecord.modalPng === "string" ? androidRecord.modalPng : null,
        androidIssuedXml: typeof androidRecord.issuedXml === "string" ? androidRecord.issuedXml : null,
        androidIssuedPng: typeof androidRecord.issuedPng === "string" ? androidRecord.issuedPng : null,
      },
      extra: {
        gate: "contractor_runtime_verify",
        contractorCardVisible:
          (shouldRunWebRuntime ? web.contractorCardVisible === true : true) && android.contractorCardVisible === true,
        modalOpened: (shouldRunWebRuntime ? web.modalOpened === true : true) && android.modalOpened === true,
        issuedExpanded:
          (shouldRunWebRuntime ? web.issuedExpanded === true : true) && android.issuedExpanded === true,
        seed: scope,
        webSkipped: !shouldRunWebRuntime,
      },
    });

    writeJson(path.join(projectRoot, `${artifactBase}.json`), {
      web,
      android,
      ios,
      seed: scope,
      generatedAt: new Date().toISOString(),
    });
    writeJson(path.join(projectRoot, `${artifactBase}.summary.json`), summary);

    console.log(JSON.stringify(summary, null, 2));

    if (summary.status !== "passed") {
      process.exitCode = 1;
    }
  } catch (error) {
    const failure = createFailurePlatformResult("web", error, {
      gate: "contractor_runtime_verify",
    });
    writeJson(path.join(projectRoot, `${artifactBase}.json`), failure);
    writeJson(path.join(projectRoot, `${artifactBase}.summary.json`), failure);
    console.error(JSON.stringify(failure, null, 2));
    process.exitCode = 1;
  } finally {
    await cleanupSeededScope(scope);
    await cleanupTempUser(user);
  }
}

void main();
