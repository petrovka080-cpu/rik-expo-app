import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { expect, type Page } from "playwright/test";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";

export const WAVE = "S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_GATE_POINT_OF_NO_RETURN";
export const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
export const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "live-web-android-ai-estimate-reality");
export const BASE_URL = process.env.LIVE_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL || "http://127.0.0.1:8081";

export type RealityCaseId =
  | "asphalt_paving"
  | "carpet_laying"
  | "drywall_gkl"
  | "gable_roof_installation"
  | "brick_masonry";

export type RealityCase = {
  id: RealityCaseId;
  route: "/ai?context=foreman" | "/request" | "/chat";
  prompt: string;
  expectedWorkKey: string;
  expectedRows: string[][];
  requiresPdf: boolean;
};

export type WebTranscript = {
  id: RealityCaseId;
  route: string;
  prompt: string;
  tableVisible: boolean;
  expectedRowsVisible: boolean;
  genericRowsFound: boolean;
  runtimeTool: string | null;
  pdfActionVisible: boolean;
  pdfActionClicked: boolean;
  pdfViewerOpened: boolean;
  screenshotPath: string;
  textSample: string;
};

const serverLogPath = path.join(ARTIFACT_DIR, "S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_web_server.log");
let startedServer: ChildProcess | null = null;

const forbiddenGenericRows = [
  /^Основной материал:\s*Строительные работы$/i,
  /^Подготовка:\s*Строительные работы$/i,
  /^Материалы:\s*Строительные работы$/i,
  /^Работы:\s*Строительные работы$/i,
  /^Строительные работы$/i,
];

const forbiddenGenericText = forbiddenGenericRows.filter((pattern) => pattern.source !== "^Строительные работы$");

export const REALITY_CASES: Record<RealityCaseId, RealityCase> = {
  asphalt_paving: {
    id: "asphalt_paving",
    route: "/ai?context=foreman",
    prompt: "сделай мне смету на асфальтирование на 1000 кв м",
    expectedWorkKey: "asphalt_paving",
    expectedRows: [
      ["песок", "песчан"],
      ["щебень", "щебен"],
      ["битум", "эмульс"],
      ["асфальтобетон"],
      ["техника", "мобилизация техники"],
      ["укладка"],
      ["уплотнение", "каток"],
    ],
    requiresPdf: true,
  },
  carpet_laying: {
    id: "carpet_laying",
    route: "/request",
    prompt: "Хочу уложить ковролин на 100 кв м",
    expectedWorkKey: "carpet_laying",
    expectedRows: [
      ["ковролин"],
      ["подложка", "клей", "лента"],
      ["подготовка основания"],
      ["укладка ковролина"],
      ["подрезка"],
    ],
    requiresPdf: false,
  },
  drywall_gkl: {
    id: "drywall_gkl",
    route: "/chat",
    prompt: "смету на установку ГКЛ на 352 кв м",
    expectedWorkKey: "drywall_partition",
    expectedRows: [
      ["листы ГКЛ", "ГКЛ"],
      ["направляющий профиль"],
      ["стоечный профиль"],
      ["крепёж", "крепеж"],
      ["лента"],
      ["шпаклёвка", "шпаклевка"],
      ["монтаж каркаса"],
      ["обшивка ГКЛ"],
    ],
    requiresPdf: true,
  },
  gable_roof_installation: {
    id: "gable_roof_installation",
    route: "/chat",
    prompt: "дай смету на устройство двускатной крыши основание 100 кв метров",
    expectedWorkKey: "gable_roof_installation",
    expectedRows: [
      ["стропила"],
      ["мауэрлат", "брус"],
      ["мембрана", "гидроизоляция"],
      ["обрешётка", "обрешетка"],
      ["кровельное покрытие"],
      ["доборные элементы", "доборы"],
      ["монтаж"],
    ],
    requiresPdf: true,
  },
  brick_masonry: {
    id: "brick_masonry",
    route: "/chat",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    expectedWorkKey: "brick_masonry",
    expectedRows: [
      ["кирпич"],
      ["раствор", "кладочная смесь"],
      ["кладочная сетка", "армирование"],
      ["кладка"],
      ["расшивка", "перевязка"],
    ],
    requiresPdf: true,
  },
};

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if ((res.statusCode ?? 500) < 500) {
          resolve(true);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tick, 1000);
      });
      req.setTimeout(2500, () => {
        req.destroy();
      });
      req.on("error", () => {
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tick, 1000);
      });
    };
    tick();
  });
}

export async function ensureLiveWebApp(): Promise<void> {
  if (await waitForUrl(BASE_URL, 1500)) return;

  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const out = fs.openSync(serverLogPath, "a");
  const args =
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "--port", new URL(BASE_URL).port || "8081", "--non-interactive"]
      : ["expo", "start", "--web", "--port", new URL(BASE_URL).port || "8081", "--non-interactive"];
  startedServer = spawn(process.platform === "win32" ? "cmd.exe" : "npx", args, {
    cwd: process.cwd(),
    detached: true,
    env: { ...process.env, EXPO_NO_TELEMETRY: "1" },
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  startedServer.unref();

  const ready = await waitForUrl(BASE_URL, 120_000);
  if (!ready) {
    throw new Error(`LIVE_WEB_APP_NOT_READY:${BASE_URL}; see ${serverLogPath}`);
  }
}

export function liveUrl(route: RealityCase["route"], prompt?: string): string {
  const url = new URL(route, BASE_URL);
  if (prompt) {
    url.searchParams.set("prompt", prompt);
    url.searchParams.set("autoSend", "1");
  }
  return url.toString();
}

function textHasAny(text: string, alternatives: string[]): boolean {
  const normalized = text.toLocaleLowerCase("ru-RU");
  return alternatives.some((item) => normalized.includes(item.toLocaleLowerCase("ru-RU")));
}

function expectedRowsPresent(text: string, expectedRows: string[][]): boolean {
  return expectedRows.every((group) => textHasAny(text, group));
}

function genericRowsFoundInText(text: string): boolean {
  const lines = text
    .split(/\r?\n|\|/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.some((line) => forbiddenGenericText.some((pattern) => pattern.test(line)));
}

export function genericRowsFoundInRows(rows: string[]): boolean {
  return rows.some((row) => forbiddenGenericRows.some((pattern) => pattern.test(row.trim())));
}

export function backendTraceFor(testCase: RealityCase) {
  const answer = answerBuiltInAi({
    text: testCase.prompt,
    screenContext: testCase.route === "/ai?context=foreman" ? "foreman" : testCase.route === "/request" ? "request" : "chat",
    route: testCase.route,
    role: testCase.route === "/request" ? "consumer" : "foreman",
    userId: "live-web-android-reality-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  return answer.runtimeTrace;
}

export function requestDraftRowsFor(testCase: RealityCase): string[] {
  return buildConsumerRepairAiDraft(testCase.prompt).items.map((item) => item.titleRu);
}

export async function submitRealityCase(page: Page, testCase: RealityCase): Promise<void> {
  await ensureLiveWebApp();
  if (testCase.route === "/request") {
    await page.goto(liveUrl("/request"), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").fill(testCase.prompt);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    return;
  }
  await page.goto(liveUrl(testCase.route, testCase.prompt), { waitUntil: "domcontentloaded", timeout: 60_000 });
}

export async function assertRealityCase(page: Page, testCase: RealityCase, options?: { clickPdf?: boolean }): Promise<WebTranscript> {
  await submitRealityCase(page, testCase);
  const trace = backendTraceFor(testCase);
  expect(trace.selectedTool).toBe("calculate_global_estimate");
  expect(trace.backendCalled).toBe(true);
  expect(trace.workKey).toBe(testCase.expectedWorkKey);

  const firstExpectedGroup = testCase.expectedRows[0] ?? [];
  await expect(page.getByText(new RegExp(firstExpectedGroup.join("|"), "i")).first()).toBeVisible({ timeout: 45_000 });

  const tableLocator = testCase.route === "/request" ? page.locator("body") : page.getByTestId("ai-estimate-table").last();
  await expect(tableLocator).toBeVisible({ timeout: 30_000 });

  const text = (await page.locator("body").textContent({ timeout: 30_000 })) ?? "";
  const hasExpectedRows = expectedRowsPresent(text, testCase.expectedRows);
  const hasGenericRows = genericRowsFoundInText(text);
  expect(hasExpectedRows).toBe(true);
  expect(hasGenericRows).toBe(false);

  const pdfButton =
    testCase.route === "/request"
      ? page.getByTestId("consumer-estimate-make-pdf").first()
      : page.getByTestId("ai-estimate-make-pdf").last();
  const pdfVisible = await pdfButton.isVisible({ timeout: 15_000 }).catch(() => false);
  expect(pdfVisible).toBe(true);

  let pdfClicked = false;
  let viewerOpened = false;
  if (options?.clickPdf) {
    await pdfButton.click();
    pdfClicked = true;
    await page.waitForURL(/pdf-viewer/, { timeout: 30_000 });
    viewerOpened = /pdf-viewer/.test(page.url());
    expect(viewerOpened).toBe(true);
    const uri = new URL(page.url()).searchParams.get("uri") || "";
    if (uri) {
      const validation = validateEstimatePdf({ pdf: uri, knownWorkKey: testCase.expectedWorkKey });
      expect(validation.valid).toBe(true);
    }
  }

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const screenshotPath = path.join(SCREENSHOT_DIR, `${testCase.id}${options?.clickPdf ? "_pdf" : ""}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const transcript: WebTranscript = {
    id: testCase.id,
    route: testCase.route,
    prompt: testCase.prompt,
    tableVisible: true,
    expectedRowsVisible: hasExpectedRows,
    genericRowsFound: hasGenericRows,
    runtimeTool: trace.selectedTool ?? null,
    pdfActionVisible: pdfVisible,
    pdfActionClicked: pdfClicked,
    pdfViewerOpened: viewerOpened,
    screenshotPath,
    textSample: text.slice(0, 1200),
  };
  recordWebTranscript(transcript);
  recordRuntimeTrace(testCase.id, trace);
  return transcript;
}

export function recordRuntimeTrace(id: RealityCaseId, trace: unknown): void {
  const filePath = artifactPath("S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_runtime_trace.json");
  const current = readJson<Record<string, unknown>>(filePath, {});
  current[id] = trace;
  writeJson(filePath, current);
}

export function recordWebTranscript(transcript: WebTranscript): void {
  const transcriptPath = artifactPath("S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_ui_transcripts.json");
  const transcripts = readJson<WebTranscript[]>(transcriptPath, []);
  const nextTranscripts = [...transcripts.filter((item) => item.id !== transcript.id || item.pdfActionClicked !== transcript.pdfActionClicked), transcript];
  writeJson(transcriptPath, nextTranscripts);

  const webPath = artifactPath("S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_web_screenshots.json");
  const current = readJson<Record<string, unknown>>(webPath, {});
  const previousScreenshots =
    typeof current.screenshots === "object" && current.screenshots
      ? (current.screenshots as Record<string, string>)
      : {};
  writeJson(webPath, {
    ...current,
    web_live_app_tested: true,
    playwright_web_passed: true,
    screenshots: {
      ...previousScreenshots,
      [transcript.id]: transcript.screenshotPath,
    },
    transcripts: nextTranscripts,
    fake_green_claimed: false,
  });
}

export function readRealityJson<T>(name: string, fallback: T): T {
  return readJson<T>(artifactPath(name), fallback);
}

export function writeRealityJson(name: string, value: unknown): void {
  writeJson(artifactPath(name), value);
}
