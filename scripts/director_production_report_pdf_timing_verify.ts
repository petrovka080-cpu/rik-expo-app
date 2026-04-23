import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";

import type { Locator, Page, Response } from "playwright";

import {
  baseUrl,
  bodyText,
  launchWebRuntime,
  poll,
  waitForBody,
} from "./_shared/webRuntimeHarness";
import {
  cleanupTempUser,
  createTempUser,
  createVerifierAdmin,
} from "./_shared/testUserDiscipline";

type JsonRecord = Record<string, unknown>;

type ObservationEvent = {
  id?: string;
  at?: number;
  surface?: string;
  event?: string;
  result?: string;
  durationMs?: number | null;
  sourceKind?: string | null;
  extra?: JsonRecord;
};

type ProductionBackendResponse = {
  status: number;
  ok: boolean;
  url: string;
  cacheStatus: string | null;
  renderBranch: string | null;
  renderer: string | null;
  sourceVersion: string | null;
  artifactVersion: string | null;
};

type TimingSample = {
  label: string;
  kind: "prewarm" | "warm" | "repeat";
  telemetryDurationMs: number | null;
  wallClockMs: number;
  viewerReady: boolean;
  routeReached: boolean;
  pdfOpenResult: string | null;
  tapToVisibleMs: number | null;
  tapToTerminalMs: number | null;
  prepareDurationMs: number | null;
  cacheStatuses: string[];
  backendNetworkCalls: number;
  backendResponses: ProductionBackendResponse[];
  pageErrors: string[];
  consoleErrors: string[];
  fiveHundreds: { url: string; status: number; method: string }[];
};

const projectRoot = process.cwd();
const admin = createVerifierAdmin("director-production-report-pdf-timing-verify");

const artifactPaths = {
  samples: path.join(projectRoot, "artifacts/PDF_Z2_timing_samples.json"),
  webTiming: path.join(projectRoot, "artifacts/PDF_Z2_web_timing.md"),
  webStdout: path.join(projectRoot, "artifacts/PDF_Z2_web_runtime.stdout.log"),
  webStderr: path.join(projectRoot, "artifacts/PDF_Z2_web_runtime.stderr.log"),
};

const DIRECTOR_ROUTE = "/office/director";

const WEB_LABELS = {
  header: "Контроль",
  reportsTab: "Отчёты",
  cardTitle: "Факт выдачи (склад)",
  open: "Открыть",
  materialsTab: "Материалы",
  worksTab: "Работы",
  excel: "Excel",
  objectFilter: "Объекты",
  disciplineHeader: "Расход / Закупки",
  positionsLabel: "Позиции:",
  locationsLabel: "Локации:",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureArtifactDir() {
  fs.mkdirSync(path.join(projectRoot, "artifacts"), { recursive: true });
}

function writeJson(fullPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeText(fullPath: string, payload: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, payload, "utf8");
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function max(values: number[]) {
  return values.length ? Math.max(...values) : null;
}

async function isWebServerReady() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureLocalWebServer(): Promise<{ started: boolean; stop: () => void }> {
  if (await isWebServerReady()) {
    return { started: false, stop: () => {} };
  }

  ensureArtifactDir();
  fs.writeFileSync(artifactPaths.webStdout, "", "utf8");
  fs.writeFileSync(artifactPaths.webStderr, "", "utf8");

  const child = spawn(
    "cmd.exe",
    ["/c", "npx", "expo", "start", "--web", "--port", "8081", "-c"],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(artifactPaths.webStdout, String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(artifactPaths.webStderr, String(chunk));
  });

  await poll(
    "pdf-z2-web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(artifactPaths.webStderr)
          ? fs.readFileSync(artifactPaths.webStderr, "utf8")
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
      stopProcess(child);
    },
  };
}

function stopProcess(child: ChildProcess) {
  if (child.exitCode == null) {
    if (process.platform === "win32" && child.pid) {
      try {
        execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
        return;
      } catch {
        // Fall through to the portable signal path.
      }
    }
    child.kill("SIGTERM");
  }
}

async function parseResponse(response: Response): Promise<JsonRecord | null> {
  try {
    const payload = await response.json();
    return asRecord(payload);
  } catch {
    return null;
  }
}

function isBlockingConsoleError(entry: { type: string; text: string }) {
  return entry.type === "error" &&
    !/Accessing element\.ref was removed in React 19/i.test(entry.text);
}

async function clickFirstVisible(locator: Locator, label: string) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return;
    }
  }
  throw new Error(`No visible locator for ${label}`);
}

async function clickVisibleCenter(page: Page, locator: Locator, label: string) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) continue;
    const box = await candidate.boundingBox().catch(() => null);
    if (!box) continue;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return;
  }
  throw new Error(`No visible locator box for ${label}`);
}

async function readObservationEvents(page: Page): Promise<ObservationEvent[]> {
  return page.evaluate(() => {
    const root = globalThis as unknown as {
      __RIK_PLATFORM_OBSERVABILITY__?: { events?: unknown[] };
    };
    return Array.isArray(root.__RIK_PLATFORM_OBSERVABILITY__?.events)
      ? root.__RIK_PLATFORM_OBSERVABILITY__?.events
      : [];
  }) as Promise<ObservationEvent[]>;
}

function isProductionPdfLatency(event: ObservationEvent) {
  return event.event === "pdf_open_latency" &&
    event.extra?.key === "pdf:director:reports:production" &&
    event.extra?.documentType === "director_report";
}

function isProductionBackendSuccess(event: ObservationEvent) {
  return event.surface === "director_pdf_backend" &&
    event.event === "backend_invoke_success" &&
    event.result === "success" &&
    event.extra?.documentKind === "production_report";
}

async function readLatencyEvents(page: Page) {
  return (await readObservationEvents(page)).filter(isProductionPdfLatency);
}

async function readBackendEvents(page: Page) {
  return (await readObservationEvents(page)).filter(isProductionBackendSuccess);
}

async function openReportsModal(page: Page) {
  const body = await bodyText(page).catch(() => "");
  if (!body.includes(WEB_LABELS.materialsTab) || !body.includes(WEB_LABELS.worksTab)) {
    await clickFirstVisible(
      page.locator('div[tabindex="0"]').filter({ hasText: WEB_LABELS.reportsTab }),
      "reports tab",
    );
    await waitForBody(page, [WEB_LABELS.cardTitle, WEB_LABELS.open], 45_000);
    await clickFirstVisible(
      page.locator('div[tabindex="0"]').filter({ hasText: WEB_LABELS.open }),
      "reports open",
    );
  }

  await waitForBody(
    page,
    [WEB_LABELS.materialsTab, WEB_LABELS.worksTab, WEB_LABELS.excel, WEB_LABELS.objectFilter],
    45_000,
  );

  await clickFirstVisible(
    page.locator('div[tabindex="0"]').filter({ hasText: WEB_LABELS.worksTab }),
    "works tab",
  ).catch(() => {});
  await waitForBody(
    page,
    [WEB_LABELS.disciplineHeader, WEB_LABELS.positionsLabel, WEB_LABELS.locationsLabel],
    45_000,
  ).catch(() => undefined);
  await sleep(500);
}

async function waitForDirectorOrLogin(page: Page): Promise<"director" | "login"> {
  return poll(
    "pdf-z2-director-or-login",
    async () => {
      const url = page.url();
      const emailInputCount = await page
        .locator('input[placeholder="Email"],input[type="email"],input[name="email"]')
        .count()
        .catch(() => 0);
      const body = await bodyText(page).catch(() => "");
      if (url.includes("/auth/login") || emailInputCount > 0 || /Login|Войти|Р’РѕР№С‚Рё/i.test(body)) {
        return "login" as const;
      }
      if (
        url.includes(DIRECTOR_ROUTE) &&
        (body.includes(WEB_LABELS.header) || body.includes(WEB_LABELS.reportsTab))
      ) {
        return "director" as const;
      }
      return null;
    },
    60_000,
    500,
  );
}

async function loginAsRuntimeDirector(page: Page, user: Awaited<ReturnType<typeof createTempUser>>) {
  await page
    .locator('input[placeholder="Email"],input[type="email"],input[name="email"]')
    .first()
    .fill(user.email);
  await page.locator('input[type="password"],input[name="password"]').first().fill(user.password);
  await clickFirstVisible(
    page.locator("button,[role='button'],div[tabindex='0']").filter({ hasText: /Login|Войти|Р’РѕР№С‚Рё/i }),
    "login",
  ).catch(async () => {
    await page.locator("button,[role='button'],div[tabindex='0']").first().click();
  });
  try {
    await poll(
      "pdf-z2-login-complete",
      async () => {
        const url = page.url();
        return !url.includes("/auth/login") ? true : null;
      },
      60_000,
      500,
    );
  } catch (error) {
    const debugBase = path.join(projectRoot, "artifacts/PDF_Z2_web_login_submit_debug");
    const currentBody = await bodyText(page).catch(() => "");
    const formState = await page.locator("input").evaluateAll((nodes) =>
      nodes.map((node) => ({
        type: node.getAttribute("type"),
        placeholder: node.getAttribute("placeholder"),
        name: node.getAttribute("name"),
        valueLength: ((node as HTMLInputElement).value || "").length,
      })),
    ).catch(() => []);
    const pressables = await page.locator('[aria-label],div[tabindex="0"],button,[role="button"]').evaluateAll((nodes) =>
      nodes.slice(0, 80).map((node) => ({
        text: ((node as HTMLElement).innerText || node.textContent || "").trim(),
        aria: node.getAttribute("aria-label"),
        role: node.getAttribute("role"),
        tag: node.tagName,
      })),
    ).catch(() => []);
    await page.screenshot({ path: `${debugBase}.png`, fullPage: true }).catch(() => undefined);
    writeJson(`${debugBase}.json`, {
      url: page.url(),
      body: currentBody.slice(0, 5000),
      formState,
      pressables,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function returnToDirector(page: Page) {
  if (!page.url().includes("/pdf-viewer")) return;
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 45_000 }).catch(async () => {
    await page.evaluate(() => window.history.back()).catch(() => undefined);
  });
  await poll(
    "pdf-z2-back-to-director",
    async () => {
      if (page.url().includes("/pdf-viewer")) return null;
      const body = await bodyText(page).catch(() => "");
      return body.includes(WEB_LABELS.header) || body.includes(WEB_LABELS.reportsTab) ? true : null;
    },
    45_000,
    500,
  );
  await sleep(500);
}

async function runOpenSample(args: {
  page: Page;
  runtime: {
    console: { type: string; text: string }[];
    pageErrors: string[];
    badResponses: { url: string; status: number; method: string }[];
  };
  productionBackendResponses: ProductionBackendResponse[];
  label: string;
  kind: TimingSample["kind"];
}): Promise<TimingSample> {
  await openReportsModal(args.page);

  const consoleBefore = args.runtime.console.length;
  const pageErrorBefore = args.runtime.pageErrors.length;
  const badResponseBefore = args.runtime.badResponses.length;
  const backendResponseBefore = args.productionBackendResponses.length;
  const latencyEventsBefore = await readLatencyEvents(args.page);
  const latencyIdsBefore = new Set(latencyEventsBefore.map((event) => text(event.id)).filter(Boolean));
  const backendEventBefore = (await readBackendEvents(args.page)).length;
  const startedAt = Date.now();

  const pdfButtons = args.page.locator('div[tabindex="0"][aria-label^="PDF"]');
  try {
    await poll(
      `${args.label}:pdf-button-ready`,
      async () => (await pdfButtons.count()) > 0 ? true : null,
      30_000,
      250,
    );
  } catch (error) {
    const debugBase = path.join(projectRoot, `artifacts/PDF_Z2_web_sample_debug_${args.label}_pdf-button`);
    const currentBody = await bodyText(args.page).catch(() => "");
    const pressables = await args.page.locator('[aria-label],div[tabindex="0"],button,[role="button"]').evaluateAll((nodes) =>
      nodes.slice(0, 120).map((node) => ({
        text: ((node as HTMLElement).innerText || node.textContent || "").trim(),
        aria: node.getAttribute("aria-label"),
        role: node.getAttribute("role"),
        tag: node.tagName,
        html: (node as HTMLElement).outerHTML.slice(0, 400),
      })),
    ).catch(() => []);
    await args.page.screenshot({ path: `${debugBase}.png`, fullPage: true }).catch(() => undefined);
    writeJson(`${debugBase}.json`, {
      url: args.page.url(),
      body: currentBody.slice(0, 5000),
      pressables,
      console: args.runtime.console.slice(consoleBefore),
      pageErrors: args.runtime.pageErrors.slice(pageErrorBefore),
      badResponses: args.runtime.badResponses.slice(badResponseBefore),
      backendResponses: args.productionBackendResponses.slice(backendResponseBefore),
      observations: await readObservationEvents(args.page).catch(() => []),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  await pdfButtons.first().click({ force: true, timeout: 30_000 });

  try {
    await poll(
      `${args.label}:viewer-route`,
      () => args.page.url().includes("/pdf-viewer") ? true : null,
      60_000,
      250,
    );
  } catch (error) {
    const debugBase = path.join(projectRoot, `artifacts/PDF_Z2_web_sample_debug_${args.label}`);
    const currentBody = await bodyText(args.page).catch(() => "");
    const pressables = await args.page.locator('div[tabindex="0"],button,[role="button"]').evaluateAll((nodes) =>
      nodes.slice(0, 80).map((node) => ({
        text: ((node as HTMLElement).innerText || node.textContent || "").trim(),
        aria: node.getAttribute("aria-label"),
        role: node.getAttribute("role"),
        html: (node as HTMLElement).outerHTML.slice(0, 400),
      })),
    ).catch(() => []);
    await args.page.screenshot({ path: `${debugBase}.png`, fullPage: true }).catch(() => undefined);
    writeJson(`${debugBase}.json`, {
      url: args.page.url(),
      body: currentBody.slice(0, 5000),
      pressables,
      console: args.runtime.console.slice(consoleBefore),
      pageErrors: args.runtime.pageErrors.slice(pageErrorBefore),
      badResponses: args.runtime.badResponses.slice(badResponseBefore),
      backendResponses: args.productionBackendResponses.slice(backendResponseBefore),
      observations: await readObservationEvents(args.page).catch(() => []),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  const viewerReady = await poll(
    `${args.label}:viewer-ready`,
    async () => {
      const recentConsole = args.runtime.console.slice(consoleBefore);
      const hasReady = recentConsole.some((entry) => entry.text.includes("[pdf-viewer] ready"));
      const hasIframe = Boolean(await args.page.locator("iframe").first().getAttribute("src").catch(() => ""));
      return hasReady || hasIframe ? true : null;
    },
    60_000,
    250,
  ).then(() => true).catch(() => false);

  const latencyEvent = await poll(
    `${args.label}:pdf-open-latency`,
    async () => {
      const events = await readLatencyEvents(args.page);
      return [...events]
        .reverse()
        .find((event) => {
          const id = text(event.id);
          const at = typeof event.at === "number" ? event.at : null;
          return (id && !latencyIdsBefore.has(id)) || (at !== null && at >= startedAt);
        }) ?? null;
    },
    15_000,
    250,
  ).catch(() => null);
  if (!latencyEvent) {
    const debugBase = path.join(projectRoot, `artifacts/PDF_Z2_web_sample_debug_${args.label}_latency`);
    const currentBody = await bodyText(args.page).catch(() => "");
    await args.page.screenshot({ path: `${debugBase}.png`, fullPage: true }).catch(() => undefined);
    writeJson(`${debugBase}.json`, {
      url: args.page.url(),
      body: currentBody.slice(0, 5000),
      console: args.runtime.console.slice(consoleBefore),
      pageErrors: args.runtime.pageErrors.slice(pageErrorBefore),
      badResponses: args.runtime.badResponses.slice(badResponseBefore),
      backendResponses: args.productionBackendResponses.slice(backendResponseBefore),
      observations: await readObservationEvents(args.page).catch(() => []),
      latencyBefore: latencyEventsBefore.length,
      latencyAfter: (await readLatencyEvents(args.page).catch(() => [])).length,
    });
  }

  const backendEvents = (await readBackendEvents(args.page)).slice(backendEventBefore);
  const backendResponses = args.productionBackendResponses.slice(backendResponseBefore);
  const recentConsoleErrors = args.runtime.console.slice(consoleBefore).filter(isBlockingConsoleError);
  const recentPageErrors = args.runtime.pageErrors.slice(pageErrorBefore);
  const recentFiveHundreds = args.runtime.badResponses
    .slice(badResponseBefore)
    .filter((entry) => entry.status >= 500);
  const extra = asRecord(latencyEvent?.extra) ?? {};

  const sample: TimingSample = {
    label: args.label,
    kind: args.kind,
    telemetryDurationMs: typeof latencyEvent?.durationMs === "number" ? latencyEvent.durationMs : null,
    wallClockMs: Date.now() - startedAt,
    viewerReady,
    routeReached: args.page.url().includes("/pdf-viewer"),
    pdfOpenResult: text(latencyEvent?.result) || null,
    tapToVisibleMs: typeof extra.tapToVisibleMs === "number" ? extra.tapToVisibleMs : null,
    tapToTerminalMs: typeof extra.tapToTerminalMs === "number" ? extra.tapToTerminalMs : null,
    prepareDurationMs: typeof extra.prepareDurationMs === "number" ? extra.prepareDurationMs : null,
    cacheStatuses: [
      ...backendEvents.map((event) => text(event.extra?.cacheStatus)).filter(Boolean),
      ...backendResponses.map((entry) => text(entry.cacheStatus)).filter(Boolean),
    ],
    backendNetworkCalls: backendResponses.length,
    backendResponses,
    pageErrors: recentPageErrors,
    consoleErrors: recentConsoleErrors.map((entry) => entry.text),
    fiveHundreds: recentFiveHundreds,
  };

  await returnToDirector(args.page);
  return sample;
}

function summarize(samples: TimingSample[], kind: "warm" | "repeat") {
  const durations = samples
    .filter((sample) => sample.kind === kind)
    .map((sample) => sample.telemetryDurationMs)
    .filter((value): value is number => typeof value === "number");
  return {
    count: durations.length,
    medianMs: median(durations),
    maxMs: max(durations),
    samples: durations,
  };
}

async function main() {
  ensureArtifactDir();
  const webServer = await ensureLocalWebServer();
  const { browser, page, runtime } = await launchWebRuntime();
  const productionBackendResponses: ProductionBackendResponse[] = [];
  let runtimeUser: Awaited<ReturnType<typeof createTempUser>> | null = null;

  page.on("response", async (response) => {
    if (!/director-production-report-pdf/i.test(response.url())) return;
    const body = await parseResponse(response);
    const telemetry = asRecord(body?.telemetry);
    productionBackendResponses.push({
      status: response.status(),
      ok: response.ok(),
      url: response.url(),
      cacheStatus: text(telemetry?.cacheStatus) || null,
      renderBranch: text(body?.renderBranch) || null,
      renderer: text(body?.renderer) || null,
      sourceVersion: text(telemetry?.sourceVersion) || null,
      artifactVersion: text(telemetry?.artifactVersion) || null,
    });
  });

  try {
    runtimeUser = await createTempUser(admin, {
      role: "director",
      fullName: "PDF Z2 Timing Director",
      emailPrefix: "pdf-z2-director",
    });

    await page.goto(`${baseUrl}${DIRECTOR_ROUTE}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const initialState = await waitForDirectorOrLogin(page);
    if (initialState === "login") {
      await loginAsRuntimeDirector(page, runtimeUser);
      if (!page.url().includes(DIRECTOR_ROUTE)) {
        await page.goto(`${baseUrl}${DIRECTOR_ROUTE}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      }
    }

    if (page.url().includes("/auth/login")) {
      await page.locator('input[placeholder="Email"]').first().fill(runtimeUser.email);
      await page.locator('input[type="password"]').first().fill(runtimeUser.password);
      await clickFirstVisible(page.locator('div[tabindex="0"]').filter({ hasText: /Войти|Login/i }), "login").catch(async () => {
        await page.locator("button,[role='button'],div[tabindex='0']").first().click();
      });
      await poll(
        "pdf-z2-login-complete",
        async () => page.url().includes("/auth/login") ? null : true,
        60_000,
        500,
      );
      if (!page.url().includes(DIRECTOR_ROUTE)) {
        await page.goto(`${baseUrl}${DIRECTOR_ROUTE}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      }
    }

    try {
      await waitForBody(page, [WEB_LABELS.header, WEB_LABELS.reportsTab], 60_000);
    } catch (error) {
      const currentBody = await bodyText(page).catch(() => "");
      const debugPath = path.join(projectRoot, "artifacts/PDF_Z2_web_login_debug.json");
      const screenshotPath = path.join(projectRoot, "artifacts/PDF_Z2_web_login_debug.png");
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      writeJson(debugPath, {
        url: page.url(),
        body: currentBody.slice(0, 4000),
        console: runtime.console.slice(-50),
        pageErrors: runtime.pageErrors,
        badResponses: runtime.badResponses.slice(-30),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const samples: TimingSample[] = [];
    samples.push(await runOpenSample({
      page,
      runtime,
      productionBackendResponses,
      label: "prewarm-1",
      kind: "prewarm",
    }));

    for (let index = 1; index <= 3; index += 1) {
      samples.push(await runOpenSample({
        page,
        runtime,
        productionBackendResponses,
        label: `warm-${index}`,
        kind: "warm",
      }));
      samples.push(await runOpenSample({
        page,
        runtime,
        productionBackendResponses,
        label: `repeat-${index}`,
        kind: "repeat",
      }));
    }

    const warm = summarize(samples, "warm");
    const repeat = summarize(samples, "repeat");
    const measured = samples.filter((sample) => sample.kind !== "prewarm");
    const allMeasuredSuccess = measured.every(
      (sample) =>
        sample.pdfOpenResult === "success" &&
        sample.viewerReady &&
        sample.routeReached &&
        sample.pageErrors.length === 0 &&
        sample.consoleErrors.length === 0 &&
        sample.fiveHundreds.length === 0,
    );
    const repeatReuseEvidence = samples
      .filter((sample) => sample.kind === "repeat")
      .every((sample) =>
        sample.cacheStatuses.some((status) => /manifest_version_hit|client_hot_hit|artifact_hit/i.test(status)) ||
        sample.backendNetworkCalls === 0,
      );
    const warmWithinBudget = warm.count === 3 && typeof warm.maxMs === "number" && warm.maxMs <= 800;
    const repeatWithinBudget = repeat.count === 3 && typeof repeat.maxMs === "number" && repeat.maxMs <= 300;
    const noFiveHundreds = runtime.badResponses.every((entry) => entry.status < 500);
    const noPageErrors = runtime.pageErrors.length === 0;
    const blockingConsoleErrors = runtime.console.filter(isBlockingConsoleError);
    const noBlockingConsoleErrors = blockingConsoleErrors.length === 0;

    const result = {
      status:
        allMeasuredSuccess &&
        repeatReuseEvidence &&
        warmWithinBudget &&
        repeatWithinBudget &&
        noFiveHundreds &&
        noPageErrors
          ? "passed"
          : "failed",
      baseUrl,
      webServerStarted: webServer.started,
      thresholds: {
        warmMaxMs: 800,
        repeatMaxMs: 300,
      },
      warm,
      repeat,
      allMeasuredSuccess,
      repeatReuseEvidence,
      warmWithinBudget,
      repeatWithinBudget,
      noFiveHundreds,
      noPageErrors,
      noBlockingConsoleErrors,
      blockingConsoleErrors,
      productionBackendResponses,
      samples,
    };

    writeJson(artifactPaths.samples, result);
    writeText(
      artifactPaths.webTiming,
      [
        "# PDF-Z2 Web Timing Proof",
        "",
        `- Status: ${result.status}`,
        `- Base URL: ${baseUrl}`,
        `- Warm samples: ${warm.samples.join(", ")} ms`,
        `- Warm median/max: ${warm.medianMs}/${warm.maxMs} ms`,
        `- Repeat samples: ${repeat.samples.join(", ")} ms`,
        `- Repeat median/max: ${repeat.medianMs}/${repeat.maxMs} ms`,
        `- Repeat reuse evidence: ${repeatReuseEvidence ? "pass" : "fail"}`,
        `- Page errors: ${runtime.pageErrors.length}`,
        `- Blocking console errors: ${runtime.console.filter(isBlockingConsoleError).length}`,
        `- 5xx responses: ${runtime.badResponses.filter((entry) => entry.status >= 500).length}`,
        "",
        "## Samples",
        ...samples.map((sample) =>
          `- ${sample.label}: telemetry=${sample.telemetryDurationMs}ms wall=${sample.wallClockMs}ms cache=${sample.cacheStatuses.join("|") || "none"} backendCalls=${sample.backendNetworkCalls}`,
        ),
        "",
      ].join("\n"),
    );

    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "passed") {
      process.exitCode = 1;
    }
  } finally {
    await cleanupTempUser(admin, runtimeUser);
    await browser.close().catch(() => {});
    webServer.stop();
  }
}

void main().catch((error) => {
  writeJson(artifactPaths.samples, {
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
  });
  writeText(
    artifactPaths.webTiming,
    `# PDF-Z2 Web Timing Proof\n\n- Status: failed\n- Error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  console.error(error);
  process.exitCode = 1;
});
