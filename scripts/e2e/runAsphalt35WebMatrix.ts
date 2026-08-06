import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  RoadworksWaveAProductionRegistry,
  buildAsphalt35NormativeCompositionLedgerV3,
} from "../../src/lib/estimate/v4/roadworks";
import { ensureProductionGradeWebServer } from "./runProductionGradeEstimateWebSmoke";

const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8" });
const subjectTreeHash = createHash("sha256").update(JSON.stringify({ exactSha, status, diff })).digest("hex");
const outputRoot = path.join(".release-runtime", "asphalt-v3-final-r1", exactSha, "web");
const baseUrl = process.env.ASPHALT_35_WEB_BASE_URL ?? "http://localhost:8111";
const decisions = new Map(buildAsphalt35NormativeCompositionLedgerV3().map((row) => [row.workId, row]));
const screenshotScopes = new Set(["standard", "small_area", "large_area", "wet_zone", "technical_room"]);

async function main() {
  mkdirSync(outputRoot, { recursive: true });
  const server = await ensureProductionGradeWebServer(baseUrl, outputRoot, { requireOwned: true, readinessAttempts: 3 });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const [index, registration] of RoadworksWaveAProductionRegistry.entries()) {
      const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const decision = decisions.get(registration.workId)!;
      const blockers: string[] = [];
      let publicText = "";
      let visibleRows = 0;
      try {
        await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        const prompt = page.getByTestId("consumer-repair-problem-input");
        await prompt.waitFor({ timeout: 60_000 });
        await prompt.fill(`${registration.professionalNameRu} 240 м2 толщина 60 мм`);
        await page.getByTestId("consumer-repair-prepare-draft").click({ timeout: 30_000 });
        await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
        const positionsToggle = page.getByTestId("request-estimate-positions-toggle");
        await positionsToggle.waitFor({ timeout: 30_000 });
        let positionsOpened = false;
        for (let attempt = 0; attempt < 3 && !positionsOpened; attempt += 1) {
          await positionsToggle.scrollIntoViewIfNeeded();
          await positionsToggle.click({ timeout: 30_000, force: true });
          positionsOpened = await page.getByText("Скрыть позиции", { exact: true }).isVisible().catch(() => false);
          if (!positionsOpened) await page.waitForTimeout(500);
        }
        if (!positionsOpened) throw new Error("POSITIONS_TOGGLE_DID_NOT_OPEN");
        await page.locator("[data-testid^='request-estimate-section-']").first().waitFor({ timeout: 45_000 });
        for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
          const loadMore = page.getByTestId("request-estimate-items-load-more");
          if (!(await loadMore.isVisible().catch(() => false))) break;
          const before = await page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count();
          await loadMore.click({ force: true });
          await page.waitForFunction(
            (previous) => document.querySelectorAll("[data-testid^='consumer-repair-item-quantity-input-']").length > previous,
            before,
            { timeout: 15_000 },
          );
        }
        publicText = await page.locator("body").innerText({ timeout: 15_000 });
        visibleRows = await page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count();
        if (!publicText.includes(registration.professionalNameRu)) blockers.push("work_label_missing");
        if (visibleRows !== (decision.terminalDecision === "EXECUTABLE_B" ? decision.resourceRowIds.length : 1)) {
          blockers.push(`visible_rows:${visibleRows}`);
        }
        if (/PRICE_MISSING|source_parameters|template_id|formula_id|paving_roads_landscape_interior/iu.test(publicText)) blockers.push("raw_internal_text_visible");
        if (!/Полный итог не рассчитан/u.test(publicText)) blockers.push("honest_total_blocker_missing");
        if (decision.terminalDecision === "EXECUTABLE_B") {
          for (const title of ["Работы", "Труд", "Машины и механизмы", "Лабораторный контроль", "Документация"]) {
            if (!publicText.includes(title)) blockers.push(`section_missing:${title}`);
          }
        } else if (!/Требуется подтверждение области применения/u.test(publicText)) {
          blockers.push("conditional_blocker_missing");
        }
        if (consoleErrors.length) blockers.push(`console_errors:${consoleErrors.length}`);
        if (pageErrors.length) blockers.push(`page_errors:${pageErrors.length}`);
        if (screenshotScopes.has(registration.scopeProfile)) {
          await page.screenshot({ path: path.join(outputRoot, `${registration.scopeProfile}.png`), fullPage: true });
          screenshotScopes.delete(registration.scopeProfile);
        }
      } catch (error) {
        blockers.push(`flow:${error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 300) : String(error)}`);
        await page.screenshot({ path: path.join(outputRoot, `failure-${index + 1}.png`), fullPage: true }).catch(() => undefined);
      } finally {
        await Promise.race([context.close(), new Promise<void>((resolve) => setTimeout(resolve, 5_000))]);
      }
      results.push({
        work_id: registration.workId,
        scope_profile: registration.scopeProfile,
        terminal_decision: decision.terminalDecision,
        expected_rows: decision.terminalDecision === "EXECUTABLE_B" ? decision.resourceRowIds.length : 1,
        visible_rows: visibleRows,
        passed: blockers.length === 0,
        blockers,
        public_text_sha256: createHash("sha256").update(publicText).digest("hex"),
      });
      console.info(`[${index + 1}/35] ${registration.workId} ${blockers.length === 0 ? "GREEN" : `RED ${blockers.join(",")}`}`);
    }
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }
  const blockers = results.flatMap((row) => row.blockers.map((blocker) => `${row.work_id}:${blocker}`));
  const payload = {
    schema: "asphalt-35-web-visible-output-v1",
    generated_at: new Date().toISOString(),
    exact_sha: exactSha,
    subject_tree_hash: subjectTreeHash,
    actual_browser: true,
    records_seen: results.length,
    records_terminal: results.filter((row) => row.passed).length,
    missing: 35 - results.length,
    duplicates: results.length - new Set(results.map((row) => row.work_id)).size,
    blockers,
    passed: blockers.length === 0 && results.length === 35,
    results,
  };
  writeFileSync(path.join(outputRoot, "asphalt-35-web-visible-output.json"), `${JSON.stringify(payload, null, 2)}\n`);
  console.info(JSON.stringify({ records_terminal: `${payload.records_terminal}/35`, blockers: blockers.slice(0, 30), outputRoot }, null, 2));
  if (!payload.passed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
