import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { chromium, type Browser, type Page } from "playwright";

import {
  buildAiEstimate11610NaturalLanguagePromptForPassport,
} from "../estimate/runAiEstimate11610NaturalLanguageIngressReplay";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import type { ProfessionalWorkPassport } from "../../src/lib/estimate/workPassportContract";
import { findFreshLocalhostBaseUrl } from "./renderStagingAcceptanceCore";
import { ensureProductionGradeWebServer, type ProductionGradeWebServerHandle } from "./runProductionGradeEstimateWebSmoke";

export const AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_PROOF_SCHEMA =
  "ai-estimate-11610-web-natural-language-baseline-proof-v1" as const;
export const GREEN_AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_BASELINE_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_BASELINE_PASSED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_BASELINE_BLOCKED_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_BASELINE_BLOCKED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_WEB_BASELINE_PASSED_ANDROID_PDF_OPEN_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_WEB_BASELINE_PASSED_ANDROID_PDF_OPEN_NO_RELEASE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-web-natural-language-baseline-proof");
const DURABLE_MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
const DURABLE_BUNDLE_PREFIX = "rik.consumer_repair.request_bundle.v2:";
const LEGACY_DURABLE_KEY = "rik.consumer_repair.request_bundles.v1";

type WebLedgerRow = {
  schema: typeof AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_PROOF_SCHEMA;
  case_id: string;
  template_id: string;
  prompt_hash: string;
  page_url: string;
  selected_template_id: string | null;
  selected_work_key: string | null;
  item_count: number;
  expected_row_count: number;
  passport_backed_item_count: number;
  summary_card_visible: boolean;
  section_count: number;
  quantity_input_count: number;
  raw_dump_visible: boolean;
  console_error_count: number;
  page_error_count: number;
  duration_ms: number;
  heap_used_mb: number;
  failure_codes: string[];
  passed: boolean;
};

type BrowserBundleEvidence = {
  bundleFound: boolean;
  selectedTemplateId: string | null;
  selectedWorkKey: string | null;
  itemCount: number;
  passportBackedItemCount: number;
  currentRevisionRowCount: number | null;
  durableRecordCount: number;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function numericArg(name: string): number | null {
  const raw = argValue(name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function heapUsedMb(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function safeStaticPath(root: string, requestUrl: string): string {
  const parsed = new URL(requestUrl, "http://localhost");
  const decoded = decodeURIComponent(parsed.pathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = path.resolve(root, relative);
  const resolvedRoot = path.resolve(root);
  if (!candidate.startsWith(resolvedRoot)) return path.join(resolvedRoot, "index.html");
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return path.join(resolvedRoot, "index.html");
}

async function startStaticServer(input: {
  distDir: string;
  baseUrl: string;
}): Promise<ProductionGradeWebServerHandle> {
  const parsed = new URL(input.baseUrl);
  const port = Number(parsed.port || "80");
  const root = path.resolve(input.distDir);
  if (!fs.existsSync(path.join(root, "index.html"))) {
    throw new Error(`WEB_DIST_INDEX_MISSING:${root}`);
  }
  const server = http.createServer((req, res) => {
    const filePath = safeStaticPath(root, req.url ?? "/");
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(500);
        res.end("static_server_error");
        return;
      }
      res.writeHead(200, { "content-type": contentType(filePath) });
      res.end(data);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, parsed.hostname, () => resolve());
  });
  return {
    started: true,
    stop: () => server.close(),
  };
}

async function resolveWebServer(input: {
  baseUrl?: string;
  distDir?: string;
}): Promise<{ baseUrl: string; server: ProductionGradeWebServerHandle; productionStatic: boolean }> {
  if (input.baseUrl) {
    return {
      baseUrl: input.baseUrl.replace(/\/+$/, ""),
      server: { started: false, stop: () => undefined },
      productionStatic: false,
    };
  }
  const baseUrl = await findFreshLocalhostBaseUrl(8120);
  if (input.distDir) {
    return {
      baseUrl,
      server: await startStaticServer({ distDir: input.distDir, baseUrl }),
      productionStatic: true,
    };
  }
  const outDir = path.join(ROOT, "web-server", timestampForPath());
  return {
    baseUrl,
    server: await ensureProductionGradeWebServer(baseUrl, outDir),
    productionStatic: false,
  };
}

async function clearDurableStorage(page: Page, baseUrl: string): Promise<void> {
  await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(({ manifestKey, bundlePrefix, legacyKey }) => {
    window.sessionStorage.clear();
    window.localStorage.removeItem(manifestKey);
    window.localStorage.removeItem(legacyKey);
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(bundlePrefix)) window.localStorage.removeItem(key);
    }
  }, {
    manifestKey: DURABLE_MANIFEST_KEY,
    bundlePrefix: DURABLE_BUNDLE_PREFIX,
    legacyKey: LEGACY_DURABLE_KEY,
  });
}

async function readBundleEvidence(page: Page): Promise<BrowserBundleEvidence> {
  return page.evaluate(({ manifestKey, bundlePrefix, legacyKey }) => {
    const parse = (value: string | null) => {
      try {
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    };
    const bundles: any[] = [];
    const manifest = parse(window.localStorage.getItem(manifestKey));
    const ids = Array.isArray(manifest?.bundleIds) ? manifest.bundleIds : [];
    for (const id of ids) {
      const raw = window.localStorage.getItem(`${bundlePrefix}${encodeURIComponent(String(id))}`);
      const bundle = parse(raw);
      if (bundle?.draft?.id) bundles.push(bundle);
    }
    const legacy = parse(window.localStorage.getItem(legacyKey));
    if (Array.isArray(legacy)) {
      for (const bundle of legacy) {
        if (bundle?.draft?.id) bundles.push(bundle);
      }
    }
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(bundlePrefix)) continue;
      const bundle = parse(window.localStorage.getItem(key));
      if (bundle?.draft?.id && !bundles.some((item) => item.draft.id === bundle.draft.id)) {
        bundles.push(bundle);
      }
    }
    bundles.sort((left, right) => String(right.draft?.createdAt ?? "").localeCompare(String(left.draft?.createdAt ?? "")));
    const bundle = bundles[0];
    const currentRevisionId = bundle?.estimateDraftRevisionState?.currentRevisionId;
    const currentRevision = Array.isArray(bundle?.estimateDraftRevisionState?.revisions)
      ? bundle.estimateDraftRevisionState.revisions.find((revision: any) => revision.revisionId === currentRevisionId) ??
        bundle.estimateDraftRevisionState.revisions[0]
      : null;
    const items = Array.isArray(bundle?.items) ? bundle.items : [];
    return {
      bundleFound: Boolean(bundle?.draft?.id),
      selectedTemplateId: currentRevision?.selectedTemplateId ?? null,
      selectedWorkKey: bundle?.draft?.selectedWorkKey ?? null,
      itemCount: items.length,
      passportBackedItemCount: items.filter((item: any) =>
        item?.sourceParameters?.passportBackedNaturalLanguageIngress === true
      ).length,
      currentRevisionRowCount: Array.isArray(currentRevision?.boq?.rows) ? currentRevision.boq.rows.length : null,
      durableRecordCount: bundles.length,
    };
  }, {
    manifestKey: DURABLE_MANIFEST_KEY,
    bundlePrefix: DURABLE_BUNDLE_PREFIX,
    legacyKey: LEGACY_DURABLE_KEY,
  });
}

async function runBrowserCase(input: {
  browser: Browser;
  baseUrl: string;
  passport: ProfessionalWorkPassport;
}): Promise<WebLedgerRow> {
  const started = performance.now();
  const context = await input.browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const prompt = buildAiEstimate11610NaturalLanguagePromptForPassport(input.passport, "professional_full");
  try {
    await clearDurableStorage(page, input.baseUrl);
    const pageUrl = `${input.baseUrl}/request?autoPrepare=1&prompt=${encodeURIComponent(prompt)}`;
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
    if (await page.getByTestId("request-estimate-positions-toggle").count()) {
      await page.getByTestId("request-estimate-positions-toggle").click();
      await page.locator("[data-testid^='request-estimate-section-']").first().waitFor({ timeout: 45_000 });
    }
    const bodyText = await page.locator("body").innerText({ timeout: 15_000 });
    const evidence = await readBundleEvidence(page);
    const rowCount = evidence.currentRevisionRowCount ?? evidence.itemCount;
    const sectionCount = await page.locator("[data-testid^='request-estimate-section-']").count();
    const quantityInputCount = await page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count();
    const rawDumpVisible = /raw_ai_json|source_parameters|template_id|formula_id|normFactor|round_to/i.test(bodyText);
    const failureCodes = [
      evidence.bundleFound ? "" : "durable_bundle_missing",
      evidence.selectedTemplateId === input.passport.templateId
        ? ""
        : `selected_template_mismatch:${evidence.selectedTemplateId ?? "missing"}:${input.passport.templateId}`,
      rowCount === input.passport.boqRecipe.rowCount
        ? ""
        : `row_count_mismatch:${rowCount}:${input.passport.boqRecipe.rowCount}`,
      evidence.itemCount > 0 ? "" : "items_empty",
      evidence.passportBackedItemCount === evidence.itemCount && evidence.itemCount > 0
        ? ""
        : `passport_backed_items_mismatch:${evidence.passportBackedItemCount}:${evidence.itemCount}`,
      sectionCount > 0 ? "" : "web_sections_missing",
      quantityInputCount > 0 ? "" : "web_quantity_inputs_missing",
      rawDumpVisible ? "raw_internal_dump_visible" : "",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}:${consoleErrors[0] ?? ""}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}:${pageErrors[0] ?? ""}`,
    ].filter(Boolean);
    return {
      schema: AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_PROOF_SCHEMA,
      case_id: `${input.passport.templateId}:web_baseline`,
      template_id: input.passport.templateId,
      prompt_hash: hashText(prompt),
      page_url: page.url(),
      selected_template_id: evidence.selectedTemplateId,
      selected_work_key: evidence.selectedWorkKey,
      item_count: evidence.itemCount,
      expected_row_count: input.passport.boqRecipe.rowCount,
      passport_backed_item_count: evidence.passportBackedItemCount,
      summary_card_visible: await page.getByTestId("request-estimate-summary-card").count() > 0,
      section_count: sectionCount,
      quantity_input_count: quantityInputCount,
      raw_dump_visible: rawDumpVisible,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_codes: failureCodes,
      passed: failureCodes.length === 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      schema: AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_PROOF_SCHEMA,
      case_id: `${input.passport.templateId}:web_baseline`,
      template_id: input.passport.templateId,
      prompt_hash: hashText(prompt),
      page_url: page.url(),
      selected_template_id: null,
      selected_work_key: null,
      item_count: 0,
      expected_row_count: input.passport.boqRecipe.rowCount,
      passport_backed_item_count: 0,
      summary_card_visible: false,
      section_count: 0,
      quantity_input_count: 0,
      raw_dump_visible: false,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_codes: [`browser_exception:${message.replace(/\s+/g, " ").slice(0, 260)}`],
      passed: false,
    };
  } finally {
    await context.close();
  }
}

export async function runAiEstimate11610WebNaturalLanguageProof(input: {
  all?: boolean;
  limit?: number;
  startIndex?: number;
  baseUrl?: string;
  distDir?: string;
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  const allIds = listProfessionalWorkPassportTemplateIds();
  const startIndex = Math.max(0, Math.floor(input.startIndex ?? 0));
  const selectedIds = input.all
    ? allIds.slice(startIndex)
    : allIds.slice(startIndex, startIndex + Math.max(0, Math.floor(input.limit ?? 10)));
  const outDir = input.writeSummary || input.writeLedger ? path.join(ROOT, timestampForPath()) : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8" }) : null;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const failureSamples: WebLedgerRow[] = [];
  const web = await resolveWebServer({ baseUrl: input.baseUrl, distDir: input.distDir });
  const caseRows: WebLedgerRow[] = [];
  let browserStarted = false;
  let maxHeapUsedMb = 0;
  try {
    const browser = await chromium.launch({ headless: true });
    browserStarted = true;
    try {
      for (const [index, templateId] of selectedIds.entries()) {
        const passport = buildProfessionalWorkPassport(templateId);
        if (!passport) continue;
        const row = await runBrowserCase({ browser, baseUrl: web.baseUrl, passport });
        caseRows.push(row);
        ledgerStream?.write(`${JSON.stringify(row)}\n`);
        maxHeapUsedMb = Math.max(maxHeapUsedMb, row.heap_used_mb);
        if (!row.passed && failureSamples.length < 50) failureSamples.push(row);
        console.info(JSON.stringify({
          case_id: row.case_id,
          passed: row.passed,
          blockers_count: row.failure_codes.length,
          cases_done: index + 1,
          cases_total: selectedIds.length,
        }));
        if (index > 0 && index % 50 === 0) clearProfessionalWorkPassportBuildCaches();
      }
    } finally {
      await browser.close();
    }
  } finally {
    ledgerStream?.end();
    clearProfessionalWorkPassportBuildCaches();
    web.server.stop();
  }
  const passed = caseRows.filter((row) => row.passed).length;
  const fullRunRequested = input.all === true && startIndex === 0 && selectedIds.length === PROFESSIONAL_WORK_PASSPORT_TOTAL;
  const webPassed = fullRunRequested && passed === PROFESSIONAL_WORK_PASSPORT_TOTAL;
  const summary = {
    schema: AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_PROOF_SCHEMA,
    final_status: webPassed
      ? STOP_AI_ESTIMATE_11610_WEB_BASELINE_PASSED_ANDROID_PDF_OPEN_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_BASELINE_BLOCKED_NO_RELEASE,
    web_status: webPassed
      ? GREEN_AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_BASELINE_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_WEB_NATURAL_LANGUAGE_BASELINE_BLOCKED_NO_RELEASE,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    duration_ms: Math.round((performance.now() - started) * 100) / 100,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    base_url: web.baseUrl,
    production_static_dist_served: web.productionStatic,
    dist_dir: input.distDir ?? null,
    browser_automation_started: browserStarted,
    catalog_total_expected: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    template_ids_total: allIds.length,
    selected_templates: selectedIds.length,
    start_index: startIndex,
    cases_completed: caseRows.length,
    cases_passed: passed,
    cases_failed: caseRows.length - passed,
    full_11610_web_baseline_completed: caseRows.length === PROFESSIONAL_WORK_PASSPORT_TOTAL,
    full_11610_web_baseline_passed: webPassed,
    limited_smoke_only: !fullRunRequested,
    max_heap_used_mb: Math.round(maxHeapUsedMb * 100) / 100,
    retained_failure_samples_count: failureSamples.length,
    failure_samples: failureSamples,
    summary_path: summaryPath,
    ledger_path: ledgerPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary };
}

if (require.main === module) {
  void runAiEstimate11610WebNaturalLanguageProof({
    all: hasFlag("all"),
    limit: numericArg("limit") ?? undefined,
    startIndex: numericArg("start-index") ?? undefined,
    baseUrl: argValue("base-url") ?? undefined,
    distDir: argValue("dist-dir") ?? undefined,
    writeSummary: hasFlag("write-summary") || hasFlag("json") || hasFlag("all"),
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.summary.final_status,
        web_status: result.summary.web_status,
        selected_templates: result.summary.selected_templates,
        cases_completed: result.summary.cases_completed,
        cases_passed: result.summary.cases_passed,
        cases_failed: result.summary.cases_failed,
        full_11610_web_baseline_passed: result.summary.full_11610_web_baseline_passed,
        limited_smoke_only: result.summary.limited_smoke_only,
        base_url: result.summary.base_url,
        production_static_dist_served: result.summary.production_static_dist_served,
        failure_samples: result.summary.failure_samples.slice(0, 5),
        summary_path: result.summary.summary_path,
        ledger_path: result.summary.ledger_path,
      }, null, 2));
      if (result.summary.cases_failed > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
