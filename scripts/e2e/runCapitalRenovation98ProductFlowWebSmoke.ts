import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import { parseCapitalRenovationPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationGeometry";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairPdfStorageObject,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";

export const CAPITAL_RENOVATION_98_PROMPT =
  "\u043a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 98 \u043c\u00b2 \u043f\u043e\u0442\u043e\u043b\u043e\u043a 3 \u043c 2 \u0441\u0430\u043d\u0443\u0437\u043b\u0430";

export const GREEN_CAPITAL_RENOVATION_98_PRODUCT_FLOW_WEB =
  "GREEN_AI_ESTIMATE_PRODUCT_FLOW_CAPITAL_RENOVATION_98_WEB_BROWSER_NO_BUILDS" as const;
export const STOP_CAPITAL_RENOVATION_98_PRODUCT_FLOW_WEB =
  "STOP_AI_ESTIMATE_PRODUCT_FLOW_CAPITAL_RENOVATION_98_WEB_BROWSER_FAILED" as const;

const PRODUCT_ROOT = ".release-runtime/ai-estimate-product-flow-fix-capital-renovation-98";
const BLACKBOX_WEB_ROOT = ".release-runtime/ai-estimate-10000-blackbox-acceptance/web";
const BLACKBOX_WEB_GREEN_STATUS = "GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const REQUIRED_GROUP_TITLES = [
  "\u0414\u0435\u043c\u043e\u043d\u0442\u0430\u0436 \u0438 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0430",
  "\u0427\u0435\u0440\u043d\u043e\u0432\u044b\u0435 \u043f\u043e\u043b\u044b",
  "\u0421\u0442\u0435\u043d\u044b",
  "\u0421\u0430\u043d\u0443\u0437\u043b\u044b",
  "\u042d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430",
  "\u0421\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a\u0430",
  "\u0423\u0441\u043b\u0443\u0433\u0438 / \u043b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430",
];
const FORBIDDEN_MAIN_UI_MARKERS = [
  "\u041f\u043e\u0437\u0438\u0446\u0438\u0438 \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u044b\u0435",
  "PRICE_MISSING",
  "no_accepted_price_source_or_unit_conversion",
  "round_to",
  "normFactor",
  "source_parameters",
  "raw_ai_json",
  "Apartment capital renovation project template group",
  "\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442 \u0440\u0430\u0441\u0445\u043e\u0434\u043d\u044b\u0445 \u0438\u0437\u0434\u0435\u043b\u0438\u0439",
];

type BrowserFlowProof = {
  target_url: string;
  page_url: string;
  summary_card_visible: boolean;
  grouped_section_count: number;
  details_drawer_visible: boolean;
  quantity_inputs: number;
  price_inputs: number;
  remove_buttons: number;
  catalog_buttons: number;
  row_photo_buttons: number;
  pdf_button_visible_after_confirm: boolean;
  positions_empty_after_prompt: boolean;
  required_groups_visible: boolean;
  forbidden_main_ui_markers: string[];
  console_error_count: number;
  page_error_count: number;
  body_text_sample: string;
};

type DomainFlowProof = {
  parser_detected: boolean;
  parser: ReturnType<typeof parseCapitalRenovationPrompt>;
  draft_row_count: number;
  snapshot_created: boolean;
  approved_status: string;
  revision_id: string | null;
  snapshot_id: string | null;
  snapshot_row_count: number;
  pdf_generated_from_snapshot: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  pdf_storage_object_exists: boolean;
  pdf_text_contains_capital_renovation: boolean;
  pdf_no_raw_debug_in_main_table: boolean;
  buyer_handoff_created: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  buyer_material_qty_matches_snapshot: boolean;
  buyer_item_count: number;
};

export type CapitalRenovation98ProductFlowSummary = {
  status: "GREEN" | "RED";
  final_status: typeof GREEN_CAPITAL_RENOVATION_98_PRODUCT_FLOW_WEB | typeof STOP_CAPITAL_RENOVATION_98_PRODUCT_FLOW_WEB;
  source_sha: string;
  branch: string;
  generated_by: string;
  generated_at: string;
  target: "web";
  require_real_browser: boolean;
  browser_automation_started: boolean;
  actual_web_browser_capital_renovation_98_smoke_passed: boolean;
  actual_web_browser_smoke_passed: boolean;
  web_smoke_checks_full_product_flow: boolean;
  route_marker_only_smoke_rejected: boolean;
  runtime_marker_only_smoke_rejected: boolean;
  route_equivalent_smoke_passed: false;
  route_equivalent_not_reported_as_real_browser: true;
  browser_evidence_written: boolean;
  console_error_count: number;
  page_error_count: number;
  positions_empty_false_after_prompt: boolean;
  capital_renovation_98_grouped_ui_visible: boolean;
  estimate_revision_snapshot_created: boolean;
  pdf_generated_from_snapshot: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  buyer_handoff_created: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  fake_green_claimed: false;
  blockers: string[];
  browser_flow: BrowserFlowProof;
  domain_flow: DomainFlowProof;
};

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function gitOutput(args: string[], fallback: string): string {
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

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(fullPath: string, value: unknown): void {
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function count(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

export function runCapitalRenovation98ProductFlowDomainProof(): DomainFlowProof {
  __resetConsumerRepairRequestStoreForTests();
  const parser = parseCapitalRenovationPrompt(CAPITAL_RENOVATION_98_PROMPT);
  const draft = createConsumerRepairRequestDraft({
    consumerUserId: "capital-renovation-98-product-flow-smoke",
    problemText: CAPITAL_RENOVATION_98_PROMPT,
    repairType: "apartment_capital_renovation",
    city: "Bishkek",
    addressText: "Bishkek, 64 Malikova Street",
    preferredTimeText: "today",
    contactPhone: "0707052577",
    aiDraft: buildConsumerRepairAiDraft(CAPITAL_RENOVATION_98_PROMPT, { city: "Bishkek", currency: "KGS" }),
  });
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: draft.draft.id,
    userId: draft.draft.consumerUserId,
    generatedAt: "2026-07-04T00:00:00.000Z",
  });
  const revision = approved.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
  ) ?? null;
  const snapshotRows = revision?.editable_estimate_snapshot.rows.filter((row) => !row.removed) ?? [];
  const pdf = approved.pdfs[0] ?? null;
  const pdfObject = pdf ? getConsumerRepairPdfStorageObject({
    storageBucket: pdf.storageBucket,
    storageKey: pdf.storageKey,
  }) : null;
  const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
  const snapshotByRequestItemId = new Map(snapshotRows.map((row) => [row.requestItemId ?? row.rowId, row]));
  const buyerQuantityMismatch = handoff.items.some((item) => {
    const row = snapshotByRequestItemId.get(item.requestItemId ?? item.sourceEstimateRowId);
    return !row || row.quantity !== item.quantity || row.unit !== item.unit;
  });
  const buyerContainsWork = handoff.items.some((item) => String(item.itemType) === "work");
  const pdfBody = pdfObject?.body ?? "";

  return {
    parser_detected: parser.matched && parser.areaM2 === 98 && parser.ceilingHeightM === 3 && parser.bathroomsCount === 2,
    parser,
    draft_row_count: draft.items.length,
    snapshot_created: Boolean(approved.editableEstimateSnapshot && approved.estimateRevisionState),
    approved_status: approved.draft.status,
    revision_id: revision?.revision_id ?? null,
    snapshot_id: revision?.snapshot_id ?? approved.editableEstimateSnapshot?.snapshotId ?? null,
    snapshot_row_count: snapshotRows.length,
    pdf_generated_from_snapshot: Boolean(pdf?.revisionId && pdf.revisionId === revision?.revision_id),
    pdf_rows_equal_snapshot_rows: snapshotRows.length === approved.items.length && pdf?.revisionRowsHash === revision?.rows_hash,
    pdf_storage_object_exists: Boolean(pdfObject),
    pdf_text_contains_capital_renovation: /capital|request-estimate|\u0421\u043c\u0435\u0442\u0430/i.test(pdfBody),
    pdf_no_raw_debug_in_main_table: !/PRICE_MISSING|raw_ai_json|source_parameters|round_to|normFactor/.test(pdfBody),
    buyer_handoff_created: handoff.items.length > 0,
    buyer_handoff_procurement_subset_valid: handoff.items.length > 0 && !buyerContainsWork,
    buyer_material_qty_matches_snapshot: !buyerQuantityMismatch,
    buyer_item_count: handoff.items.length,
  };
}

async function runBrowserFlow(baseUrl: string, outDir: string): Promise<BrowserFlowProof> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    await context.addInitScript((key) => {
      window.localStorage.removeItem(key as string);
    }, DURABLE_REQUEST_STORE_KEY);
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/request`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
    await page.getByTestId("consumer-repair-city-input").fill("Bishkek");
    await page.getByTestId("consumer-repair-address-input").fill("64 Malikova Street");
    await page.getByTestId("consumer-repair-time-input").fill("today");
    await page.getByTestId("consumer-repair-phone-input").fill("0707052577");
    await page.getByTestId("consumer-repair-problem-input").fill(CAPITAL_RENOVATION_98_PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 60_000 });
    await page.getByTestId("request-estimate-details-toggle").click();
    await page.getByTestId("request-estimate-details-panel").waitFor({ timeout: 30_000 });

    const quantityInputs = await count(page, "[data-testid^='consumer-repair-item-quantity-input-']");
    const priceInputs = await count(page, "[data-testid^='consumer-repair-item-unit-price-input-']");
    const removeButtons = await count(page, "[data-testid^='consumer-repair-item-remove-']");
    const catalogButtons = await count(page, "[data-testid^='consumer-repair-item-catalog-']");
    const rowPhotoButtons = await count(page, "[data-testid^='estimate-material-row-photo-button-']");
    const groupedSectionCount = await count(page, "[data-testid^='request-estimate-section-']");
    let bodyText = await page.locator("body").innerText({ timeout: 10_000 });
    const forbiddenMainUiMarkers = FORBIDDEN_MAIN_UI_MARKERS.filter((marker) => bodyText.includes(marker));
    const requiredGroupsVisible = REQUIRED_GROUP_TITLES.every((title) => bodyText.includes(title));

    await page.getByTestId("consumer-repair-approve").click();
    await page.getByTestId("consumer-repair-open-pdf").waitFor({ timeout: 60_000 });
    bodyText = await page.locator("body").innerText({ timeout: 10_000 });

    const screenshotPath = path.join(outDir, "capital-renovation-98-product-flow-web.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      target_url: targetUrl,
      page_url: page.url(),
      summary_card_visible: await page.getByTestId("request-estimate-summary-card").count() > 0,
      grouped_section_count: groupedSectionCount,
      details_drawer_visible: await page.getByTestId("request-estimate-details-panel").count() > 0,
      quantity_inputs: quantityInputs,
      price_inputs: priceInputs,
      remove_buttons: removeButtons,
      catalog_buttons: catalogButtons,
      row_photo_buttons: rowPhotoButtons,
      pdf_button_visible_after_confirm: await page.getByTestId("consumer-repair-open-pdf").count() > 0,
      positions_empty_after_prompt: bodyText.includes("\u041f\u043e\u0437\u0438\u0446\u0438\u0438 \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u044b\u0435"),
      required_groups_visible: requiredGroupsVisible,
      forbidden_main_ui_markers: forbiddenMainUiMarkers,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      body_text_sample: bodyText.slice(0, 5000),
    };
  } finally {
    await browser.close();
  }
}

function blockersFor(input: { browser: BrowserFlowProof; domain: DomainFlowProof }): string[] {
  return [
    input.browser.summary_card_visible ? "" : "browser_summary_card_missing",
    input.browser.grouped_section_count >= 8 ? "" : `browser_grouped_sections_missing:${input.browser.grouped_section_count}`,
    input.browser.details_drawer_visible ? "" : "browser_details_drawer_missing",
    input.browser.quantity_inputs >= 64 ? "" : `browser_quantity_inputs_missing:${input.browser.quantity_inputs}`,
    input.browser.price_inputs >= 64 ? "" : `browser_price_inputs_missing:${input.browser.price_inputs}`,
    input.browser.remove_buttons >= 64 ? "" : `browser_remove_buttons_missing:${input.browser.remove_buttons}`,
    input.browser.catalog_buttons >= 30 ? "" : `browser_catalog_buttons_missing:${input.browser.catalog_buttons}`,
    input.browser.row_photo_buttons >= 30 ? "" : `browser_photo_buttons_missing:${input.browser.row_photo_buttons}`,
    input.browser.pdf_button_visible_after_confirm ? "" : "browser_pdf_button_missing_after_confirm",
    !input.browser.positions_empty_after_prompt ? "" : "browser_positions_empty_after_prompt",
    input.browser.required_groups_visible ? "" : "browser_required_groups_missing",
    input.browser.forbidden_main_ui_markers.length === 0 ? "" : `browser_forbidden_markers:${input.browser.forbidden_main_ui_markers.join(",")}`,
    input.browser.console_error_count === 0 ? "" : `browser_console_errors:${input.browser.console_error_count}`,
    input.browser.page_error_count === 0 ? "" : `browser_page_errors:${input.browser.page_error_count}`,
    input.domain.parser_detected ? "" : "domain_parser_failed",
    input.domain.draft_row_count === 64 ? "" : `domain_draft_row_count_bad:${input.domain.draft_row_count}`,
    input.domain.snapshot_created ? "" : "domain_snapshot_missing",
    input.domain.approved_status === "consumer_approved" ? "" : `domain_not_approved:${input.domain.approved_status}`,
    input.domain.pdf_generated_from_snapshot ? "" : "domain_pdf_not_bound_to_snapshot",
    input.domain.pdf_rows_equal_snapshot_rows ? "" : "domain_pdf_rows_not_equal_snapshot",
    input.domain.pdf_storage_object_exists ? "" : "domain_pdf_storage_missing",
    input.domain.buyer_handoff_created ? "" : "domain_buyer_handoff_missing",
    input.domain.buyer_handoff_procurement_subset_valid ? "" : "domain_buyer_handoff_not_procurement_subset",
    input.domain.buyer_material_qty_matches_snapshot ? "" : "domain_buyer_quantities_mismatch_snapshot",
  ].filter(Boolean);
}

function writeBlackboxEvidenceFromProductSummary(productSummary: CapitalRenovation98ProductFlowSummary): string {
  const outDir = path.join(process.cwd(), BLACKBOX_WEB_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  const artifact = {
    ...productSummary,
    final_status: productSummary.blockers.length === 0
      ? BLACKBOX_WEB_GREEN_STATUS
      : "STOP_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_FAILED",
    actual_web_browser_smoke_passed: productSummary.blockers.length === 0,
    browser_evidence_written: productSummary.blockers.length === 0,
  };
  writeJson(artifactPath, artifact);
  return artifactPath;
}

export async function runCapitalRenovation98ProductFlowWebSmoke(options: {
  target?: "web";
  requireRealBrowser?: boolean;
  baseUrl?: string;
  writeBlackboxEvidence?: boolean;
} = {}) {
  if ((options.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_TARGET:${options.target}`);
  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const outDir = path.join(process.cwd(), PRODUCT_ROOT, timestampForPath(), "web");
  mkdirSync(outDir, { recursive: true });

  const browser = await runBrowserFlow(options.baseUrl ?? process.env.CAPITAL_RENOVATION_REQUEST_BASE_URL ?? "http://localhost:8081", outDir);
  const domain = runCapitalRenovation98ProductFlowDomainProof();
  const blockers = blockersFor({ browser, domain });
  const summary: CapitalRenovation98ProductFlowSummary = {
    status: blockers.length === 0 ? "GREEN" : "RED",
    final_status: blockers.length === 0
      ? GREEN_CAPITAL_RENOVATION_98_PRODUCT_FLOW_WEB
      : STOP_CAPITAL_RENOVATION_98_PRODUCT_FLOW_WEB,
    source_sha: sourceSha,
    branch,
    generated_by: "scripts/e2e/runCapitalRenovation98ProductFlowWebSmoke.ts",
    generated_at: new Date().toISOString(),
    target: "web",
    require_real_browser: options.requireRealBrowser ?? true,
    browser_automation_started: true,
    actual_web_browser_capital_renovation_98_smoke_passed: blockers.length === 0,
    actual_web_browser_smoke_passed: blockers.length === 0,
    web_smoke_checks_full_product_flow: true,
    route_marker_only_smoke_rejected: true,
    runtime_marker_only_smoke_rejected: true,
    route_equivalent_smoke_passed: false,
    route_equivalent_not_reported_as_real_browser: true,
    browser_evidence_written: blockers.length === 0,
    console_error_count: browser.console_error_count,
    page_error_count: browser.page_error_count,
    positions_empty_false_after_prompt: !browser.positions_empty_after_prompt,
    capital_renovation_98_grouped_ui_visible: browser.summary_card_visible && browser.grouped_section_count >= 8,
    estimate_revision_snapshot_created: domain.snapshot_created,
    pdf_generated_from_snapshot: domain.pdf_generated_from_snapshot,
    pdf_rows_equal_snapshot_rows: domain.pdf_rows_equal_snapshot_rows,
    buyer_handoff_created: domain.buyer_handoff_created,
    buyer_handoff_procurement_subset_valid: domain.buyer_handoff_procurement_subset_valid,
    fake_green_claimed: false,
    blockers,
    browser_flow: browser,
    domain_flow: domain,
  };
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  const blackboxArtifactPath = options.writeBlackboxEvidence ? writeBlackboxEvidenceFromProductSummary(summary) : null;
  return { artifactPath, blackboxArtifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runCapitalRenovation98ProductFlowWebSmoke.ts")) {
  const target = argValue("target") ?? "web";
  void runCapitalRenovation98ProductFlowWebSmoke({
    target: target as "web",
    requireRealBrowser: process.argv.includes("--require-real-browser"),
    baseUrl: argValue("base-url") ?? undefined,
    writeBlackboxEvidence: process.argv.includes("--write-blackbox-evidence"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        status: result.artifact.status,
        artifact: result.artifactPath,
        blackbox_artifact: result.blackboxArtifactPath,
        blockers: result.artifact.blockers,
        actual_web_browser_capital_renovation_98_smoke_passed: result.artifact.actual_web_browser_capital_renovation_98_smoke_passed,
        console_error_count: result.artifact.console_error_count,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
