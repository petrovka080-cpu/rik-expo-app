import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Page, type Response } from "playwright";

type SearchEnvelope = {
  literalTotalCount: number;
  globalLiteralTotalCount: number;
  externalLiteralTotalCount: number;
  shownCount: number;
  nextCursor: string | null;
  items: Array<{ catalogId: string; canonicalNameRu: string }>;
  searchIndexReleaseId: string;
  searchIndexSnapshotSha256: string;
  resultSetSha256: string;
};

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = resolve(ROOT, ".release-runtime/p0-estimate-truth-remediation-r4/evidence/04-search/runtime");
const WEB_URL = String(process.env.R4_WEB_PROOF_URL ?? "http://127.0.0.1:8082").replace(/\/+$/, "");

function loadDotEnv(path: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([^#][^=]+?)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    output[match[1].trim()] = value;
  }
  return output;
}

function required(value: string | undefined, name: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`R4_WEB_PROOF_REQUIRED_ENV_MISSING:${name}`);
  return normalized;
}

function isSearchResponse(response: Response): boolean {
  return response.url().startsWith("http://127.0.0.1:8765/canonical-estimate/search/catalog?");
}

async function waitForSearch(page: Page, action: () => Promise<void>): Promise<SearchEnvelope> {
  const responsePromise = page.waitForResponse(isSearchResponse, { timeout: 30_000 });
  await action();
  const response = await responsePromise;
  if (response.status() !== 200) throw new Error(`R4_WEB_PROOF_SEARCH_HTTP_${response.status()}`);
  return await response.json() as SearchEnvelope;
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const publicEnv = loadDotEnv("C:/dev/rik-expo-app/.env.local");
  const roleEnv = loadDotEnv("C:/dev/rik-expo-app/.env.office-e2e.local");
  const email = required(roleEnv.E2E_DIRECTOR_EMAIL, "E2E_DIRECTOR_EMAIL");
  const password = required(roleEnv.E2E_DIRECTOR_PASSWORD, "E2E_DIRECTOR_PASSWORD");
  required(publicEnv.EXPO_PUBLIC_SUPABASE_URL, "EXPO_PUBLIC_SUPABASE_URL");
  required(publicEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY, "EXPO_PUBLIC_SUPABASE_ANON_KEY");

  const browser = await chromium.launch({ headless: process.env.R4_WEB_PROOF_HEADLESS !== "false" });
  const context = await browser.newContext({
    locale: "ru-RU",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text().slice(0, 1_000));
  });
  try {
    await page.goto(`${WEB_URL}/auth/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("auth.login.email").waitFor({ state: "visible", timeout: 60_000 });
    await page.getByTestId("auth.login.email").fill(email);
    await page.getByTestId("auth.login.password").fill(password);
    await page.getByTestId("auth.login.submit").click();
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 60_000 });

    await page.goto(`${WEB_URL}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const input = page.getByTestId("consumer-repair-problem-input");
    await input.waitFor({ state: "visible", timeout: 60_000 });
    const first = await waitForSearch(page, () => input.fill("ла"));
    await page.getByTestId("consumer-repair-work-search-total").waitFor({ state: "visible", timeout: 30_000 });
    const rows = page.locator('[data-testid^="consumer-repair-work-suggestion-"]');
    await rows.nth(99).waitFor({ state: "visible", timeout: 30_000 });
    const firstDomCount = await rows.count();
    const firstSummary = await page.getByTestId("consumer-repair-work-search-total").innerText();

    if (first.literalTotalCount !== 3_523 || first.globalLiteralTotalCount !== 3_485 || first.externalLiteralTotalCount !== 38) {
      throw new Error(`R4_WEB_PROOF_TOTAL_MISMATCH:${first.literalTotalCount}/${first.globalLiteralTotalCount}/${first.externalLiteralTotalCount}`);
    }
    if (first.items.length !== 100 || firstDomCount !== 100) {
      throw new Error(`R4_WEB_PROOF_FIRST_PAGE_TRUNCATED:${first.items.length}/${firstDomCount}`);
    }
    if (!firstSummary.includes("3523") || !firstSummary.includes("3485") || !firstSummary.includes("38")) {
      throw new Error(`R4_WEB_PROOF_SUMMARY_MISMATCH:${firstSummary}`);
    }
    await page.screenshot({ path: resolve(EVIDENCE_ROOT, "WEB_R4_LA_AFTER_FIRST_100.png"), fullPage: true });

    const second = await waitForSearch(page, () => page.getByTestId("consumer-repair-work-search-load-more").click());
    await rows.nth(199).waitFor({ state: "visible", timeout: 30_000 });
    const secondDomCount = await rows.count();
    const overlap = first.items.filter((item) => second.items.some((candidate) => candidate.catalogId === item.catalogId));
    if (second.items.length !== 100 || second.shownCount !== 200 || secondDomCount !== 200 || overlap.length !== 0) {
      throw new Error(`R4_WEB_PROOF_CURSOR_MISMATCH:${second.items.length}/${second.shownCount}/${secondDomCount}/${overlap.length}`);
    }
    await page.screenshot({ path: resolve(EVIDENCE_ROOT, "WEB_R4_LA_AFTER_200.png"), fullPage: true });

    const evidence = {
      status: "GREEN_DIRECTED_WEB_RUNTIME",
      recordedAt: new Date().toISOString(),
      webUrl: WEB_URL,
      backendUrl: "http://127.0.0.1:8765/canonical-estimate",
      query: "ла",
      expectedContinuousSubstring: true,
      literalTotalCount: first.literalTotalCount,
      globalLiteralTotalCount: first.globalLiteralTotalCount,
      externalLiteralTotalCount: first.externalLiteralTotalCount,
      firstPage: { apiItems: first.items.length, domRows: firstDomCount, shownCount: first.shownCount },
      secondPage: { apiItems: second.items.length, domRows: secondDomCount, shownCount: second.shownCount, overlap: overlap.length },
      releaseId: first.searchIndexReleaseId,
      snapshotSha256: first.searchIndexSnapshotSha256,
      resultSetSha256: first.resultSetSha256,
      nextCursorAfterSecondPresent: Boolean(second.nextCursor),
      firstSummary,
      consoleErrorCount: consoleErrors.length,
      consoleErrors,
      secretsRecorded: false,
      overallR4Status: "RED_REMAINING_GATES",
    };
    writeFileSync(resolve(EVIDENCE_ROOT, "WEB_R4_LA_RUNTIME_PROOF.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({
      status: evidence.status,
      total: evidence.literalTotalCount,
      global: evidence.globalLiteralTotalCount,
      external: evidence.externalLiteralTotalCount,
      firstDomCount,
      secondDomCount,
      overlap: overlap.length,
      consoleErrorCount: consoleErrors.length,
    })}\n`);
  } catch (error) {
    await page.screenshot({ path: resolve(EVIDENCE_ROOT, "WEB_R4_LA_FAILURE.png"), fullPage: true }).catch(() => undefined);
    writeFileSync(resolve(EVIDENCE_ROOT, "WEB_R4_LA_RUNTIME_PROOF.json"), `${JSON.stringify({
      status: "RED_WEB_RUNTIME",
      recordedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      consoleErrorCount: consoleErrors.length,
      consoleErrors,
      secretsRecorded: false,
      overallR4Status: "RED_REMAINING_GATES",
    }, null, 2)}\n`, "utf8");
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

void main();
