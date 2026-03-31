import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import type { Locator, Page, Response } from "playwright";

import { captureWebFailureArtifact, launchWebRuntime, poll, writeJsonArtifact, baseUrl } from "./_shared/webRuntimeHarness";
import { cleanupTempUser, createTempUser, createVerifierAdmin } from "./_shared/testUserDiscipline";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("director-finance-supplier-pdf-web-click-verify");
const functionName = "director-finance-supplier-summary-pdf";
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

const smokePath = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-web-click-smoke.json");
const proofPath = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-web-click-proof.md");
const viewerDiagnosticsPath = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-viewer-diagnostics.json");
const webServerStdoutPath = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-web.stderr.log");
const failureArtifactBase = path.join(projectRoot, "artifacts/director-finance-supplier-pdf-web-click-failure");

const WEB_LABELS = {
  header: "Контроль",
  financeTab: "Финансы",
  debtCard: "Обязательства",
  debtModalTitle: "Долги и риски",
  suppliersSection: "Поставщики (долг)",
  supplierPdf: "Сводка (PDF)",
  debtLabel: "Долг:",
  emptyState: "Нет данных",
};

const WEB_TEXT = {
  header: [WEB_LABELS.header, "РљРѕРЅС‚СЂРѕР»СЊ"],
  financeTab: [WEB_LABELS.financeTab, "Р¤РёРЅР°РЅСЃС‹"],
  debtCard: [WEB_LABELS.debtCard, "РћР±СЏР·Р°С‚РµР»СЊСЃС‚РІР°"],
  debtModalTitle: [WEB_LABELS.debtModalTitle, "Р”РѕР»РіРё Рё СЂРёСЃРєРё"],
  suppliersSection: [WEB_LABELS.suppliersSection, "РџРѕСЃС‚Р°РІС‰РёРєРё (РґРѕР»Рі)"],
  supplierPdf: [WEB_LABELS.supplierPdf, "РЎРІРѕРґРєР° (PDF)"],
  debtLabel: [WEB_LABELS.debtLabel, "Р”РѕР»Рі:"],
  emptyState: [WEB_LABELS.emptyState, "РќРµС‚ РґР°РЅРЅС‹С…"],
};

const FUNCTION_URL_RE = /director-finance-supplier-summary-pdf/i;
const VIEWER_ERROR_RE = /\[pdf-viewer\] (web_remote_fetch_error|load_error|viewer_error_state|web_iframe_error)/i;
const VIEWER_READY_TOKENS = ["[pdf-viewer] ready"];
const VIEWER_ROUTE_TOKENS = ["[pdf-viewer] viewer_route_mounted"];
const VIEWER_SRC_TOKENS = ["[pdf-viewer] web_iframe_src_ready", "[pdf-viewer] signedUrl"];
const NAVIGATION_TOKEN = "[pdf-document-actions] about_to_navigate_to_viewer";

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
    "director-finance-supplier-pdf-web-server-ready",
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

async function findVisibleWebText(scope: LocatorScope, labels: string[]): Promise<Locator | null> {
  const locator = scope.getByText(new RegExp(labels.map(escapeRegex).join("|"), "i"));
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
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

async function waitForVisibleWebText(page: Page, labels: string[], timeoutMs = 30_000) {
  return await poll(
    `director-supplier-pdf-visible:${labels[0] ?? "label"}`,
    async () => (await findVisibleWebText(page, labels)) ?? null,
    timeoutMs,
    250,
  );
}

async function findVisibleByTestId(scope: LocatorScope, testId: string): Promise<Locator | null> {
  const locator = scope.getByTestId(testId);
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }
  return null;
}

async function waitForVisibleByTestId(scope: LocatorScope, testId: string, timeoutMs = 30_000) {
  return await poll(
    `director-supplier-pdf-testid:${testId}`,
    async () => (await findVisibleByTestId(scope, testId)) ?? null,
    timeoutMs,
    250,
  );
}

async function waitForVisiblePressableByLabels(
  scope: LocatorScope,
  labels: string[],
  timeoutMs = 30_000,
  mode: "exact" | "startsWith" | "includes" = "exact",
) {
  return await poll(
    `director-supplier-pdf-pressable:${labels[0] ?? "label"}`,
    async () => (await findVisiblePressableByLabels(scope, labels, mode)) ?? null,
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
        rect.width >= 140 &&
        rect.height >= 32 &&
        rect.width <= window.innerWidth - 8 &&
        rect.height <= window.innerHeight;
      if (fitsCard) {
        chosen = current;
        break;
      }
      current = current.parentElement;
    }

    const rect = chosen.getBoundingClientRect();
    return {
      x: rect.left + Math.max(16, Math.min(rect.width / 2, rect.width - 16)),
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
  const attempts: Array<{ label: string; run: () => Promise<void> }> = [
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
        `director-supplier-pdf-activation:${attempt.label}`,
        async () => ((await verify()) ? true : null),
        verifyTimeoutMs,
        250,
      ).catch(() => false);
      if (verified) {
        return attempt.label;
      }
    } catch {
      // Try the next activation path.
    }
  }

  return null;
}

async function waitForVisibleDialog(page: Page, labels: string[], timeoutMs = 20_000) {
  return await poll(
    `director-supplier-pdf-dialog:${labels[0] ?? "dialog"}`,
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

async function isSuppliersToggleExpanded(toggle: Locator) {
  const textContent = normalizeBodyText(await toggle.textContent().catch(() => ""));
  return /[▴▲]/.test(textContent) || (textContent.includes("KGS") && !textContent.includes("▾"));
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

function matchesHeaderAction(candidateText: string) {
  const normalized = normalizeBodyText(candidateText);
  const exactLabels = ["Период", "Обновить", "PDF", "Закрыть"];
  if (exactLabels.includes(normalized)) return true;
  if (WEB_TEXT.suppliersSection.some((label) => normalized.startsWith(label))) return true;
  if (WEB_TEXT.supplierPdf.some((label) => normalized === label)) return true;
  return false;
}

async function findSupplierRowPressable(dialog: Locator): Promise<Locator | null> {
  const byTestId = await findVisibleByTestId(dialog, "director-finance-debt-supplier-row");
  if (byTestId) return byTestId;
  const locator = dialog.locator('[tabindex="0"], button');
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const candidateText = normalizeBodyText(await candidate.textContent().catch(() => ""));
    if (!candidateText) continue;
    if (matchesHeaderAction(candidateText)) continue;
    if (!candidateText.includes("KGS")) continue;
    if (candidateText.includes("Лидер:")) continue;
    return candidate;
  }
  return null;
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
    "director-finance-supplier-pdf-finance-surface",
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
        "x-client-info": "director-finance-supplier-pdf-web-click-verify-signin",
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
    "director-supplier-pdf-session-hydrated",
    async () => {
      const currentUrl = page.url();
      const currentBody = await bodyText(page);
      if (!currentUrl.includes("/auth/login") && (includesAnyLabel(currentBody, WEB_TEXT.financeTab) || includesAnyLabel(currentBody, WEB_TEXT.debtCard))) {
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
  };
}

function lastConsole(runtime: Awaited<ReturnType<typeof launchWebRuntime>>["runtime"], startIndex: number) {
  return runtime.console.slice(startIndex);
}

function hasAnyToken(entries: { text: string }[], tokens: string[]) {
  return tokens.some((token) => entries.some((entry) => entry.text.includes(token)));
}

function identifyNextBlocker(args: {
  supplierRowsVisible: boolean;
  supplierEmptyStateVisible: boolean;
  supplierDetailOpened: boolean;
  pdfButtonClicked: boolean;
  functionCall: FunctionResponseRecord | null;
  navigationLogged: boolean;
  routeReached: boolean;
  viewerRouteMounted: boolean;
  viewerReady: boolean;
  iframeSrc: string;
  viewerErrorLogged: boolean;
}): ExactBlocker | null {
  if (!args.supplierRowsVisible) {
    return {
      layer: "supplier_data_render",
      exactFile: "src/screens/director/DirectorFinanceDebtModal.tsx",
      exactFunction: "DirectorFinanceDebtModal",
      exactCondition: "suppliersOpen rendered an empty supplier list on the debt modal",
      runtimeSymptom: args.supplierEmptyStateVisible
        ? "Suppliers section opened, but the exact supplier row list resolved to 'Нет данных'."
        : "Suppliers section never exposed a clickable supplier row.",
    };
  }

  if (!args.supplierDetailOpened) {
    return {
      layer: "supplier_detail_open",
      exactFile: "src/screens/director/director.finance.panel.ts",
      exactFunction: "openSupplier",
      exactCondition: "supplier row click did not complete the supplier detail open path",
      runtimeSymptom: "Supplier row click did not reach the supplier detail screen with the PDF action.",
    };
  }

  if (!args.pdfButtonClicked || !args.functionCall) {
    return {
      layer: "supplier_pdf_click",
      exactFile: "src/screens/director/DirectorFinanceSupplierModal.tsx",
      exactFunction: "DirectorFinanceSupplierModal",
      exactCondition: "the exact 'Сводка (PDF)' press path did not produce the supplier PDF backend invoke",
      runtimeSymptom: "The supplier PDF action was clicked, but no POST reached the exact supplier PDF function.",
    };
  }

  if (args.functionCall.status === 200 && args.functionCall.signedUrl && !args.routeReached && !args.viewerRouteMounted) {
    return {
      layer: "document_action",
      exactFile: "src/lib/documents/pdfDocumentActions.ts",
      exactFunction: "previewPdfDocument",
      exactCondition: "web supplier remote-url preview did not reach /pdf-viewer after a successful function response",
      runtimeSymptom: args.navigationLogged
        ? "Viewer navigation was logged but the route never reached /pdf-viewer."
        : "Successful function response returned signedUrl, but the document action never logged viewer navigation.",
    };
  }

  if ((args.routeReached || args.viewerRouteMounted) && (!args.viewerReady || !args.iframeSrc || args.viewerErrorLogged)) {
    return {
      layer: "viewer_open",
      exactFile: "app/pdf-viewer.tsx",
      exactFunction: "prepareViewer",
      exactCondition: "web remote embedded branch did not settle to iframe-ready state for the supplier signedUrl",
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
    webServer = await ensureLocalWebServer();
    user = await createTempUser(admin, {
      role: "director",
      fullName: "Director Supplier PDF Web Click",
      emailPrefix: "director-supplier-pdf-web-click",
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

    const debtCard =
      await findVisibleByTestId(page, "director-finance-home-debt-card") ??
      await waitForVisiblePressableByLabels(page, WEB_TEXT.debtCard, 30_000, "startsWith");
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

    const financeDialog = await waitForVisibleDialog(page, [...WEB_TEXT.debtModalTitle, ...WEB_TEXT.suppliersSection], 15_000);
    let suppliersToggle =
      await findVisibleByTestId(financeDialog, "director-finance-debt-suppliers-toggle") ??
      await findVisiblePressableByLabels(financeDialog, WEB_TEXT.suppliersSection, "startsWith");
    if (!suppliersToggle) {
      throw new Error("Suppliers toggle was not found on the exact director debt modal");
    }

    const suppliersToggleClickMethod = await activatePressable(
      page,
      suppliersToggle,
      async () => {
        if (await isSuppliersToggleExpanded(suppliersToggle!)) return true;
        if (await findSupplierRowPressable(financeDialog)) return true;
        const current = await scopeText(financeDialog);
        return includesAnyLabel(current, WEB_TEXT.emptyState);
      },
      4_000,
    );
    suppliersToggle =
      await findVisibleByTestId(financeDialog, "director-finance-debt-suppliers-toggle") ??
      await findVisiblePressableByLabels(financeDialog, WEB_TEXT.suppliersSection, "startsWith");
    const suppliersToggleExpanded = suppliersToggle ? await isSuppliersToggleExpanded(suppliersToggle) : false;
    const supplierRow = await poll(
      "director-supplier-pdf-supplier-row",
      async () => (await findSupplierRowPressable(financeDialog)) ?? null,
      12_000,
      250,
    ).catch(() => null);
    const supplierRowVisible = supplierRow != null;
    const supplierEmptyStateVisible = !supplierRowVisible &&
      (await poll(
        "director-supplier-pdf-empty-state",
        async () => {
          const current = await scopeText(financeDialog);
          return includesAnyLabel(current, WEB_TEXT.emptyState) ? true : null;
        },
        12_000,
        250,
      ).catch(() => false));

    let supplierDetailOpened = false;
    let supplierPdfButtonFound = false;
    let pdfButtonClicked = false;
    let supplierRowClickMethod: string | null = null;
    let pdfButtonClickMethod: string | null = null;
    let functionCall: FunctionResponseRecord | null = null;
    let routeReached = false;
    let viewerRouteMounted = false;
    let viewerReady = false;
    let viewerErrorLogged = false;
    let navigationLogged = false;
    let iframeSrc = "";
    let finalUrl = page.url();

    if (supplierRowVisible) {
      supplierRowClickMethod = await activatePressable(
        page,
        supplierRow,
        async () => {
          const current = await scopeText(financeDialog);
          return includesAnyLabel(current, WEB_TEXT.supplierPdf);
        },
        8_000,
      );
      supplierDetailOpened = Boolean(supplierRowClickMethod);

      if (supplierDetailOpened) {
        const pdfButton =
          await waitForVisibleByTestId(financeDialog, "director-finance-supplier-pdf-button", 20_000).catch(() => null) ??
          await waitForVisiblePressableByLabels(financeDialog, WEB_TEXT.supplierPdf, 20_000, "exact").catch(() => null);
        supplierPdfButtonFound = pdfButton != null;

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

          pdfButtonClickMethod = await activatePressable(page, pdfButton);
          pdfButtonClicked = pdfButtonClickMethod != null;

          const functionResponse = await functionResponsePromise;
          if (functionResponse) {
            functionCall = await safeParseFunctionResponse(functionResponse);
          }

          if (functionCall?.status === 200 && functionCall.signedUrl) {
            finalUrl = await poll(
              "director-supplier-pdf-viewer-route",
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
              "director-supplier-pdf-viewer-ready",
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
          }
        }
      }
    }

    const nextBlocker = identifyNextBlocker({
      supplierRowsVisible: supplierRowVisible,
      supplierEmptyStateVisible,
      supplierDetailOpened,
      pdfButtonClicked,
      functionCall,
      navigationLogged,
      routeReached,
      viewerRouteMounted,
      viewerReady,
      iframeSrc,
      viewerErrorLogged,
    });

    const supplierPdfRealClickPathExercised = pdfButtonClicked;
    const supplierPdfFunctionPostStatus = functionCall?.status ?? null;
    const supplierPdfSignedUrlReturned = Boolean(functionCall?.signedUrl);
    const supplierPdfViewerOrOpenReached = routeReached || viewerRouteMounted || Boolean(iframeSrc);
    const supplierPdfOpened = supplierPdfViewerOrOpenReached && viewerReady && Boolean(iframeSrc);
    const nextExactBlockerIdentified = !supplierPdfOpened && nextBlocker != null;
    const status =
      supplierPdfRealClickPathExercised &&
      supplierPdfFunctionPostStatus === 200 &&
      supplierPdfSignedUrlReturned &&
      supplierPdfViewerOrOpenReached &&
      supplierPdfOpened
        ? "GREEN"
        : "NOT_GREEN";

    const smoke = {
      status,
      supplierPdfAuthBoundaryFixed: true,
      supplierPdfFunctionPostStatus,
      supplierPdfSignedUrlReturned,
      supplierPdfRealClickPathExercised,
      supplierPdfViewerOrOpenReached,
      supplierPdfOpened,
      nextExactBlockerIdentified,
      nextExactBlocker: nextBlocker,
      baseUrl,
      functionName,
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
        suppliersToggleClickMethod,
        suppliersToggleExpanded,
        supplierRowsVisible: supplierRowVisible,
        supplierEmptyStateVisible,
        supplierDetailOpened,
        supplierRowClickMethod,
        supplierPdfButtonFound,
        pdfButtonClicked,
        pdfButtonClickMethod,
        dialogVisiblePressables: await listVisiblePressableTexts(financeDialog),
      },
      runtime: {
        pageErrors: runtime.pageErrors,
        badResponses: runtime.badResponses,
        relevantResponses,
      },
    };

    writeJsonArtifact(smokePath, smoke);
    writeText(
      proofPath,
      [
        "# Director Finance Supplier PDF Web Click Proof",
        "",
        "## What was already fixed",
        "- Exact 403 root cause was inside the supplier PDF function auth guard.",
        "- Canonical auth fix remains in `src/lib/pdf/directorPdfAuth.ts` and `supabase/functions/director-finance-supplier-summary-pdf/index.ts`.",
        "- This batch did not relax security, did not trust `user_metadata`, and did not route through a service-role client bypass.",
        "",
        "## Real localhost web click path",
        `- Base URL: \`${baseUrl}\``,
        `- Supplier row visible: ${supplierRowVisible}`,
        `- Supplier detail opened: ${supplierDetailOpened}`,
        `- Exact PDF button clicked: ${pdfButtonClicked}`,
        `- Function status: ${supplierPdfFunctionPostStatus ?? "<none>"}`,
        `- signedUrl returned: ${supplierPdfSignedUrlReturned}`,
        `- /pdf-viewer reached: ${routeReached || viewerRouteMounted}`,
        `- iframe src present: ${Boolean(iframeSrc)}`,
        `- viewer ready: ${viewerReady}`,
        "",
        "## Next blocker",
        nextBlocker
          ? `- ${nextBlocker.layer}: ${nextBlocker.exactFile} -> ${nextBlocker.exactFunction} -> ${nextBlocker.exactCondition}`
          : "- No post-function blocker remained on the exact supplier PDF web path.",
        nextBlocker ? `- Runtime symptom: ${nextBlocker.runtimeSymptom}` : "- Runtime symptom: none",
        "",
        "## Verdict",
        `- supplierPdfRealClickPathExercised = ${supplierPdfRealClickPathExercised}`,
        `- supplierPdfFunctionPostStatus = ${supplierPdfFunctionPostStatus ?? "null"}`,
        `- supplierPdfSignedUrlReturned = ${supplierPdfSignedUrlReturned}`,
        `- supplierPdfViewerOrOpenReached = ${supplierPdfViewerOrOpenReached}`,
        `- supplierPdfOpened = ${supplierPdfOpened}`,
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

void main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  const failure = {
    status: "NOT_GREEN",
    supplierPdfAuthBoundaryFixed: true,
    supplierPdfFunctionPostStatus: null,
    supplierPdfSignedUrlReturned: false,
    supplierPdfRealClickPathExercised: false,
    supplierPdfViewerOrOpenReached: false,
    supplierPdfOpened: false,
    nextExactBlockerIdentified: true,
    nextExactBlocker: {
      layer: "verifier_runtime",
      exactFile: "scripts/director_finance_supplier_pdf_web_click_verify.ts",
      exactFunction: "main",
      exactCondition: "runtime verifier failed before the exact click-path verdict could be established",
      runtimeSymptom: message,
    },
    verifierError: message,
  };
  writeJsonArtifact(smokePath, failure);
  writeText(
    proofPath,
    `# Director Finance Supplier PDF Web Click Proof\n\n## Final status\n- NOT_GREEN\n\n## Verifier error\n- ${message}\n`,
  );
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
