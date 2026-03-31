import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import { classifyDirectorPdfTransportError } from "../src/lib/pdf/directorPdfPlatformContract";
import {
  resolvePdfViewerDirectSnapshot,
  resolvePdfViewerResolution,
} from "../src/lib/pdf/pdfViewerContract";
import { createAndroidHarness } from "./_shared/androidHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
  runtimePassword,
} from "./_shared/testUserDiscipline";

type JsonRecord = Record<string, unknown>;

type DirectorPdfFamily =
  | "management_report"
  | "supplier_summary"
  | "production_report"
  | "subcontract_report";

type FunctionName =
  | "director-pdf-render"
  | "director-finance-supplier-summary-pdf"
  | "director-production-report-pdf"
  | "director-subcontract-report-pdf";

type FamilyDefinition = {
  family: DirectorPdfFamily;
  functionName: FunctionName;
  documentKind: DirectorPdfFamily;
  expectedRenderBranch:
    | "edge_render_v1"
    | "backend_supplier_summary_v1"
    | "backend_production_report_v1"
    | "backend_subcontract_report_v1";
  buildPayload: () => JsonRecord;
};

type CorsDiagnostic = {
  family: DirectorPdfFamily;
  functionName: FunctionName;
  optionsStatus: number | null;
  optionsOk: boolean;
  optionsHeaders: Record<string, string>;
  postStatus: number | null;
  postOk: boolean;
  postHeaders: Record<string, string>;
  postPayload: unknown;
  signedUrl: string | null;
  signedUrlReachable: boolean;
  contractOk: boolean;
  corsOk: boolean;
  renderer: string | null;
  renderBranch: string | null;
  error: string | null;
};

type ErrorDiagnostic = {
  caseName: "auth_failed" | "validation_failed";
  functionName: FunctionName;
  status: number | null;
  corsPreserved: boolean;
  payload: unknown;
  classifiedAs: string | null;
  error: string | null;
};

type AndroidRuntimeResult = {
  family: DirectorPdfFamily | "invalid_source";
  routeMounted: boolean;
  handoffStarted: boolean;
  handoffReady: boolean;
  handoffError: boolean;
  processAlive: boolean;
  fatalCrash: boolean;
  logExcerpt: string[];
  expected: "ready" | "controlled_error";
  passed: boolean;
  error: string | null;
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const baseUrl = String(process.env.RIK_WEB_BASE_URL ?? "http://localhost:8081").trim();
const localFunctionHost = "http://127.0.0.1";
const password = runtimePassword;

const FUNCTION_PORTS: Record<FunctionName, number> = {
  "director-pdf-render": 54331,
  "director-finance-supplier-summary-pdf": 54332,
  "director-production-report-pdf": 54333,
  "director-subcontract-report-pdf": 54334,
};

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
}

const artifactPaths = {
  smoke: path.join(projectRoot, "artifacts/director-pdf-platform-hardening-smoke.json"),
  proof: path.join(projectRoot, "artifacts/director-pdf-platform-hardening-proof.md"),
  webCors: path.join(projectRoot, "artifacts/director-pdf-web-cors-diagnostics.json"),
  mobile: path.join(projectRoot, "artifacts/director-pdf-mobile-open-diagnostics.json"),
  parity: path.join(projectRoot, "artifacts/director-pdf-family-parity.json"),
  serveStdout: path.join(projectRoot, "artifacts/director-pdf-functions-serve.stdout.log"),
  serveStderr: path.join(projectRoot, "artifacts/director-pdf-functions-serve.stderr.log"),
};

const admin = createVerifierAdmin("director-pdf-platform-hardening-verify");
const androidHarness = createAndroidHarness({
  projectRoot,
  devClientPort: 8081,
  devClientStdoutPath: "artifacts/director-pdf-dev-client.stdout.log",
  devClientStderrPath: "artifacts/director-pdf-dev-client.stderr.log",
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const writeText = (fullPath: string, payload: string) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
};

function text(value: unknown) {
  return String(value ?? "").trim();
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error ?? "unknown error");
}

function normalizeHeaders(headers: Headers) {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[String(key || "").toLowerCase()] = String(value ?? "");
  });
  return result;
}

async function parseResponsePayload(response: Response) {
  const raw = await response.text();
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function signInDirector(user: { email: string; password: string }) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-client-info": "director-pdf-platform-hardening-runtime" },
    },
  });
  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password || password,
  });
  if (signIn.error || !signIn.data.session?.access_token) {
    throw signIn.error ?? new Error(`signInWithPassword returned no session for ${user.email}`);
  }
  return {
    client,
    accessToken: signIn.data.session.access_token,
  };
}

function buildFunctionUrl(functionName: FunctionName, caseId: string) {
  return `${localFunctionHost}:${FUNCTION_PORTS[functionName]}?case=${encodeURIComponent(caseId)}`;
}

async function startLocalFunctionServer(): Promise<{
  children: Array<{ functionName: FunctionName; child: ChildProcessWithoutNullStreams }>;
  stop: () => void;
}> {
  fs.mkdirSync(path.dirname(artifactPaths.serveStdout), { recursive: true });
  fs.writeFileSync(artifactPaths.serveStdout, "", "utf8");
  fs.writeFileSync(artifactPaths.serveStderr, "", "utf8");
  const functionFiles: Record<FunctionName, string> = {
    "director-pdf-render": "supabase/functions/director-pdf-render/index.ts",
    "director-finance-supplier-summary-pdf": "supabase/functions/director-finance-supplier-summary-pdf/index.ts",
    "director-production-report-pdf": "supabase/functions/director-production-report-pdf/index.ts",
    "director-subcontract-report-pdf": "supabase/functions/director-subcontract-report-pdf/index.ts",
  };
  const children: Array<{ functionName: FunctionName; child: ChildProcessWithoutNullStreams }> = [];

  for (const [functionName, relativeFile] of Object.entries(functionFiles) as Array<[FunctionName, string]>) {
    const child = spawn(
      "cmd.exe",
      ["/c", "npx", "deno", "run", "--allow-all", relativeFile],
      {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: {
          ...process.env,
          PORT: String(FUNCTION_PORTS[functionName]),
          SUPABASE_URL: process.env.SUPABASE_URL || supabaseUrl,
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || anonKey,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || serviceRoleKey,
        },
      },
    );

    child.stdout.on("data", (chunk) => {
      fs.appendFileSync(artifactPaths.serveStdout, `[${functionName}] ${String(chunk)}`);
    });
    child.stderr.on("data", (chunk) => {
      fs.appendFileSync(artifactPaths.serveStderr, `[${functionName}] ${String(chunk)}`);
    });

    children.push({ functionName, child });
  }

  await poll(
    "director-pdf-functions-serve-ready",
    async () => {
      for (const entry of children) {
        if (entry.child.exitCode != null) {
          const stderr = fs.existsSync(artifactPaths.serveStderr)
            ? fs.readFileSync(artifactPaths.serveStderr, "utf8")
            : "";
          throw new Error(`director pdf function ${entry.functionName} exited early (${entry.child.exitCode}): ${stderr}`);
        }
      }
      try {
        const results = await Promise.all(
          (Object.keys(FUNCTION_PORTS) as FunctionName[]).map(async (functionName) => {
            const response = await fetch(buildFunctionUrl(functionName, "serve_probe"), {
              method: "OPTIONS",
              headers: {
                Origin: baseUrl,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,apikey,content-type,accept",
              },
            });
            return response.status === 204;
          }),
        );
        return results.every(Boolean) ? true : null;
      } catch {
        return null;
      }
    },
    180_000,
    1_000,
  );

  return {
    children,
    stop: () => {
      for (const entry of children) {
        if (entry.child.exitCode == null) {
          entry.child.kill("SIGTERM");
        }
      }
    },
  };
}

function buildFamilies(): FamilyDefinition[] {
  return [
    {
      family: "management_report",
      functionName: "director-pdf-render",
      documentKind: "management_report",
      expectedRenderBranch: "edge_render_v1",
      buildPayload: () => ({
        version: "v1",
        documentKind: "management_report",
        documentType: "director_report",
        source: "runtime:director_management_report",
        html: "<!doctype html><html><body><h1>Director runtime management report</h1><p>PDF platform hardening smoke.</p></body></html>",
        branchDiagnostics: {
          sourceBranch: "runtime_verify",
          sourceFallbackReason: null,
        },
      }),
    },
    {
      family: "supplier_summary",
      functionName: "director-finance-supplier-summary-pdf",
      documentKind: "supplier_summary",
      expectedRenderBranch: "backend_supplier_summary_v1",
      buildPayload: () => ({
        version: "v1",
        supplier: "Runtime Smoke Supplier",
        kindName: null,
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        dueDaysDefault: 7,
        criticalDays: 14,
      }),
    },
    {
      family: "production_report",
      functionName: "director-production-report-pdf",
      documentKind: "production_report",
      expectedRenderBranch: "backend_production_report_v1",
      buildPayload: () => ({
        version: "v1",
        companyName: "RIK Construction",
        generatedBy: "Director Runtime",
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: null,
        preferPriceStage: "priced",
      }),
    },
    {
      family: "subcontract_report",
      functionName: "director-subcontract-report-pdf",
      documentKind: "subcontract_report",
      expectedRenderBranch: "backend_subcontract_report_v1",
      buildPayload: () => ({
        version: "v1",
        companyName: "RIK Construction",
        generatedBy: "Director Runtime",
        periodFrom: "2026-03-01",
        periodTo: "2026-03-31",
        objectName: null,
      }),
    },
  ];
}

async function runOptionsProbe(definition: FamilyDefinition, caseId: string) {
  const response = await fetch(buildFunctionUrl(definition.functionName, caseId), {
    method: "OPTIONS",
    headers: {
      Origin: baseUrl,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,apikey,content-type,accept",
    },
  });
  return {
    status: response.status,
    ok: response.status === 204,
    headers: normalizeHeaders(response.headers),
  };
}

async function runBrowserPost(
  page: import("playwright").Page,
  definition: FamilyDefinition,
  payload: JsonRecord,
  accessToken: string,
  caseId: string,
) {
  return await page.evaluate(
    async ({ url, payload: body, accessToken: token, anonKey: browserAnonKey }) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: browserAnonKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });
        const text = await response.text();
        let json: unknown = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = text;
        }
        return {
          ok: true,
          status: response.status,
          body: json,
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    {
      url: buildFunctionUrl(definition.functionName, caseId),
      payload,
      accessToken,
      anonKey,
    },
  );
}

async function fetchSignedUrlReachable(signedUrl: string) {
  try {
    const response = await fetch(signedUrl, {
      method: "GET",
      headers: { Accept: "application/pdf" },
    });
    return response.ok && String(response.headers.get("content-type") || "").includes("pdf");
  } catch {
    return false;
  }
}

async function runFamilySuccessProbe(
  page: import("playwright").Page,
  definition: FamilyDefinition,
  accessToken: string,
): Promise<CorsDiagnostic> {
  const caseId = `${definition.family}_${Date.now().toString(36)}`;
  const payload = definition.buildPayload();
  const options = await runOptionsProbe(definition, `${caseId}_options`);
  const browserPost = await runBrowserPost(page, definition, payload, accessToken, `${caseId}_post`);

  let postStatus: number | null = null;
  let postPayload: unknown = null;
  let signedUrl: string | null = null;
  let contractOk = false;
  let renderer: string | null = null;
  let renderBranch: string | null = null;
  let error: string | null = null;
  let postHeaders: Record<string, string> = {};
  let postOk = false;

  try {
    const postResponse = await fetch(buildFunctionUrl(definition.functionName, `${caseId}_node_post`), {
      method: "POST",
      headers: {
        Origin: baseUrl,
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    postStatus = postResponse.status;
    postHeaders = normalizeHeaders(postResponse.headers);
    postPayload = await parseResponsePayload(postResponse);
    postOk = postResponse.ok;
  } catch (postError) {
    error = getErrorMessage(postError);
  }

  if (browserPost.ok !== true) {
    error = text((browserPost as { error?: unknown }).error) || "web POST failed";
  } else if (
    Number((browserPost as { status?: unknown }).status) < 200 ||
    Number((browserPost as { status?: unknown }).status) >= 300
  ) {
    error = `web POST failed with HTTP ${String((browserPost as { status?: unknown }).status ?? "")}`;
  }

  const normalizedBody = postPayload && typeof postPayload === "object" && !Array.isArray(postPayload)
    ? (postPayload as Record<string, unknown>)
    : null;
  const browserBody = (browserPost as { body?: unknown }).body;

  if (normalizedBody) {
    signedUrl = text(normalizedBody.signedUrl);
    renderer = text(normalizedBody.renderer) || null;
    renderBranch = text(normalizedBody.renderBranch) || null;
    contractOk =
      normalizedBody.ok === true &&
      text(normalizedBody.renderVersion) === "v1" &&
      text(normalizedBody.sourceKind) === "remote-url" &&
      text(normalizedBody.documentKind) === definition.documentKind &&
      text(normalizedBody.renderBranch) === definition.expectedRenderBranch &&
      !!signedUrl &&
      !!text(normalizedBody.bucketId) &&
      !!text(normalizedBody.storagePath) &&
      !!text(normalizedBody.fileName) &&
      (renderer === "browserless_puppeteer" || renderer === "local_browser_puppeteer");
  }

  const signedUrlReachable = signedUrl ? await fetchSignedUrlReachable(signedUrl) : false;
  const corsOk =
    options.ok &&
    options.headers["access-control-allow-origin"] === "*" &&
    String(options.headers["access-control-allow-methods"] || "").includes("POST") &&
    String(options.headers["access-control-allow-headers"] || "").toLowerCase().includes("authorization") &&
    postHeaders["access-control-allow-origin"] === "*" &&
    String(postHeaders["content-type"] || "").includes("application/json");

  if (!contractOk && !error) {
    error = "success payload contract mismatch";
  }
  if (browserPost.ok === true && browserBody && typeof browserBody === "object" && !Array.isArray(browserBody)) {
    const browserRecord = browserBody as Record<string, unknown>;
    if (text(browserRecord.renderBranch) !== definition.expectedRenderBranch) {
      error = `browser payload renderBranch mismatch: ${text(browserRecord.renderBranch)}`;
    }
  }

  return {
    family: definition.family,
    functionName: definition.functionName,
    optionsStatus: options.status,
    optionsOk: options.ok,
    optionsHeaders: options.headers,
    postStatus,
    postOk,
    postHeaders,
    postPayload,
    signedUrl,
    signedUrlReachable,
    contractOk,
    corsOk,
    renderer,
    renderBranch,
    error,
  };
}

async function runTypedErrorProbe(
  caseName: "auth_failed" | "validation_failed",
  definition: FamilyDefinition,
  payload: JsonRecord,
  accessToken?: string,
): Promise<ErrorDiagnostic> {
  let status: number | null = null;
  let headers: Record<string, string> = {};
  let body: unknown = null;
  let classifiedAs: string | null = null;
  let error: string | null = null;
  try {
    const response = await fetch(buildFunctionUrl(definition.functionName, `${caseName}_${Date.now().toString(36)}`), {
      method: "POST",
      headers: {
        Origin: baseUrl,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        apikey: anonKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    status = response.status;
    headers = normalizeHeaders(response.headers);
    body = await parseResponsePayload(response);
    const record = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
    classifiedAs = classifyDirectorPdfTransportError({
      message: record ? text(record.error) : text(body),
      status,
      serverErrorCode: record ? (text(record.errorCode) as any) : null,
      isWeb: true,
    });
  } catch (probeError) {
    error = getErrorMessage(probeError);
  }

  return {
    caseName,
    functionName: definition.functionName,
    status,
    corsPreserved:
      headers["access-control-allow-origin"] === "*" &&
      String(headers["content-type"] || "").includes("application/json"),
    payload: body,
    classifiedAs,
    error,
  };
}

async function runWebViewerOpen(page: import("playwright").Page, signedUrl: string) {
  const consoleEntries: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];
  const networkResponses: Array<{ url: string; status: number }> = [];

  page.on("console", (message) => {
    consoleEntries.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error?.message ?? error));
  });
  page.on("response", (response) => {
    if (response.url().includes("director_pdf_exports") || response.url().includes("/pdf-viewer")) {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
      });
    }
  });

  const routeUrl =
    `${baseUrl}/pdf-viewer?uri=${encodeURIComponent(signedUrl)}&fileName=${encodeURIComponent("director-platform-hardening.pdf")}` +
    `&title=${encodeURIComponent("Director PDF Runtime")}&sourceKind=remote-url&documentType=director_report&originModule=director&source=generated`;

  await page.goto(routeUrl, { waitUntil: "domcontentloaded" });

  try {
    await poll(
      "director-pdf-web-viewer-ready",
      async () => {
        const hasIframeSrcReady = consoleEntries.some(
          (entry) =>
            entry.text.includes("[pdf-viewer] web_iframe_src_ready")
            || entry.text.includes("[pdf-viewer] web_remote_fetch_ready"),
        );
        const hasReady = consoleEntries.some((entry) => entry.text.includes("[pdf-viewer] ready"));
        const iframeSrc = await page.locator("iframe").first().getAttribute("src").catch(() => null);
        if (hasIframeSrcReady && hasReady && iframeSrc) {
          return true;
        }
        return null;
      },
      45_000,
      500,
    );
  } catch (error) {
    const iframeSrc = await page.locator("iframe").first().getAttribute("src").catch(() => "");
    const contentSnippet = await page.content().then((html) => html.slice(0, 4000)).catch(() => "");
    const debug = {
      error: getErrorMessage(error),
      iframeSrc,
      contentSnippet,
      consoleEntries: consoleEntries.slice(-20),
      pageErrors: pageErrors.slice(-10),
      networkResponses: networkResponses.slice(-20),
    };
    throw new Error(`director-pdf-web-viewer-ready failed: ${JSON.stringify(debug)}`);
  }

  const iframeSrc = await page.locator("iframe").first().getAttribute("src").catch(() => "");
  const blockingConsoleErrors = consoleEntries.filter(
    (entry) =>
      entry.type === "error" &&
      !/Accessing element\.ref was removed in React 19/i.test(entry.text),
  );
  const openFailed = consoleEntries.some((entry) =>
    /\[pdf-viewer\] (web_remote_fetch_error|load_error|viewer_error_state)/i.test(entry.text),
  );

  return {
    iframeSrc: iframeSrc || "",
    fetchReady: consoleEntries.some(
      (entry) =>
        entry.text.includes("[pdf-viewer] web_iframe_src_ready")
        || entry.text.includes("[pdf-viewer] web_remote_fetch_ready"),
    ),
    viewerReady: consoleEntries.some((entry) => entry.text.includes("[pdf-viewer] ready")),
    blockingConsoleErrors,
    pageErrors,
    networkResponses,
    openFailed,
  };
}

function encodeRoute(route: Record<string, string>) {
  const params = new URLSearchParams(route);
  return `rik://pdf-viewer?${params.toString()}`;
}

function readAllLiveLogText(relativePaths: string[]) {
  return [...new Set(relativePaths.filter(Boolean))]
    .map((relativePath) => {
      const absolutePath = path.join(projectRoot, relativePath);
      if (!fs.existsSync(absolutePath)) return "";
      const textValue = fs.readFileSync(absolutePath, "utf8");
      if (!textValue.trim()) return "";
      return `# ${relativePath}\n${textValue}`;
    })
    .filter(Boolean)
    .join("\n");
}

function hasToken(source: string, token: string) {
  return String(source || "").includes(token);
}

function readLogDelta(relativePaths: string[], baselineLength: number) {
  const source = readAllLiveLogText(relativePaths);
  if (baselineLength <= 0) return source;
  if (source.length <= baselineLength) return source;
  return source.slice(baselineLength);
}

function buildRuntimeCaseLogExcerpt(logText: string) {
  return String(logText || "")
    .split(/\r?\n/)
    .filter((line) =>
      /pdf-viewer|pdf-runner|attachment-opener|viewer_route_mounted|native_handoff|android_remote_pdf_open|load_error|viewer_error_state/i.test(
        line,
      ))
    .slice(-30);
}

function hasNativeHandoffSettled(logText: string) {
  return (
    hasToken(logText, "native_handoff_ready") ||
    hasToken(logText, "android_remote_pdf_open_ready")
  );
}

function getPid(packageName: string | null) {
  if (!packageName) return "";
  try {
    return execFileSync("adb", ["shell", "pidof", packageName], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  } catch (error) {
    if (error && typeof error === "object" && "stdout" in error) {
      return String((error as { stdout?: unknown }).stdout ?? "").trim();
    }
    return "";
  }
}

async function bootstrapAndroidSurface(packageName: string | null) {
  androidHarness.startAndroidDevClientProject(packageName, 8081, { stopApp: false });
  await sleep(3_000);
}

async function runAndroidRuntimeCase(args: {
  family: DirectorPdfFamily | "invalid_source";
  route: string;
  expected: "ready" | "controlled_error";
  logPaths: string[];
  packageName: string | null;
}): Promise<AndroidRuntimeResult> {
  try {
    execFileSync("adb", ["logcat", "-c"], {
      cwd: projectRoot,
      stdio: "pipe",
      timeout: 30_000,
    });
  } catch {}

  const baselineLength = readAllLiveLogText(args.logPaths).length;
  let logText = "";
  let caseError: string | null = null;

  try {
    androidHarness.startAndroidRoute(args.packageName, args.route);
  } catch (error) {
    caseError = getErrorMessage(error);
    logText = readLogDelta(args.logPaths, baselineLength);
  }

  if (!caseError) {
    try {
      logText = await poll(
        `director-pdf-open:${args.family}`,
        async () => {
          const current = readLogDelta(args.logPaths, baselineLength);
          const routeMounted = hasToken(current, "viewer_route_mounted");
          const handoffStarted = hasToken(current, "native_handoff_start");
          const handoffReady = hasNativeHandoffSettled(current);
          const handoffError =
            hasToken(current, "native_handoff_error") ||
            hasToken(current, "viewer_error_state") ||
            hasToken(current, "load_error");

          if (!routeMounted) return null;
          if (args.expected === "ready" && (!handoffStarted || !handoffReady)) return null;
          if (args.expected === "controlled_error" && !handoffError) return null;
          return current;
        },
        45_000,
        1_000,
      );
    } catch (error) {
      caseError = getErrorMessage(error);
      logText = readLogDelta(args.logPaths, baselineLength);
    }
  }

  await sleep(1_500);
  const processAlive = Boolean(getPid(args.packageName));
  const routeMounted = hasToken(logText, "viewer_route_mounted");
  const handoffStarted = hasToken(logText, "native_handoff_start");
  const handoffReady = hasNativeHandoffSettled(logText);
  const handoffError =
    hasToken(logText, "native_handoff_error") ||
    hasToken(logText, "viewer_error_state") ||
    hasToken(logText, "load_error");
  const runtimeSettled =
    routeMounted &&
    ((args.expected === "ready" && handoffStarted && handoffReady) ||
      (args.expected === "controlled_error" && handoffError));
  const fatalCrash = !processAlive && routeMounted;

  return {
    family: args.family,
    routeMounted,
    handoffStarted,
    handoffReady,
    handoffError,
    processAlive,
    fatalCrash,
    logExcerpt: buildRuntimeCaseLogExcerpt(logText),
    expected: args.expected,
    passed: runtimeSettled && processAlive && !fatalCrash,
    error: caseError,
  };
}

function buildSourceScan() {
  const renderService = readText("src/lib/api/directorPdfRender.service.ts");
  const renderFunction = readText("supabase/functions/director-pdf-render/index.ts");
  const supplierFunction = readText("supabase/functions/director-finance-supplier-summary-pdf/index.ts");
  const productionFunction = readText("supabase/functions/director-production-report-pdf/index.ts");
  const subcontractFunction = readText("supabase/functions/director-subcontract-report-pdf/index.ts");
  const reportsPdfService = readText("src/screens/director/director.reports.pdfService.ts");
  const supplierBackend = readText("src/lib/api/directorFinanceSupplierPdfBackend.service.ts");
  const productionBackend = readText("src/lib/api/directorProductionReportPdfBackend.service.ts");
  const subcontractBackend = readText("src/lib/api/directorSubcontractReportPdfBackend.service.ts");

  return {
    renderServiceCanonicalOnly:
      renderService.includes('functionName: DIRECTOR_PDF_RENDER_FUNCTION') &&
      !renderService.includes("renderPdfHtmlToUri"),
    renderServiceAllowsParityRenderers:
      renderService.includes('allowedRenderers: ["browserless_puppeteer", "local_browser_puppeteer"]'),
    renderFunctionHasSharedCorsHelpers:
      renderFunction.includes("createDirectorPdfOptionsResponse") &&
      renderFunction.includes("createDirectorPdfSuccessResponse") &&
      renderFunction.includes("createDirectorPdfErrorResponse"),
    renderFunctionHasLocalRendererFallback:
      renderFunction.includes("resolveLocalBrowserExecutable") &&
      renderFunction.includes('renderer: browserWsEndpoint ? "browserless_puppeteer" : "local_browser_puppeteer"'),
    familyEdgeFunctionsShareCorsContract:
      supplierFunction.includes("createDirectorPdfOptionsResponse") &&
      productionFunction.includes("createDirectorPdfOptionsResponse") &&
      subcontractFunction.includes("createDirectorPdfOptionsResponse"),
    familyBackendServicesUseSharedInvoker:
      supplierBackend.includes("invokeDirectorPdfBackend") &&
      productionBackend.includes("invokeDirectorPdfBackend") &&
      subcontractBackend.includes("invokeDirectorPdfBackend"),
    reportsPdfServiceNoClientFallback:
      !reportsPdfService.includes("exportDirectorProductionReportPdf") &&
      !reportsPdfService.includes("exportDirectorSubcontractReportPdf"),
  };
}

async function main() {
  let functionServer: { children: Array<{ functionName: FunctionName; child: ChildProcessWithoutNullStreams }>; stop: () => void } | null = null;
  let browser: import("playwright").Browser | null = null;
  let runtimeUser: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let androidPrepared: Awaited<ReturnType<typeof androidHarness.prepareAndroidRuntime>> | null = null;

  const sourceScan = buildSourceScan();
  const families = buildFamilies();
  const webCorsDiagnostics: CorsDiagnostic[] = [];
  const errorDiagnostics: ErrorDiagnostic[] = [];
  const androidDiagnostics: AndroidRuntimeResult[] = [];
  let webViewerResult: Record<string, unknown> | null = null;
  let verifierError: string | null = null;

  try {
    functionServer = await startLocalFunctionServer();
    runtimeUser = await createTempUser(admin, {
      role: "director",
      fullName: "Director PDF Platform Runtime",
      emailPrefix: "director-pdf-platform",
    });
    const signedIn = await signInDirector(runtimeUser);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    for (const family of families) {
      webCorsDiagnostics.push(await runFamilySuccessProbe(page, family, signedIn.accessToken));
    }

    errorDiagnostics.push(
      await runTypedErrorProbe("auth_failed", families[0], families[0].buildPayload()),
      await runTypedErrorProbe("validation_failed", families[0], { version: "v1" }, signedIn.accessToken),
    );

    const viewerPage = await context.newPage();
    const webSignedUrl =
      webCorsDiagnostics.find((entry) => entry.family === "production_report")?.signedUrl ??
      webCorsDiagnostics.find((entry) => entry.signedUrl)?.signedUrl ??
      "";
    if (!webSignedUrl) {
      throw new Error("No signed URL available for web viewer open smoke");
    }
    webViewerResult = await runWebViewerOpen(viewerPage, webSignedUrl);

    androidPrepared = await androidHarness.prepareAndroidRuntime();
    const harnessLogPaths = androidHarness.getDevClientLogPaths();
    const runtimeLogPaths = [
      harnessLogPaths.stdoutPath,
      harnessLogPaths.stderrPath,
      "artifacts/director-pdf-dev-client.stdout.log",
      "artifacts/director-pdf-dev-client.stderr.log",
      "artifacts/expo-dev-client-8081.stdout.log",
      "artifacts/expo-dev-client-8081.stderr.log",
    ].filter((value, index, items) => Boolean(value) && items.indexOf(value) === index);

    const androidSignedUrl =
      webCorsDiagnostics.find((entry) => entry.family === "supplier_summary")?.signedUrl ??
      webCorsDiagnostics.find((entry) => entry.signedUrl)?.signedUrl ??
      "";
    if (!androidSignedUrl) {
      throw new Error("No signed URL available for Android open smoke");
    }

    await bootstrapAndroidSurface(androidPrepared.packageName);
    androidDiagnostics.push(
      await runAndroidRuntimeCase({
        family: "supplier_summary",
        route: encodeRoute({
          uri: androidSignedUrl,
          fileName: "director-platform-hardening.pdf",
          documentType: "director_report",
          originModule: "director",
          source: "generated",
        }),
        expected: "ready",
        logPaths: runtimeLogPaths,
        packageName: androidPrepared.packageName,
      }),
    );

    await bootstrapAndroidSurface(androidPrepared.packageName);
    androidDiagnostics.push(
      await runAndroidRuntimeCase({
        family: "invalid_source",
        route: encodeRoute({
          uri: "blob:https://example.com/director-platform-hardening.pdf",
          fileName: "director-invalid-source.pdf",
          documentType: "director_report",
          originModule: "director",
          source: "generated",
        }),
        expected: "controlled_error",
        logPaths: runtimeLogPaths,
        packageName: androidPrepared.packageName,
      }),
    );

    const iosFamilyChecks = webCorsDiagnostics
      .filter((entry) => entry.signedUrl)
      .map((entry) => {
        const snapshot = resolvePdfViewerDirectSnapshot({
          uri: entry.signedUrl ?? "",
          fileName: `${entry.family}.pdf`,
          title: entry.family,
          sourceKind: "remote-url",
          documentType: "director_report",
          originModule: "director",
          source: "generated",
        });
        const resolution = resolvePdfViewerResolution({
          session: snapshot?.session ?? null,
          asset: snapshot?.asset ?? null,
          platform: "ios",
        });
        return {
          family: entry.family,
          resolutionKind: resolution.kind,
          sourceKind: "sourceKind" in resolution ? resolution.sourceKind : null,
          renderer: "renderer" in resolution ? resolution.renderer : null,
          canonicalUri: "canonicalUri" in resolution ? resolution.canonicalUri : null,
          safe:
            resolution.kind === "resolved-native-handoff" &&
            resolution.sourceKind === "remote-url" &&
            resolution.renderer === "native-handoff",
        };
      });

    const familyParitySafe =
      Object.values(sourceScan).every(Boolean) &&
      webCorsDiagnostics.length === families.length &&
      webCorsDiagnostics.every((entry) => entry.corsOk && entry.contractOk && entry.signedUrlReachable) &&
      new Set(webCorsDiagnostics.map((entry) => entry.renderer)).size <= 2 &&
      webCorsDiagnostics.every((entry) => entry.renderBranch != null) &&
      iosFamilyChecks.every((entry) => entry.safe);

    const authDiagnostic = errorDiagnostics.find((entry) => entry.caseName === "auth_failed") ?? null;
    const validationDiagnostic = errorDiagnostics.find((entry) => entry.caseName === "validation_failed") ?? null;
    const webViewerRecord = (webViewerResult ?? {}) as Record<string, unknown>;
    const webPreflightOk = webCorsDiagnostics.every((entry) => entry.optionsOk && entry.corsOk);
    const webPostOk = webCorsDiagnostics.every((entry) => entry.postOk && entry.contractOk);
    const errorPathCorsPreserved = errorDiagnostics.every((entry) => entry.corsPreserved);
    const typedTransportErrorClassificationOk =
      authDiagnostic?.classifiedAs === "auth_failed" &&
      validationDiagnostic?.classifiedAs === "edge_function_http_error";
    const directorPdfWebOpen =
      webViewerRecord.fetchReady === true &&
      webViewerRecord.viewerReady === true &&
      webViewerRecord.openFailed !== true &&
      Array.isArray(webViewerRecord.blockingConsoleErrors) &&
      (webViewerRecord.blockingConsoleErrors as unknown[]).length === 0 &&
      Array.isArray(webViewerRecord.pageErrors) &&
      (webViewerRecord.pageErrors as unknown[]).length === 0 &&
      text(webViewerRecord.iframeSrc).length > 0;
    const directorPdfAndroidOpen =
      androidDiagnostics.find((entry) => entry.family === "supplier_summary")?.passed === true;
    const invalidSourceControlled =
      androidDiagnostics.find((entry) => entry.family === "invalid_source")?.passed === true;
    const noFatalCrash = androidDiagnostics.every((entry) => entry.fatalCrash === false);
    const processAliveAfterOpen = androidDiagnostics.every((entry) => entry.processAlive === true);
    const directorPdfIosContractSafe = iosFamilyChecks.every((entry) => entry.safe);

    const smoke = {
      status:
        webPreflightOk &&
        webPostOk &&
        directorPdfWebOpen &&
        directorPdfAndroidOpen &&
        directorPdfIosContractSafe &&
        errorPathCorsPreserved &&
        typedTransportErrorClassificationOk &&
        noFatalCrash &&
        processAliveAfterOpen &&
        familyParitySafe &&
        invalidSourceControlled
          ? "GREEN"
          : "NOT_GREEN",
      webPreflightOk,
      webPostOk,
      directorPdfWebOpen,
      directorPdfAndroidOpen,
      directorPdfIosContractSafe,
      errorPathCorsPreserved,
      typedTransportErrorClassificationOk,
      invalidSourceControlled,
      noFatalCrash,
      processAliveAfterOpen,
      familyParitySafe,
      webFamilies: webCorsDiagnostics,
      typedErrorDiagnostics: errorDiagnostics,
      iosFamilyChecks,
      webViewerResult,
      androidDiagnostics,
      sourceScan,
      servedFrom: Object.fromEntries(
        (Object.keys(FUNCTION_PORTS) as FunctionName[]).map((functionName) => [
          functionName,
          `${localFunctionHost}:${FUNCTION_PORTS[functionName]}`,
        ]),
      ),
      knownLimitations: [],
    };

    writeJson(artifactPaths.webCors, {
      status: webPreflightOk && webPostOk && errorPathCorsPreserved ? "passed" : "failed",
      families: webCorsDiagnostics,
      errorDiagnostics,
    });
    writeJson(artifactPaths.mobile, {
      status:
        directorPdfAndroidOpen && directorPdfIosContractSafe && invalidSourceControlled && noFatalCrash && processAliveAfterOpen
          ? "passed"
          : "failed",
      androidDiagnostics,
      iosFamilyChecks,
    });
    writeJson(artifactPaths.parity, {
      status: familyParitySafe ? "passed" : "failed",
      sourceScan,
      families: webCorsDiagnostics.map((entry) => ({
        family: entry.family,
        functionName: entry.functionName,
        renderBranch: entry.renderBranch,
        renderer: entry.renderer,
        sourceKind: entry.postPayload && typeof entry.postPayload === "object" && !Array.isArray(entry.postPayload)
          ? text((entry.postPayload as Record<string, unknown>).sourceKind)
          : null,
        contractOk: entry.contractOk,
        corsOk: entry.corsOk,
        signedUrlReachable: entry.signedUrlReachable,
      })),
      iosFamilyChecks,
      safeSwitchVerdict: familyParitySafe,
    });
    writeJson(artifactPaths.smoke, smoke);

    writeText(
      artifactPaths.proof,
      [
        "# Director PDF Platform Hardening Proof",
        "",
        "## Root cause",
        "- Director PDF families had drift across edge CORS handling, client transport ownership, and render execution parity.",
        "- `director.reports.pdfService` still allowed family split between backend-first and screen-owned fallback paths.",
        "- `director-pdf-render` was the outlier: it required browserless-only rendering, while the other director PDF edge families already supported deterministic local browser rendering. That kept the family contract incomplete and blocked platform-safe parity.",
        "",
        "## Canonical boundary now",
        "- Director action -> backend PDF service -> Edge Function -> canonical `remote-url` descriptor -> platform-safe open/view boundary.",
        "- All four director PDF families now share one response/CORS contract and one typed transport error model.",
        "",
        "## What was verified",
        `- Web preflight: ${webPreflightOk ? "pass" : "fail"}`,
        `- Web POST success across families: ${webPostOk ? "pass" : "fail"}`,
        `- Error path keeps CORS headers: ${errorPathCorsPreserved ? "pass" : "fail"}`,
        `- Typed transport classification: ${typedTransportErrorClassificationOk ? "pass" : "fail"}`,
        `- Web viewer open: ${directorPdfWebOpen ? "pass" : "fail"}`,
        `- Android open: ${directorPdfAndroidOpen ? "pass" : "fail"}`,
        `- iOS contract-safe source handling: ${directorPdfIosContractSafe ? "pass" : "fail"}`,
        `- Invalid source controlled fail: ${invalidSourceControlled ? "pass" : "fail"}`,
        `- No fatal crash / process alive: ${noFatalCrash && processAliveAfterOpen ? "pass" : "fail"}`,
        `- Family parity safe: ${familyParitySafe ? "pass" : "fail"}`,
        "",
        "## What did not change",
        "- Director finance/report business semantics were not changed.",
        "- Buyer/foreman/accountant/warehouse flows were not touched.",
        "- No client-side PDF generation fallback was reintroduced.",
        "- No UI rewrite or broad PDF subsystem rewrite was done.",
        "",
        `## Final status`,
        `- ${smoke.status}`,
        "",
      ].join("\n"),
    );

    console.log(JSON.stringify(smoke, null, 2));
    if (smoke.status !== "GREEN") {
      process.exitCode = 1;
    }
  } catch (error) {
    verifierError = getErrorMessage(error);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    androidPrepared?.devClient.cleanup();
    functionServer?.stop();
    await cleanupTempUser(admin, runtimeUser);
  }

  if (verifierError) {
    writeJson(artifactPaths.smoke, {
      status: "NOT_GREEN",
      verifierError,
      sourceScan,
    });
    writeText(
      artifactPaths.proof,
      `# Director PDF Platform Hardening Proof\n\n## Final status\n- NOT_GREEN\n\n## Verifier error\n- ${verifierError}\n`,
    );
    writeJson(artifactPaths.webCors, {
      status: "failed",
      verifierError,
    });
    writeJson(artifactPaths.mobile, {
      status: "failed",
      verifierError,
    });
    writeJson(artifactPaths.parity, {
      status: "failed",
      verifierError,
      sourceScan,
    });
    console.error(JSON.stringify({ status: "NOT_GREEN", verifierError }, null, 2));
    process.exitCode = 1;
  }
}

void main();
