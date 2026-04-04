import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import type { Locator, Page, Response } from "playwright";

import { captureWebFailureArtifact, launchWebRuntime, poll, writeJsonArtifact, baseUrl } from "./_shared/webRuntimeHarness";
import { cleanupTempUser, createTempUser, createVerifierAdmin } from "./_shared/testUserDiscipline";

process.env.RIK_WEB_BROWSER_CHANNEL ??= "msedge";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("director-pdf-render-web-click-verify");
const functionName = "director-pdf-render";
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;

const smokePath = path.join(projectRoot, "artifacts/director-pdf-render-web-click-smoke.json");
const proofPath = path.join(projectRoot, "artifacts/director-pdf-render-web-click-proof.md");
const viewerDiagnosticsPath = path.join(projectRoot, "artifacts/director-pdf-render-viewer-diagnostics.json");
const webServerStdoutPath = path.join(projectRoot, "artifacts/director-pdf-render-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/director-pdf-render-web.stderr.log");
const failureArtifactBase = path.join(projectRoot, "artifacts/director-pdf-render-web-click-failure");
const successArtifactBase = path.join(projectRoot, "artifacts/director-pdf-render-web-click-success");

const WEB_LABELS = {
  header: "Контроль",
  financeTab: "Финансы",
  debtCard: "Обязательства",
  debtModalTitle: "Долги и риски",
  pdfAction: "PDF",
};

const WEB_TEXT = {
  header: [WEB_LABELS.header, "РљРѕРЅС‚СЂРѕР»СЊ"],
  financeTab: [WEB_LABELS.financeTab, "Р¤РёРЅР°РЅСЃС‹"],
  debtCard: [WEB_LABELS.debtCard, "РћР±СЏР·Р°С‚РµР»СЊСЃС‚РІР°"],
  debtModalTitle: [WEB_LABELS.debtModalTitle, "Р”РѕР»РіРё Рё СЂРёСЃРєРё"],
  pdfAction: [WEB_LABELS.pdfAction],
};

const FUNCTION_URL_RE = /director-pdf-render/i;
const VIEWER_ERROR_RE = /\[pdf-viewer\] (web_remote_fetch_error|load_error|viewer_error_state|web_iframe_error)/i;
const VIEWER_READY_TOKENS = ["[pdf-viewer] ready"];
const VIEWER_ROUTE_TOKENS = ["[pdf-viewer] viewer_route_mounted"];
const VIEWER_SRC_TOKENS = ["[pdf-viewer] web_iframe_src_ready", "[pdf-viewer] signedUrl"];
const NAVIGATION_TOKEN = "[pdf-document-actions] about_to_navigate_to_viewer";
const PDF_START_TOKENS = [
  "[pdf-document-actions] prepare_requested",
  "[pdf-document-actions] prepare_ready",
  "[pdf-document-actions] preview",
  "[director-pdf-render]",
];

if (!supabaseUrl || !anonKey || !supabaseProjectRef) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

type RelevantResponse = {
  url: string;
  status: number;
  method: string;
};

type FunctionResponseRecord = RelevantResponse & {
  headers: Record<string, string>;
  requestHeaders: Record<string, string>;
  payload: unknown;
  signedUrl: string | null;
  renderBranch: string | null;
  errorCode: string | null;
  error: string | null;
};

type ExactBlocker = {
  layer: string;
  exactFile: string;
  exactFunction: string;
  exactCondition: string;
  runtimeSymptom: string;
};

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

type LocatorScope = Page | Locator;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesAnyLabel(source: string, labels: string[]) {
  return labels.some((label) => source.includes(label));
}

function normalizeBodyText(value: string) {
  return String(value || "").replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim();
}

async function bodyText(page: Page) {
  return normalizeBodyText(await page.evaluate(() => document.body.innerText || ""));
}

async function scopeText(scope: Locator) {
  return normalizeBodyText(
    await scope.evaluate((node) => {
      const element = node as HTMLElement;
      return element.innerText || element.textContent || "";
    }).catch(() => ""),
  );
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

function deleteIfExists(fullPath: string) {
  if (!fs.existsSync(fullPath)) return;
  fs.rmSync(fullPath, { force: true });
}

function writeText(fullPath: string, payload: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
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
    return {
      started: false,
      stop: () => {},
    };
  }

  fs.mkdirSync(path.dirname(webServerStdoutPath), { recursive: true });
  fs.writeFileSync(webServerStdoutPath, "", "utf8");
  fs.writeFileSync(webServerStderrPath, "", "utf8");

  const child = spawn(
    "cmd.exe",
    ["/c", "npx", "expo", "start", "--web", "-c"],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(webServerStdoutPath, String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(webServerStderrPath, String(chunk));
  });

  await poll(
    "director-pdf-render-web-server-ready",
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
    stop: () => {
      if (child.exitCode == null) {
        child.kill("SIGTERM");
      }
    },
  };
}

async function findVisiblePressableByLabels(
  scope: LocatorScope,
  labels: string[],
  mode: "exact" | "startsWith" | "includes" = "exact",
): Promise<Locator | null> {
  const locator = scope.locator('[tabindex="0"], button, a[role="tab"]');
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const candidateText = normalizeBodyText(await candidate.textContent().catch(() => ""));
    const matched = labels.some((label) => {
      if (mode === "exact") return candidateText === label;
      if (mode === "startsWith") return candidateText.startsWith(label);
      return candidateText.includes(label);
    });
    if (matched) return candidate;
  }
  return null;
}

async function findVisibleControlByLabel(scope: LocatorScope, labels: string[]): Promise<Locator | null> {
  const locator = scope.getByLabel(new RegExp(labels.map(escapeRegex).join("|"), "i"));
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

async function waitForVisiblePressableByLabels(
  scope: LocatorScope,
  labels: string[],
  timeoutMs = 30_000,
  mode: "exact" | "startsWith" | "includes" = "exact",
) {
  return await poll(
    `director-pdf-render-pressable:${labels[0] ?? "label"}`,
    async () => (await findVisiblePressableByLabels(scope, labels, mode)) ?? null,
    timeoutMs,
    250,
  );
}

async function waitForVisibleControlByLabel(scope: LocatorScope, labels: string[], timeoutMs = 30_000) {
  return await poll(
    `director-pdf-render-control:${labels[0] ?? "label"}`,
    async () => (await findVisibleControlByLabel(scope, labels)) ?? null,
    timeoutMs,
    250,
  );
}

async function getLocatorClickPoint(locator: Locator) {
  return await locator.evaluate((node) => {
    let current: HTMLElement | null = node as HTMLElement;
    let chosen: HTMLElement = node as HTMLElement;
    while (current) {
      const rect = current.getBoundingClientRect();
      const fitsCard =
        rect.width >= 32 &&
        rect.height >= 32 &&
        rect.width <= window.innerWidth &&
        rect.height <= window.innerHeight;
      if (fitsCard) {
        chosen = current;
        break;
      }
      current = current.parentElement;
    }

    const rect = chosen.getBoundingClientRect();
    return {
      x: rect.left + Math.max(12, Math.min(rect.width / 2, rect.width - 12)),
      y: rect.top + rect.height / 2,
    };
  }).catch(() => null);
}

async function activatePressable(
  page: Page,
  locator: Locator,
  verify?: () => Promise<boolean>,
  verifyTimeoutMs = 2_500,
): Promise<string | null> {
  const attempts: { label: string; run: () => Promise<void> }[] = [
    {
      label: "locator.click",
      run: async () => {
        await locator.click({ force: true });
      },
    },
    {
      label: "keyboard.enter",
      run: async () => {
        await locator.focus();
        await page.keyboard.press("Enter");
      },
    },
    {
      label: "mouse.click",
      run: async () => {
        const point = await getLocatorClickPoint(locator);
        if (!point) {
          throw new Error("click point unavailable");
        }
        await page.mouse.click(point.x, point.y);
      },
    },
    {
      label: "dom.click",
      run: async () => {
        await locator.evaluate((node) => {
          if (node instanceof HTMLElement) {
            node.click();
          }
        });
      },
    },
  ];

  for (const attempt of attempts) {
    try {
      await attempt.run();
      await page.waitForTimeout(250);
      if (!verify) {
        return attempt.label;
      }
      const verified = await poll(
        `director-pdf-render-activation:${attempt.label}`,
        async () => ((await verify()) ? true : null),
        verifyTimeoutMs,
        250,
      ).catch(() => false);
      if (verified) {
        return attempt.label;
      }
    } catch {
      // try the next activation path
    }
  }

  return null;
}

async function waitForVisibleDialog(page: Page, labels: string[], timeoutMs = 20_000) {
  return await poll(
    `director-pdf-render-dialog:${labels[0] ?? "dialog"}`,
    async () => {
      const dialog = page.locator('[role="dialog"][aria-modal="true"]').last();
      if (!(await dialog.isVisible().catch(() => false))) return null;
      const dialogBody = await scopeText(dialog);
      return includesAnyLabel(dialogBody, labels) ? dialog : null;
    },
    timeoutMs,
    250,
  );
}

async function listVisiblePressableTexts(scope: LocatorScope, limit = 30) {
  const locator = scope.locator('[tabindex="0"], button, a[role="tab"]');
  const count = await locator.count();
  const out: string[] = [];
  for (let index = 0; index < count && out.length < limit; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const candidateText = normalizeBodyText(await candidate.textContent().catch(() => ""));
    if (!candidateText) continue;
    out.push(candidateText);
  }
  return out;
}

async function ensureFinanceSurface(page: Page) {
  const initialBody = await bodyText(page);
  const hasFinanceSurface =
    includesAnyLabel(initialBody, WEB_TEXT.debtCard) ||
    includesAnyLabel(initialBody, WEB_TEXT.debtModalTitle);

  if (hasFinanceSurface) return initialBody;

  const financeTab = await waitForVisiblePressableByLabels(page, WEB_TEXT.financeTab, 20_000, "exact");
  await financeTab.click({ force: true });
  return await poll(
    "director-pdf-render-finance-surface",
    async () => {
      const current = await bodyText(page);
      return includesAnyLabel(current, WEB_TEXT.debtCard) ? current : null;
    },
    30_000,
    250,
  );
}

async function signInSession(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "director-pdf-render-web-click-verify-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session;
}

async function hydrateDirectorSession(page: Page, user: { email: string; password: string }) {
  const session = await signInSession(user.email, user.password);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: supabaseStorageKey,
      value: JSON.stringify(session),
    },
  );

  await page.goto(`${baseUrl}/director`, { waitUntil: "networkidle" });
  await poll(
    "director-pdf-render-session-hydrated",
    async () => {
      const currentUrl = page.url();
      const currentBody = await bodyText(page);
      if (
        !currentUrl.includes("/auth/login") &&
        (includesAnyLabel(currentBody, WEB_TEXT.financeTab) || includesAnyLabel(currentBody, WEB_TEXT.debtCard))
      ) {
        return true;
      }
      return null;
    },
    45_000,
    500,
  );
}

async function safeParseFunctionResponse(response: Response): Promise<FunctionResponseRecord> {
  const payload = await parseResponsePayload(response);
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  return {
    url: response.url(),
    status: response.status(),
    method: response.request().method(),
    headers: await response.allHeaders().catch(() => ({})),
    requestHeaders: await response.request().allHeaders().catch(() => ({})),
    payload,
    signedUrl: text(record?.signedUrl) || null,
    renderBranch: text(record?.renderBranch) || null,
    errorCode: text(record?.errorCode) || null,
    error: text(record?.error) || null,
  };
}

function lastConsole(runtime: Awaited<ReturnType<typeof launchWebRuntime>>["runtime"], startIndex: number) {
  return runtime.console.slice(startIndex);
}

function hasAnyToken(entries: { text: string }[], tokens: string[]) {
  return tokens.some((token) => entries.some((entry) => entry.text.includes(token)));
}

function identifyNextBlocker(args: {
  financeModalOpened: boolean;
  pdfButtonFound: boolean;
  pdfButtonClicked: boolean;
  functionCall: FunctionResponseRecord | null;
  navigationLogged: boolean;
  routeReached: boolean;
  viewerRouteMounted: boolean;
  viewerReady: boolean;
  iframeSrc: string;
  viewerErrorLogged: boolean;
}): ExactBlocker | null {
  if (!args.financeModalOpened) {
    return {
      layer: "finance_modal_open",
      exactFile: "src/screens/director/director.finance.panel.ts",
      exactFunction: "onOpenDebt",
      exactCondition: "director finance debt card click did not open the current finance modal",
      runtimeSymptom: "The exact director finance debt card did not reach the modal that owns the current PDF action.",
    };
  }

  if (!args.pdfButtonFound || !args.pdfButtonClicked || !args.functionCall) {
    return {
      layer: "management_report_click",
      exactFile: "src/screens/director/DirectorFinanceCardModal.tsx",
      exactFunction: "DirectorFinanceCardModal",
      exactCondition: "the current PDF header action did not emit the exact management_report backend invoke",
      runtimeSymptom: "The current director PDF action was clicked, but no POST reached director-pdf-render.",
    };
  }

  if (args.functionCall.status !== 200 || !args.functionCall.signedUrl) {
    return {
      layer: "backend_render",
      exactFile: "supabase/functions/director-pdf-render/index.ts",
      exactFunction: "Deno.serve",
      exactCondition: "management_report POST did not complete to a 200 response with signedUrl",
      runtimeSymptom: args.functionCall.error || `HTTP ${args.functionCall.status}`,
    };
  }

  if (!args.routeReached && !args.viewerRouteMounted) {
    return {
      layer: "document_action",
      exactFile: "src/lib/documents/pdfDocumentActions.ts",
      exactFunction: "previewPdfDocument",
      exactCondition: "web management_report preview did not reach /pdf-viewer after a successful function response",
      runtimeSymptom: args.navigationLogged
        ? "Viewer navigation was logged but the route never reached /pdf-viewer."
        : "Successful function response returned signedUrl, but the document action never logged viewer navigation.",
    };
  }

  if (!args.viewerReady || !args.iframeSrc || args.viewerErrorLogged) {
    return {
      layer: "viewer_open",
      exactFile: "app/pdf-viewer.tsx",
      exactFunction: "prepareViewer",
      exactCondition: "web remote embedded branch did not settle to iframe-ready state for the management_report signedUrl",
      runtimeSymptom: args.viewerErrorLogged
        ? "The viewer reached /pdf-viewer but emitted a viewer error before iframe-ready state."
        : "The viewer reached /pdf-viewer but never produced iframe-ready + ready signals with a non-empty iframe src.",
    };
  }

  return null;
}

async function main() {
  let user: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let webServer: WebServerHandle | null = null;
  let runtimeSession: Awaited<ReturnType<typeof launchWebRuntime>> | null = null;

  try {
    deleteIfExists(viewerDiagnosticsPath);
    webServer = await ensureLocalWebServer();
    user = await createTempUser(admin, {
      role: "director",
      fullName: "Director PDF Render Web Click",
      emailPrefix: "director-pdf-render-web-click",
    });

    runtimeSession = await launchWebRuntime();
    const { browser, page, runtime } = runtimeSession;
    const relevantResponses: RelevantResponse[] = [];

    page.on("response", (response) => {
      const url = response.url();
      if (
        FUNCTION_URL_RE.test(url) ||
        url.includes("/pdf-viewer") ||
        url.includes("/director_pdf_exports/") ||
        url.includes("/storage/v1/object/sign/")
      ) {
        relevantResponses.push({
          url,
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    await hydrateDirectorSession(page, user);
    await ensureFinanceSurface(page);

    const debtCard = await waitForVisiblePressableByLabels(page, WEB_TEXT.debtCard, 30_000, "startsWith");
    const debtCardClickMethod = await activatePressable(
      page,
      debtCard,
      async () => {
        const dialog = page.locator('[role="dialog"][aria-modal="true"]').last();
        return await dialog.isVisible().catch(() => false);
      },
      4_000,
    );
    if (!debtCardClickMethod) {
      throw new Error("Debt card click did not open the finance modal");
    }

    const financeDialog = await waitForVisibleDialog(page, WEB_TEXT.debtModalTitle, 15_000);
    const financeModalOpened = financeDialog != null;
    const pdfButton = await waitForVisibleControlByLabel(financeDialog, WEB_TEXT.pdfAction, 20_000).catch(() => null);
    const pdfButtonFound = pdfButton != null;

    let pdfButtonClicked = false;
    let pdfButtonClickMethod: string | null = null;
    let functionCall: FunctionResponseRecord | null = null;
    let routeReached = false;
    let viewerRouteMounted = false;
    let viewerReady = false;
    let viewerErrorLogged = false;
    let navigationLogged = false;
    let iframeSrc = "";
    let finalUrl = page.url();

    if (pdfButton) {
      const consoleBaseline = runtime.console.length;
      const responseBaseline = relevantResponses.length;
      const pageErrorBaseline = runtime.pageErrors.length;
      const functionResponsePromise = page.waitForResponse(
        (response) =>
          FUNCTION_URL_RE.test(response.url()) &&
          response.request().method() === "POST",
        { timeout: 45_000 },
      ).catch(() => null);

      pdfButtonClickMethod = await activatePressable(
        page,
        pdfButton,
        async () => {
          const postConsole = lastConsole(runtime, consoleBaseline);
          return (
            relevantResponses.length > responseBaseline ||
            postConsole.some((entry) => PDF_START_TOKENS.some((token) => entry.text.includes(token)))
          );
        },
        5_000,
      );
      pdfButtonClicked = pdfButtonClickMethod != null;

      const functionResponse = await functionResponsePromise;
      if (functionResponse) {
        functionCall = await safeParseFunctionResponse(functionResponse);
      }

      if (functionCall?.status === 200 && functionCall.signedUrl) {
        finalUrl = await poll(
          "director-pdf-render-viewer-route",
          async () => {
            const currentUrl = page.url();
            const postConsole = lastConsole(runtime, consoleBaseline);
            if (currentUrl.includes("/pdf-viewer") || hasAnyToken(postConsole, VIEWER_ROUTE_TOKENS)) {
              return currentUrl;
            }
            return null;
          },
          30_000,
          250,
        ).catch(() => page.url());

        await poll(
          "director-pdf-render-viewer-ready",
          async () => {
            const postConsole = lastConsole(runtime, consoleBaseline);
            const currentIframeSrc = await page.locator("iframe").first().getAttribute("src").catch(() => "");
            if (VIEWER_ERROR_RE.test(postConsole.map((entry) => entry.text).join("\n"))) {
              return true;
            }
            if (
              hasAnyToken(postConsole, VIEWER_SRC_TOKENS) &&
              hasAnyToken(postConsole, VIEWER_READY_TOKENS) &&
              text(currentIframeSrc)
            ) {
              return true;
            }
            return null;
          },
          30_000,
          500,
        ).catch(() => null);

        const postConsole = lastConsole(runtime, consoleBaseline);
        navigationLogged = postConsole.some((entry) => entry.text.includes(NAVIGATION_TOKEN));
        routeReached = finalUrl.includes("/pdf-viewer");
        viewerRouteMounted = hasAnyToken(postConsole, VIEWER_ROUTE_TOKENS);
        viewerReady = hasAnyToken(postConsole, VIEWER_READY_TOKENS);
        viewerErrorLogged = VIEWER_ERROR_RE.test(postConsole.map((entry) => entry.text).join("\n"));
        iframeSrc = text(await page.locator("iframe").first().getAttribute("src").catch(() => ""));

        const viewerDiagnosticsNeeded =
          Boolean(functionCall.signedUrl) &&
          !viewerReady;

        if (viewerDiagnosticsNeeded) {
          writeJsonArtifact(viewerDiagnosticsPath, {
            functionCall,
            routeReached,
            viewerRouteMounted,
            viewerReady,
            viewerErrorLogged,
            iframeSrc,
            finalUrl,
            consoleEntries: postConsole,
            pageErrors: runtime.pageErrors.slice(pageErrorBaseline),
            relevantResponses: relevantResponses.slice(responseBaseline),
          });
        } else {
          deleteIfExists(viewerDiagnosticsPath);
        }
      } else {
        deleteIfExists(viewerDiagnosticsPath);
      }
    }

    const nextBlocker = identifyNextBlocker({
      financeModalOpened,
      pdfButtonFound,
      pdfButtonClicked,
      functionCall,
      navigationLogged,
      routeReached,
      viewerRouteMounted,
      viewerReady,
      iframeSrc,
      viewerErrorLogged,
    });

    const managementReportRealClickPathExercised = pdfButtonClicked;
    const managementReportFunctionPostStatus = functionCall?.status ?? null;
    const managementReportSignedUrlReturned = Boolean(functionCall?.signedUrl);
    const managementReportViewerOrOpenReached = routeReached || viewerRouteMounted || Boolean(iframeSrc);
    const managementReportOpened =
      managementReportViewerOrOpenReached && viewerReady && Boolean(iframeSrc);
    const nextExactBlockerIdentified = !managementReportOpened && nextBlocker != null;
    const status =
      managementReportRealClickPathExercised &&
      managementReportFunctionPostStatus === 200 &&
      managementReportSignedUrlReturned &&
      managementReportViewerOrOpenReached &&
      managementReportOpened
        ? "GREEN"
        : "NOT_GREEN";

    const smoke = {
      status,
      functionName,
      documentKind: "management_report",
      managementReportRealClickPathExercised,
      managementReportFunctionPostStatus,
      managementReportSignedUrlReturned,
      managementReportViewerOrOpenReached,
      managementReportOpened,
      nextExactBlockerIdentified,
      nextExactBlocker: nextBlocker,
      baseUrl,
      functionCall,
      route: {
        finalUrl,
        routeReached,
        viewerRouteMounted,
        viewerReady,
        viewerErrorLogged,
        iframeSrc,
        navigationLogged,
      },
      uiTrace: {
        debtCardClickMethod,
        financeModalOpened,
        pdfButtonFound,
        pdfButtonClicked,
        pdfButtonClickMethod,
        dialogVisiblePressables: await listVisiblePressableTexts(financeDialog),
      },
      runtime: {
        console: runtime.console,
        pageErrors: runtime.pageErrors,
        badResponses: runtime.badResponses,
        relevantResponses,
      },
      successArtifacts: null as null | {
        screenshot: string;
        html: string;
      },
    };

    if (status === "GREEN") {
      smoke.successArtifacts = await captureWebFailureArtifact(page, successArtifactBase);
    }

    writeJsonArtifact(smokePath, smoke);
    writeText(
      proofPath,
      [
        "# Director PDF Render Web Click Proof",
        "",
        "## Exact blocker baseline",
        "- Current failing function was `director-pdf-render`.",
        "- Current runtime error on the broken path was `reader is not async iterable`.",
        "- Scope here is only the current director finance `PDF` action for `management_report`.",
        "",
        "## Real localhost web click path",
        `- Base URL: \`${baseUrl}\``,
        `- Finance modal opened: ${financeModalOpened}`,
        `- Exact PDF button clicked: ${pdfButtonClicked}`,
        `- Function status: ${managementReportFunctionPostStatus ?? "<none>"}`,
        `- signedUrl returned: ${managementReportSignedUrlReturned}`,
        `- /pdf-viewer reached: ${routeReached || viewerRouteMounted}`,
        `- iframe src present: ${Boolean(iframeSrc)}`,
        `- viewer ready: ${viewerReady}`,
        `- success screenshot: ${status === "GREEN"}`,
        "",
        "## Next blocker",
        nextBlocker
          ? `- ${nextBlocker.layer}: ${nextBlocker.exactFile} -> ${nextBlocker.exactFunction} -> ${nextBlocker.exactCondition}`
          : "- No post-function blocker remained on the exact management_report web path.",
        nextBlocker ? `- Runtime symptom: ${nextBlocker.runtimeSymptom}` : "- Runtime symptom: none",
        "",
        "## Verdict",
        `- managementReportRealClickPathExercised = ${managementReportRealClickPathExercised}`,
        `- managementReportFunctionPostStatus = ${managementReportFunctionPostStatus ?? "null"}`,
        `- managementReportSignedUrlReturned = ${managementReportSignedUrlReturned}`,
        `- managementReportViewerOrOpenReached = ${managementReportViewerOrOpenReached}`,
        `- managementReportOpened = ${managementReportOpened}`,
        `- Final status: ${status}`,
        "",
      ].join("\n"),
    );

    console.log(JSON.stringify(smoke, null, 2));
    if (status !== "GREEN") {
      if (runtimeSession) {
        const failureArtifacts = await captureWebFailureArtifact(page, failureArtifactBase);
        const enriched = {
          ...(JSON.parse(fs.readFileSync(smokePath, "utf8")) as Record<string, unknown>),
          failureArtifacts,
        };
        writeJsonArtifact(smokePath, enriched);
      }
      process.exitCode = 1;
    }

    await browser.close().catch(() => {});
  } finally {
    if (runtimeSession) {
      await runtimeSession.browser.close().catch(() => {});
    }
    await cleanupTempUser(admin, user);
    webServer?.stop();
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  const failure = {
    status: "NOT_GREEN",
    functionName,
    documentKind: "management_report",
    managementReportRealClickPathExercised: false,
    managementReportFunctionPostStatus: null,
    managementReportSignedUrlReturned: false,
    managementReportViewerOrOpenReached: false,
    managementReportOpened: false,
    nextExactBlockerIdentified: true,
    nextExactBlocker: {
      layer: "verifier_runtime",
      exactFile: "scripts/director_pdf_render_web_click_verify.ts",
      exactFunction: "main",
      exactCondition: "runtime verifier failed before the exact click-path verdict could be established",
      runtimeSymptom: message,
    },
    verifierError: message,
  };
  writeJsonArtifact(smokePath, failure);
  writeText(
    proofPath,
    `# Director PDF Render Web Click Proof\n\n## Final status\n- NOT_GREEN\n\n## Verifier error\n- ${message}\n`,
  );
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
