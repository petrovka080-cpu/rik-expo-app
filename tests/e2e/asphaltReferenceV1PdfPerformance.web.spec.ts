import { expect, test, type Page, type TestInfo } from "playwright/test";

const BASE_URL = (
  process.env.ASPHALT_REFERENCE_WEB_BASE_URL ?? "http://localhost:8081"
).replace(/\/$/, "");
const ROAD_PROMPT =
  "Дороги, транспорт и площадки: асфальтобетон бетонный покрытие 5400 метров длина и 15 метров ширина";

type OpenMeasurement = {
  feedbackMs: number;
  routeMs: number;
  iframeMountedMs: number;
  firstPageMs: number;
  route: string;
  iframeScheme: string;
};

type ScopeMeasurement = {
  scope: "ROAD_SURFACING_ONLY" | "FULL_ROAD_INFRASTRUCTURE";
  rows: 54 | 702;
  cold: OpenMeasurement;
  reloadMs?: number;
  warm: OpenMeasurement[];
  warmP50Ms: number;
  warmP95Ms: number;
};

function percentile(values: readonly number[], percentileValue: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * percentileValue) - 1),
  );
  return Number(sorted[index].toFixed(3));
}

async function openCleanRequest(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/request`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("consumer-repair-problem-input")).toBeVisible();
  await expect(page.getByTestId("consumer-repair-problem-input")).toHaveValue("");
}

async function compileScope(
  page: Page,
  scopeTestId:
    | "road-scope-option-road_surfacing_only"
    | "road-scope-option-full_road_infrastructure",
  rows: 54 | 702,
): Promise<void> {
  await page.getByTestId("consumer-repair-problem-input").fill(ROAD_PROMPT);
  await expect(page.getByTestId("inline-work-prompt-param-chip-length_m")).toContainText("5400");
  await expect(page.getByTestId("inline-work-prompt-param-chip-width_m")).toContainText("15");
  await page.getByTestId("inline-work-prompt-build-estimate").click();
  await expect(page.getByTestId("road-scope-selection")).toBeVisible();
  await page.getByTestId(scopeTestId).click();
  await expect(page.getByTestId("request-estimate-row-count")).toContainText(String(rows));
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible();
}

async function openPdfAndMeasure(page: Page): Promise<OpenMeasurement> {
  const startedAt = Date.now();
  const feedbackMs = await page.evaluate(() => {
    const started = performance.now();
    const button = document.querySelector<HTMLElement>(
      '[data-testid="consumer-estimate-make-pdf"]',
    );
    if (!button) {
      throw new Error("PDF open control is missing");
    }
    return new Promise<number>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        observer.disconnect();
        reject(new Error("PDF tap feedback did not render"));
      }, 1_000);
      const observer = new MutationObserver(() => {
        const status = document.querySelector<HTMLElement>(
          '[data-testid="consumer-repair-status"]',
        );
        if (!status?.textContent?.includes("Открываем PDF")) return;
        window.clearTimeout(timer);
        observer.disconnect();
        resolve(performance.now() - started);
      });
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      button.click();
    });
  });

  await page.waitForURL(/\/pdf-viewer\?sessionId=/);
  const routeMs = Date.now() - startedAt;
  const frame = page.getByTestId("pdf-viewer-web-iframe");
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("src", /^blob:/);
  const iframeMountedMs = Date.now() - startedAt;
  await expect(frame).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("body")).not.toContainText("Document not found");

  const src = (await frame.getAttribute("src")) ?? "";
  return {
    feedbackMs: Number(feedbackMs.toFixed(3)),
    routeMs,
    iframeMountedMs,
    firstPageMs: Date.now() - startedAt,
    route: page.url(),
    iframeScheme: src.split(":", 1)[0],
  };
}

async function returnToRequest(page: Page): Promise<void> {
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("consumer-estimate-make-pdf")).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(() => resolve(), { timeout: 500 });
          return;
        }
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function measureScope(
  page: Page,
  scope: ScopeMeasurement["scope"],
  scopeTestId:
    | "road-scope-option-road_surfacing_only"
    | "road-scope-option-full_road_infrastructure",
  rows: 54 | 702,
  proveReload: boolean,
): Promise<ScopeMeasurement> {
  await openCleanRequest(page);
  await compileScope(page, scopeTestId, rows);
  const cold = await openPdfAndMeasure(page);

  let reloadMs: number | undefined;
  if (proveReload) {
    const route = page.url();
    const reloadStartedAt = Date.now();
    await page.reload({ waitUntil: "domcontentloaded" });
    const frame = page.getByTestId("pdf-viewer-web-iframe");
    await expect(frame).toHaveAttribute("src", /^blob:/);
    await expect(frame).toHaveAttribute("aria-busy", "false");
    await expect(page.locator("body")).not.toContainText("Document not found");
    expect(page.url()).toBe(route);
    reloadMs = Date.now() - reloadStartedAt;
  }

  const warm: OpenMeasurement[] = [];
  for (let iteration = 0; iteration < 20; iteration += 1) {
    await returnToRequest(page);
    warm.push(await openPdfAndMeasure(page));
  }
  const warmTimes = warm.map((measurement) => measurement.firstPageMs);

  return {
    scope,
    rows,
    cold,
    reloadMs,
    warm,
    warmP50Ms: percentile(warmTimes, 0.5),
    warmP95Ms: percentile(warmTimes, 0.95),
  };
}

test("browser PDF path meets feedback, cold/warm budgets and reload recovery for 54/702 Asphalt V1 rows", async ({
  page,
}, testInfo: TestInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const surfacing = await measureScope(
    page,
    "ROAD_SURFACING_ONLY",
    "road-scope-option-road_surfacing_only",
    54,
    true,
  );
  const fullRoad = await measureScope(
    page,
    "FULL_ROAD_INFRASTRUCTURE",
    "road-scope-option-full_road_infrastructure",
    702,
    false,
  );
  const allFeedback = [surfacing.cold, ...surfacing.warm, fullRoad.cold, ...fullRoad.warm]
    .map((measurement) => measurement.feedbackMs);
  const artifact = {
    schemaVersion: "AsphaltReferenceV1PdfBrowserPerformanceV1",
    measuredAt: new Date().toISOString(),
    feedbackP95Ms: percentile(allFeedback, 0.95),
    scopes: [surfacing, fullRoad],
    consoleErrors,
    pageErrors,
  };
  await testInfo.attach("pdf-browser-performance.json", {
    body: JSON.stringify(artifact, null, 2),
    contentType: "application/json",
  });
  console.info(`[pdf-performance] ${JSON.stringify(artifact)}`);

  expect(artifact.feedbackP95Ms).toBeLessThanOrEqual(100);
  expect(surfacing.cold.firstPageMs).toBeLessThanOrEqual(1_500);
  expect(fullRoad.cold.firstPageMs).toBeLessThanOrEqual(2_500);
  expect(surfacing.warmP95Ms).toBeLessThanOrEqual(500);
  expect(fullRoad.warmP95Ms).toBeLessThanOrEqual(500);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
