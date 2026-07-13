import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";

import { gitOutput, timestampForPath } from "../estimate/buildControlledPilotHealthDashboard";
import {
  EDITABLE_PARAM_REVISION_CASE_SET,
  buildEditableParamRevisionAcceptanceCases,
  type EditableParamRevisionAcceptanceCase,
} from "../estimate/editableParamRevisionAcceptanceCases";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-editable-param-revisions", "web");
const STORAGE_KEYS = {
  legacy: "rik.consumer_repair.request_bundles.v1",
  manifest: "rik.consumer_repair.request_bundles.v2.manifest",
  prefix: "rik.consumer_repair.request_bundle.v2:",
};
const CAPITAL_RENOVATION_BATCH_SMOKE_CASE: EditableParamRevisionAcceptanceCase = {
  id: "mandatory-capital-renovation-three-param-batch",
  prompt: "\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 101 \u043a\u0432. \u043c\u0435\u0442\u0440",
  operation: "update_param",
  paramKey: "area_m2",
  rawValue: "120",
  expectedFamily: "apartment_capital_renovation",
  expectedParamAfter: 120,
};
const MANDATORY_BATCH_EDITS = [
  { paramKey: "area_m2", rawValue: "120", source: "filled" },
  { paramKey: "ceiling_height_m", rawValue: "3.2", source: "derived" },
  { paramKey: "doors_count", rawValue: "8", source: "derived" },
  { paramKey: "electrical_points", rawValue: "99", source: "derived" },
] as const;
const REQUIRED_VISIBLE_RU_LABELS = [
  "\u041f\u043b\u043e\u0449\u0430\u0434\u044c",
  "\u0412\u044b\u0441\u043e\u0442\u0430 \u043f\u043e\u0442\u043e\u043b\u043a\u0430",
  "\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0434\u0432\u0435\u0440\u0435\u0439",
  "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u0442\u043e\u0447\u043a\u0438",
  "\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c \u0432\u0441\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
  "\u041e\u0442\u043c\u0435\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
];

type BatchParamEdit = {
  paramKey: string;
  rawValue: string;
  source?: string;
};

type DurableBundle = Record<string, any>;
type PdfReturnMode = "goto" | "history";
type CdpInputMode = "mouse" | "touch";

type BundleProofSnapshot = {
  draft_id: string | null;
  draft_status: string | null;
  selected_work_key: string | null;
  selected_work_title_ru: string | null;
  current_revision_id: string | null;
  revision_count: number;
  diff_count: number;
  template_id: string | null;
  family: string | null;
  boq_row_count: number;
  item_row_count: number;
  params: Record<string, unknown>;
  quantity_fingerprint: string;
  item_quantity_fingerprint: string;
  generated_pdfs: { id: string | null; revisionId: string | null; status: string | null }[];
  archived_pdfs: { id: string | null; revisionId: string | null; status: string | null }[];
  latest_diff: {
    changed_params: { key: string; before: unknown; after: unknown }[];
    changed_rows_count: number;
  } | null;
  batch_events: {
    eventType: string;
    patchCount: unknown;
    revisionId: unknown;
    previousRevisionId: unknown;
    rowsBefore: unknown;
    rowsAfter: unknown;
    changedRows: unknown;
    pdfStatus: unknown;
    changedParamKeys: unknown;
  }[];
};

export type EditableParamRevisionSmokeCaseResult = {
  case_id: string;
  prompt: string;
  param_key: string;
  param_keys?: string[];
  batch_size?: number;
  batch_payload?: BatchParamEdit[];
  passed: boolean;
  ui: {
    revision_panel_visible: boolean;
    param_chip_visible: boolean;
    popover_visible: boolean;
    batch_bar_visible?: boolean;
    batch_apply_visible?: boolean;
    dirty_count_visible?: boolean;
    revision_diff_visible: boolean;
    timeline_r2_visible: boolean;
    artifact_status_visible: boolean;
    positions_visible?: boolean;
    derived_editors_visible?: boolean;
    visible_russian_labels?: Record<string, boolean>;
  };
  proof?: {
    initial: BundleProofSnapshot;
    old_pdf: BundleProofSnapshot;
    cancel: {
      tested: boolean;
      active_revision_unchanged: boolean;
      positions_unchanged: boolean;
      storage_unchanged: boolean;
      draft_values_reverted: boolean;
    };
    before_apply: {
      active_revision_unchanged: boolean;
      revision_count_unchanged: boolean;
      positions_unchanged: boolean;
      quantities_unchanged: boolean;
      local_draft_values: Record<string, string>;
    };
    after_apply: {
      snapshot: BundleProofSnapshot;
      single_revision_created: boolean;
      one_batch_event_created: boolean;
      batch_event_patch_count: number | null;
      all_batch_values_applied: boolean;
      applied_params: Record<string, unknown>;
      history_diff_contains_all_requested_params: boolean;
      history_diff_before_after_values_present: boolean;
      boq_not_empty: boolean;
      positions_stay_visible: boolean;
      quantities_recalculated: boolean;
      old_pdf_stale: boolean;
    };
    reload: {
      snapshot: BundleProofSnapshot;
      revision_persisted: boolean;
      params_persisted: boolean;
      positions_persisted: boolean;
    };
    new_pdf: {
      snapshot: BundleProofSnapshot;
      generated_for_latest_revision: boolean;
      old_pdf_remains_archived: boolean;
    };
  };
  blocking_reasons: string[];
};

export type EditableParamRevisionWebSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE
    | typeof STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof EDITABLE_PARAM_REVISION_CASE_SET;
  corpus_fingerprint: string;
  target: "web";
  require_real_browser: boolean;
  actual_web_browser_editable_param_revision_passed: boolean;
  web_editable_revision_cases_passed: string;
  web_revision_diff_visible_count: number;
  web_template_lost_after_edit_count: number;
  web_param_update_failures: number;
  web_recalc_failures: number;
  web_stale_pdf_failures: number;
  web_stale_buyer_failures: number;
  web_console_errors_count: number;
  web_page_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  route_equivalent_used: false;
  env_flag_green: false;
  case_results: EditableParamRevisionSmokeCaseResult[];
  blockers: string[];
  runtime_summary_path?: string;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function writeSummary(summary: EditableParamRevisionWebSmokeSummary): string {
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "summary.json");
  writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return filePath;
}

function smokeCases(count: number): EditableParamRevisionAcceptanceCase[] {
  const generated = buildEditableParamRevisionAcceptanceCases(Math.max(count * 2, 120))
    .filter((item) => !item.selectedTemplateId && item.operation === "update_param")
    .filter((item) => item.expectedFamily !== "diamond_core_drilling_concrete")
    .filter((item) => item.id !== CAPITAL_RENOVATION_BATCH_SMOKE_CASE.id);
  return [CAPITAL_RENOVATION_BATCH_SMOKE_CASE, ...generated].slice(0, count);
}

function fingerprint(cases: readonly EditableParamRevisionAcceptanceCase[]): string {
  return Buffer.from(cases.map((item) => {
    const edits = explicitBatchEditsForCase(item) ?? [{ paramKey: item.paramKey, rawValue: item.rawValue }];
    return `${item.id}:${edits.map((edit) => `${edit.paramKey}=${edit.rawValue}`).join(",")}`;
  }).join("|")).toString("base64url").slice(0, 32);
}

function explicitBatchEditsForCase(testCase: EditableParamRevisionAcceptanceCase): BatchParamEdit[] | null {
  if (testCase.id !== CAPITAL_RENOVATION_BATCH_SMOKE_CASE.id) return null;
  return MANDATORY_BATCH_EDITS.map((edit) => ({ ...edit }));
}

function nextRawBatchValue(currentValue: string, index: number): string {
  const normalized = currentValue.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/-?\d+(?:[,.]\d+)?/);
  if (!match) return normalized ? `${normalized} ${index + 1}` : String(index + 1);
  const parsed = Number(match[0].replace(",", "."));
  if (!Number.isFinite(parsed)) return String(index + 1);
  const next = parsed + index + 1;
  return Number.isInteger(next) ? String(next) : next.toFixed(2).replace(/\.?0+$/, "");
}

function stableQuantityFingerprint(rows: readonly any[]): string {
  return rows
    .map((row) => `${row.rowId ?? row.id ?? ""}:${row.quantity ?? ""}:${row.unit ?? ""}`)
    .sort()
    .join("|");
}

function normalizeComparableValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(Number(value.toFixed(6)));
  return String(value ?? "").replace(",", ".").trim();
}

function expectedValue(rawValue: string): string {
  const match = rawValue.match(/-?\d+(?:[,.]\d+)?/);
  return match ? normalizeComparableValue(Number(match[0].replace(",", "."))) : normalizeComparableValue(rawValue);
}

function snapshotBundle(bundle: DurableBundle | null): BundleProofSnapshot {
  const state = bundle?.estimateDraftRevisionState ?? null;
  const revisions = Array.isArray(state?.revisions) ? state.revisions : [];
  const currentRevision = revisions.find((revision: any) => revision.revisionId === state?.currentRevisionId) ?? revisions.at(-1) ?? null;
  const diffs = Array.isArray(state?.diffs) ? state.diffs : [];
  const latestDiff = diffs.at(-1) ?? null;
  const pdfs = Array.isArray(bundle?.pdfs) ? bundle.pdfs : [];
  const items = Array.isArray(bundle?.items) ? bundle.items : [];
  const params = Object.fromEntries(Object.entries(currentRevision?.params ?? {}).map(([key, raw]: [string, any]) => [key, raw?.value ?? raw]));
  return {
    draft_id: bundle?.draft?.id ?? null,
    draft_status: bundle?.draft?.status ?? null,
    selected_work_key: bundle?.draft?.selectedWorkKey ?? null,
    selected_work_title_ru: bundle?.draft?.selectedWorkTitleRu ?? null,
    current_revision_id: state?.currentRevisionId ?? currentRevision?.revisionId ?? null,
    revision_count: revisions.length,
    diff_count: diffs.length,
    template_id: currentRevision?.selectedTemplateId ?? null,
    family: currentRevision?.matchedFamily ?? null,
    boq_row_count: Array.isArray(currentRevision?.boq?.rows) ? currentRevision.boq.rows.length : 0,
    item_row_count: items.length,
    params,
    quantity_fingerprint: stableQuantityFingerprint(currentRevision?.boq?.rows ?? []),
    item_quantity_fingerprint: stableQuantityFingerprint(items),
    generated_pdfs: pdfs
      .filter((pdf: any) => pdf.pdfStatus === "generated")
      .map((pdf: any) => ({ id: pdf.id ?? null, revisionId: pdf.revisionId ?? null, status: pdf.pdfStatus ?? null })),
    archived_pdfs: pdfs
      .filter((pdf: any) => pdf.pdfStatus === "archived")
      .map((pdf: any) => ({ id: pdf.id ?? null, revisionId: pdf.revisionId ?? null, status: pdf.pdfStatus ?? null })),
    latest_diff: latestDiff ? {
      changed_params: Array.isArray(latestDiff.changedParams) ? latestDiff.changedParams : [],
      changed_rows_count: Number(latestDiff.changedRowsCount ?? 0),
    } : null,
    batch_events: (Array.isArray(bundle?.events) ? bundle.events : [])
      .filter((event: any) => event.eventType === "estimate_params_batch_recalculated")
      .map((event: any) => ({
        eventType: event.eventType,
        patchCount: event.payload?.patchCount,
        revisionId: event.payload?.revisionId,
        previousRevisionId: event.payload?.previousRevisionId,
        rowsBefore: event.payload?.rowsBefore,
        rowsAfter: event.payload?.rowsAfter,
        changedRows: event.payload?.changedRows,
        pdfStatus: event.payload?.pdfStatus,
        changedParamKeys: event.payload?.changedParamKeys,
      })),
  };
}

async function readLatestBundle(page: Page, draftId?: string): Promise<DurableBundle> {
  return page.evaluate(({ keys, expectedDraftId }) => {
    const bundles: any[] = [];
    const legacyRaw = window.localStorage.getItem(keys.legacy);
    if (legacyRaw) {
      try {
        const legacy = JSON.parse(legacyRaw);
        if (Array.isArray(legacy)) bundles.push(...legacy);
      } catch {
        // Ignore malformed legacy storage. The v2 records below are authoritative.
      }
    }
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(keys.prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const bundle = JSON.parse(raw);
        if (bundle?.draft?.id) bundles.push(bundle);
      } catch {
        // Ignore malformed records; the proof fails if no valid bundle exists.
      }
    }
    const unique = new Map<string, any>();
    for (const bundle of bundles) unique.set(bundle.draft.id, bundle);
    if (expectedDraftId) return unique.get(expectedDraftId) ?? null;
    return [...unique.values()].sort((left, right) =>
      String(right.draft?.createdAt ?? "").localeCompare(String(left.draft?.createdAt ?? "")),
    )[0] ?? null;
  }, { keys: STORAGE_KEYS, expectedDraftId: draftId ?? null });
}

async function installPageEvaluateNameHelper(page: Page): Promise<void> {
  await page.evaluate("var __name = globalThis.__name || ((target) => target); globalThis.__name = __name;");
}

async function clearRequestStorage(page: Page, baseUrl: string, timeoutMs = 45_000): Promise<void> {
  await page.goto(new URL("/request", `${baseUrl}/`).toString(), { waitUntil: "domcontentloaded", timeout: timeoutMs });
  await installPageEvaluateNameHelper(page);
  await page.evaluate((keys) => {
    window.localStorage.removeItem(keys.legacy);
    window.localStorage.removeItem(keys.manifest);
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(keys.prefix)) window.localStorage.removeItem(key);
    }
  }, STORAGE_KEYS);
}

async function waitForBundle(
  page: Page,
  predicate: (snapshot: BundleProofSnapshot) => boolean,
  timeoutMs = 30_000,
  draftId?: string,
): Promise<DurableBundle> {
  const started = Date.now();
  let latest: DurableBundle | null = null;
  while (Date.now() - started < timeoutMs) {
    latest = await readLatestBundle(page, draftId).catch(() => null);
    if (latest && predicate(snapshotBundle(latest))) return latest;
    await page.waitForTimeout(250);
  }
  throw new Error(`WAIT_BUNDLE_TIMEOUT:${JSON.stringify(snapshotBundle(latest))}`);
}

async function revealDerivedParameters(page: Page): Promise<void> {
  const toggle = page.getByTestId("request-estimate-derived-parameters-toggle");
  if (await toggle.count() === 0) return;
  if (await page.getByTestId("request-estimate-derived-parameters").count() === 0) {
    await toggle.first().scrollIntoViewIfNeeded();
    await toggle.first().click();
  }
  await page.getByTestId("request-estimate-derived-parameters").waitFor({ timeout: 5_000 }).catch(() => undefined);
}

async function collectBatchEdits(
  page: Page,
  testCase: EditableParamRevisionAcceptanceCase,
): Promise<BatchParamEdit[]> {
  const explicit = explicitBatchEditsForCase(testCase);
  if (explicit) return explicit;
  const editorIds = await page
    .locator('[data-testid^="editable-param-inline-editor-"]')
    .evaluateAll((nodes) => [...new Set(nodes
      .map((node) => node.getAttribute("data-testid") ?? "")
      .filter(Boolean)
      .map((testId) => testId.replace(/^editable-param-inline-editor-/, "")))]);
  const paramKeys = [testCase.paramKey, ...editorIds.filter((key) => key !== testCase.paramKey)].slice(0, 3);
  const edits: BatchParamEdit[] = [];
  for (const [index, paramKey] of paramKeys.entries()) {
    if (paramKey === testCase.paramKey) {
      edits.push({ paramKey, rawValue: testCase.rawValue });
      continue;
    }
    const input = page.getByTestId(`editable-param-inline-editor-${paramKey}`).getByTestId("editable-param-popover-input");
    const currentValue = await input.inputValue().catch(() => "");
    edits.push({ paramKey, rawValue: nextRawBatchValue(currentValue, index) });
  }
  return edits;
}

async function readDraftInputValues(page: Page, edits: readonly BatchParamEdit[]): Promise<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const edit of edits) {
    values[edit.paramKey] = await page
      .getByTestId(`editable-param-inline-editor-${edit.paramKey}`)
      .getByTestId("editable-param-popover-input")
      .inputValue();
  }
  return values;
}

async function readParamEditorDebug(
  page: Page,
  edits: readonly BatchParamEdit[],
  draftId: string,
  stage: string,
): Promise<Record<string, unknown>> {
  const dom = await page.evaluate((input) => {
    const rectOf = (node: Element | null) => {
      const rect = node?.getBoundingClientRect();
      return rect
        ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
        : null;
    };
    const textOf = (selector: string) => document.querySelector(selector)?.textContent?.trim() ?? null;
    const inputValues = Object.fromEntries(input.edits.map((edit) => {
      const editor = document.querySelector(`[data-testid="editable-param-inline-editor-${edit.paramKey}"]`);
      const field = editor?.querySelector('[data-testid="editable-param-popover-input"]') as HTMLInputElement | null;
      const dirty = editor?.querySelector(`[data-testid="editable-param-dirty-${edit.paramKey}"]`);
      return [edit.paramKey, {
        expected: edit.rawValue,
        value: field?.value ?? null,
        dirty_visible: Boolean(dirty),
        editor_rect: rectOf(editor),
        input_rect: rectOf(field),
      }];
    }));
    const apply = document.querySelector('[data-testid="editable-param-batch-apply"]');
    const applyRect = rectOf(apply);
    const applyCenter = applyRect
      ? { x: applyRect.left + applyRect.width / 2, y: applyRect.top + applyRect.height / 2 }
      : null;
    const applyHit = applyCenter
      ? document.elementFromPoint(applyCenter.x, applyCenter.y)
      : null;
    const active = document.activeElement as HTMLElement | null;
    return {
      url: window.location.href,
      scrollY: window.scrollY,
      viewport: {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        visualHeight: window.visualViewport?.height ?? null,
        visualWidth: window.visualViewport?.width ?? null,
        visualOffsetTop: window.visualViewport?.offsetTop ?? null,
      },
      input_values: inputValues,
      batch_bar_text: textOf('[data-testid="editable-param-batch-bar"]'),
      dirty_count_text: textOf('[data-testid="editable-param-batch-dirty-count"]'),
      apply_text: textOf('[data-testid="editable-param-batch-apply"]'),
      cancel_text: textOf('[data-testid="editable-param-batch-cancel"]'),
      apply_rect: applyRect,
      apply_hit_test_id: applyHit?.getAttribute?.("data-testid") ?? null,
      apply_hit_text: applyHit?.textContent?.trim().slice(0, 80) ?? null,
      active_element: {
        tag: active?.tagName ?? null,
        test_id: active?.getAttribute?.("data-testid") ?? null,
        value: (active as HTMLInputElement | null)?.value ?? null,
      },
      body_text_sample: document.body.textContent?.trim().slice(0, 800) ?? "",
    };
  }, { edits });

  try {
    return {
      stage,
      dom,
      storage_snapshot: snapshotBundle(await readLatestBundle(page, draftId)),
    };
  } catch (error) {
    return {
      stage,
      dom,
      storage_error: String(error instanceof Error ? error.message : error).slice(0, 500),
    };
  }
}

async function fillBatchEdits(page: Page, edits: readonly BatchParamEdit[]): Promise<void> {
  for (const edit of edits) {
    const editor = page.getByTestId(`editable-param-inline-editor-${edit.paramKey}`);
    await editor.waitFor({ timeout: 10_000 });
    await editor.scrollIntoViewIfNeeded();
    await editor.getByTestId("editable-param-popover-input").fill(edit.rawValue);
  }
}

async function requireNoErrorOverlay(page: Page, timeoutMs = 10_000): Promise<void> {
  const overlay = page.locator("#error-overlay");
  await overlay.waitFor({ state: "detached", timeout: timeoutMs }).catch(async () => {
    if (await overlay.count() > 0) throw new Error("web_error_overlay_visible_before_pdf");
  });
}

async function pointerClickVisibleTestId(
  page: Page,
  target: Locator,
  testId: string,
  timeoutMs = 20_000,
  inputMode: CdpInputMode = "mouse",
): Promise<void> {
  await target.waitFor({ timeout: timeoutMs });
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  const box = await target.boundingBox();
  if (!box) throw new Error(`pointer_click_target_missing:${testId}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hitTarget = await page.evaluate(
    ({ x, y, id }) => {
      const targetNode = document.querySelector(`[data-testid="${id}"]`);
      const hitNode = document.elementFromPoint(x, y);
      return Boolean(targetNode && hitNode && (targetNode === hitNode || targetNode.contains(hitNode)));
    },
    { x: point.x, y: point.y, id: testId },
  );
  if (!hitTarget) throw new Error(`pointer_click_target_obscured:${testId}`);
  const cdp = await page.context().newCDPSession(page);
  try {
    if (inputMode === "touch") {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: point.x, y: point.y, radiusX: 1, radiusY: 1, force: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: point.x,
        y: point.y,
        button: "left",
        buttons: 1,
        clickCount: 1,
      });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: point.x,
        y: point.y,
        button: "left",
        buttons: 0,
        clickCount: 1,
      });
    }
  } finally {
    await cdp.detach().catch(() => undefined);
  }
}

async function returnToRequestFromPdfViewer(
  page: Page,
  requestUrl: string,
  timeoutMs: number,
  mode: PdfReturnMode,
): Promise<void> {
  if (page.url().includes("/request")) return;
  if (mode === "history" && page.url().includes("/pdf-viewer")) {
    await page.goBack({ waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (page.url() !== requestUrl) {
      await page.goto(requestUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    }
  } else {
    await page.goto(requestUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  }
  if (!page.url().includes("/request")) {
    throw new Error(`request_return_failed:${page.url().slice(0, 160)}`);
  }
  await installPageEvaluateNameHelper(page);
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: timeoutMs });
}

async function createPdfAndReturnToRequest(
  page: Page,
  requestUrl: string,
  timeoutMs = 45_000,
  returnMode: PdfReturnMode = "goto",
  draftId?: string,
  inputMode: CdpInputMode = "mouse",
): Promise<BundleProofSnapshot> {
  await requireNoErrorOverlay(page, timeoutMs);
  const button = page.getByTestId("consumer-estimate-make-pdf").first();
  await pointerClickVisibleTestId(page, button, "consumer-estimate-make-pdf", 20_000, inputMode);
  await page.waitForURL((url) => url.pathname.includes("/pdf-viewer"), { timeout: Math.min(timeoutMs, 20_000) })
    .catch(() => undefined);
  await returnToRequestFromPdfViewer(page, requestUrl, timeoutMs, returnMode);
  const bundle = await waitForBundle(page, (snapshot) => snapshot.generated_pdfs.length > 0, timeoutMs, draftId);
  return snapshotBundle(bundle);
}

function allApplied(snapshot: BundleProofSnapshot, edits: readonly BatchParamEdit[]): boolean {
  return edits.every((edit) => normalizeComparableValue(snapshot.params[edit.paramKey]) === expectedValue(edit.rawValue));
}

function visibleLabelMap(bodyText: string): Record<string, boolean> {
  return Object.fromEntries(REQUIRED_VISIBLE_RU_LABELS.map((label) => [label, bodyText.includes(label)]));
}

function validateResult(result: EditableParamRevisionSmokeCaseResult): string[] {
  const proof = result.proof;
  const visibleLabels = Object.entries(result.ui.visible_russian_labels ?? {});
  return [
    result.ui.revision_panel_visible ? "" : "param_edit_ui_missing",
    result.ui.param_chip_visible ? "" : "param_chip_missing",
    result.ui.popover_visible ? "" : "inline_editor_input_missing",
    result.ui.batch_bar_visible ? "" : "batch_bar_missing",
    result.ui.batch_apply_visible ? "" : "batch_apply_missing",
    result.ui.dirty_count_visible ? "" : "dirty_count_missing",
    result.ui.revision_diff_visible ? "" : "revision_diff_missing",
    result.ui.timeline_r2_visible ? "" : "revision_r2_missing",
    result.ui.artifact_status_visible ? "" : "artifact_status_missing",
    result.ui.positions_visible ? "" : "positions_missing",
    result.ui.derived_editors_visible ? "" : "derived_editors_missing",
    visibleLabels.every(([, visible]) => visible) ? "" : `visible_ru_labels_missing:${visibleLabels.filter(([, visible]) => !visible).map(([label]) => label).join(",")}`,
    proof?.initial.boq_row_count ? "" : "initial_boq_empty",
    proof?.initial.item_row_count ? "" : "initial_positions_empty",
    proof?.old_pdf.generated_pdfs.length === 1 ? "" : "old_pdf_not_created",
    proof?.cancel.tested ? "" : "cancel_not_tested",
    proof?.cancel.active_revision_unchanged ? "" : "cancel_changed_active_revision",
    proof?.cancel.positions_unchanged ? "" : "cancel_changed_positions",
    proof?.cancel.storage_unchanged ? "" : "cancel_changed_storage",
    proof?.cancel.draft_values_reverted ? "" : "cancel_did_not_revert_draft_values",
    proof?.before_apply.active_revision_unchanged ? "" : "draft_changed_active_revision_before_apply",
    proof?.before_apply.revision_count_unchanged ? "" : "draft_changed_revision_count_before_apply",
    proof?.before_apply.positions_unchanged ? "" : "draft_changed_positions_before_apply",
    proof?.before_apply.quantities_unchanged ? "" : "draft_changed_quantities_before_apply",
    proof?.after_apply.single_revision_created ? "" : "batch_not_single_revision",
    proof?.after_apply.one_batch_event_created ? "" : "batch_event_count_invalid",
    proof?.after_apply.batch_event_patch_count === result.batch_size ? "" : "batch_event_patch_count_invalid",
    proof?.after_apply.all_batch_values_applied ? "" : "batch_values_not_applied",
    proof?.after_apply.history_diff_contains_all_requested_params ? "" : "history_diff_missing_requested_params",
    proof?.after_apply.history_diff_before_after_values_present ? "" : "history_diff_missing_before_after",
    proof?.after_apply.boq_not_empty ? "" : "boq_empty_after_apply",
    proof?.after_apply.positions_stay_visible ? "" : "positions_disappeared_after_apply",
    proof?.after_apply.quantities_recalculated ? "" : "quantities_not_recalculated",
    proof?.after_apply.old_pdf_stale ? "" : "old_pdf_not_stale",
    proof?.reload.revision_persisted ? "" : "reload_revision_not_persisted",
    proof?.reload.params_persisted ? "" : "reload_params_not_persisted",
    proof?.reload.positions_persisted ? "" : "reload_positions_not_persisted",
    proof?.new_pdf.generated_for_latest_revision ? "" : "new_pdf_not_bound_to_latest_revision",
    proof?.new_pdf.old_pdf_remains_archived ? "" : "old_pdf_unarchived_after_new_pdf",
  ].filter(Boolean);
}

export async function runEditableParamRevisionPageCase(
  page: Page,
  testCase: EditableParamRevisionAcceptanceCase,
  input: { baseUrl?: string; waitTimeoutMs?: number; pdfReturnMode?: PdfReturnMode; cdpInputMode?: CdpInputMode } = {},
): Promise<EditableParamRevisionSmokeCaseResult> {
  const baseUrl = String(input.baseUrl ?? process.env.EDITABLE_PARAM_REVISION_WEB_BASE_URL ?? process.env.INLINE_WORK_PROMPT_WEB_BASE_URL).replace(/\/$/, "");
  const waitTimeoutMs = input.waitTimeoutMs ?? 45_000;
  const pdfReturnMode = input.pdfReturnMode ?? "goto";
  const cdpInputMode = input.cdpInputMode ?? "mouse";
  const plainRequestUrl = new URL("/request", `${baseUrl}/`).toString();
  const requestUrl = new URL("/request", `${baseUrl}/`);
  requestUrl.searchParams.set("autoPrepare", "1");
  requestUrl.searchParams.set("prompt", testCase.prompt);
  requestUrl.searchParams.set("editableParamRevisionSmoke", testCase.id);
  await clearRequestStorage(page, baseUrl, waitTimeoutMs);
  await page.goto(requestUrl.toString(), {
    waitUntil: "networkidle",
    timeout: waitTimeoutMs,
  });
  await installPageEvaluateNameHelper(page);
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: waitTimeoutMs });
  await page.getByTestId("request-estimate-items-editor").waitFor({ timeout: waitTimeoutMs });
  const initialBundle = await waitForBundle(page, (snapshot) => snapshot.boq_row_count > 0 && snapshot.item_row_count > 0, waitTimeoutMs);
  const initial = snapshotBundle(initialBundle);
  if (!initial.draft_id) throw new Error("initial_draft_id_missing");
  const draftId = initial.draft_id;
  const oldPdf = await createPdfAndReturnToRequest(page, plainRequestUrl, waitTimeoutMs, pdfReturnMode, draftId, cdpInputMode);

  await page.getByTestId("request-estimate-parameters-toggle").waitFor({ timeout: 25_000 });
  await page.getByTestId("request-estimate-parameters-toggle").click();
  await page.getByTestId("request-estimate-parameter-panel").waitFor({ timeout: 10_000 });
  await revealDerivedParameters(page);
  const edits = await collectBatchEdits(page, testCase);
  const paramKeys = edits.map((edit) => edit.paramKey);
  if (edits.length < 3) throw new Error("batch_three_params_missing");

  const cancelEdits = edits.map((edit, index) => ({ ...edit, rawValue: String(700 + index) }));
  await fillBatchEdits(page, cancelEdits);
  await page.getByTestId("editable-param-batch-bar").waitFor({ timeout: 10_000 });
  const cancelStorageBefore = snapshotBundle(await readLatestBundle(page, draftId));
  await pointerClickVisibleTestId(page, page.getByTestId("editable-param-batch-cancel").first(), "editable-param-batch-cancel", 20_000, cdpInputMode);
  await page.waitForTimeout(100);
  const cancelStorageAfter = snapshotBundle(await readLatestBundle(page, draftId));
  const valuesAfterCancel = await readDraftInputValues(page, edits);
  const cancel = {
    tested: true,
    active_revision_unchanged: cancelStorageAfter.current_revision_id === oldPdf.current_revision_id,
    positions_unchanged: cancelStorageAfter.item_row_count === oldPdf.item_row_count,
    storage_unchanged: JSON.stringify(cancelStorageBefore) === JSON.stringify(cancelStorageAfter),
    draft_values_reverted: edits.every((edit) => normalizeComparableValue(valuesAfterCancel[edit.paramKey]) === normalizeComparableValue(oldPdf.params[edit.paramKey])),
  };

  await fillBatchEdits(page, edits);
  await page.getByTestId("editable-param-batch-bar").waitFor({ timeout: 10_000 });
  const draftValues = await readDraftInputValues(page, edits);
  const beforeApplySnapshot = snapshotBundle(await readLatestBundle(page, draftId));
  const visibleLabelsBeforeApply = visibleLabelMap(await page.locator("body").textContent({ timeout: 10_000 }).catch(() => "") ?? "");
  const batchUiBeforeApply = {
    batch_bar_visible: await page.getByTestId("editable-param-batch-bar").count() > 0,
    batch_apply_visible: await page.getByTestId("editable-param-batch-apply").count() > 0,
    dirty_count_visible: await page.getByTestId("editable-param-batch-dirty-count").count() > 0,
  };
  const beforeApply = {
    active_revision_unchanged: beforeApplySnapshot.current_revision_id === oldPdf.current_revision_id,
    revision_count_unchanged: beforeApplySnapshot.revision_count === oldPdf.revision_count,
    positions_unchanged: beforeApplySnapshot.item_row_count === oldPdf.item_row_count,
    quantities_unchanged: beforeApplySnapshot.quantity_fingerprint === oldPdf.quantity_fingerprint,
    local_draft_values: draftValues,
  };

  await pointerClickVisibleTestId(page, page.getByTestId("editable-param-batch-apply").first(), "editable-param-batch-apply", 20_000, cdpInputMode);
  await page.getByTestId("request-estimate-parameter-apply-status").waitFor({ timeout: 20_000 }).catch(async (error) => {
    const debug = await readParamEditorDebug(page, edits, draftId, "after_apply_status_timeout");
    throw new Error(`APPLY_STATUS_TIMEOUT:${String(error instanceof Error ? error.message : error)}:${JSON.stringify(debug)}`);
  });
  const afterApplyBundle = await waitForBundle(page, (snapshot) =>
    snapshot.revision_count === oldPdf.revision_count + 1 &&
    snapshot.current_revision_id !== oldPdf.current_revision_id &&
    allApplied(snapshot, edits),
  waitTimeoutMs, draftId).catch(async (error) => {
    const debug = await readParamEditorDebug(page, edits, draftId, "after_apply_bundle_timeout");
    throw new Error(`AFTER_APPLY_WAIT_FAILED:${String(error instanceof Error ? error.message : error)}:${JSON.stringify(debug)}`);
  });
  const afterApplySnapshot = snapshotBundle(afterApplyBundle);
  await page.getByTestId("request-estimate-runtime-details-toggle").click();
  await page.getByTestId("estimate-revision-timeline-r2").waitFor({ timeout: 20_000 });
  await page.getByTestId("estimate-revision-diff").waitFor({ timeout: 20_000 });
  const changedParamKeys = new Set(afterApplySnapshot.latest_diff?.changed_params.map((param) => param.key) ?? []);
  const diffBeforeAfterValuesPresent = edits.every((edit) => {
    const changed = afterApplySnapshot.latest_diff?.changed_params.find((param) => param.key === edit.paramKey);
    return changed && changed.before !== changed.after && normalizeComparableValue(changed.after) === expectedValue(edit.rawValue);
  });
  const afterApply = {
    snapshot: afterApplySnapshot,
    single_revision_created: afterApplySnapshot.revision_count === oldPdf.revision_count + 1,
    one_batch_event_created: afterApplySnapshot.batch_events.length === oldPdf.batch_events.length + 1,
    batch_event_patch_count: Number(afterApplySnapshot.batch_events.at(-1)?.patchCount ?? NaN) || null,
    all_batch_values_applied: allApplied(afterApplySnapshot, edits),
    applied_params: Object.fromEntries(edits.map((edit) => [edit.paramKey, afterApplySnapshot.params[edit.paramKey]])),
    history_diff_contains_all_requested_params: edits.every((edit) => changedParamKeys.has(edit.paramKey)),
    history_diff_before_after_values_present: diffBeforeAfterValuesPresent,
    boq_not_empty: afterApplySnapshot.boq_row_count > 0,
    positions_stay_visible: afterApplySnapshot.item_row_count > 0,
    quantities_recalculated: afterApplySnapshot.quantity_fingerprint !== oldPdf.quantity_fingerprint &&
      Number(afterApplySnapshot.latest_diff?.changed_rows_count ?? 0) > 0,
    old_pdf_stale: afterApplySnapshot.archived_pdfs.some((pdf) => oldPdf.generated_pdfs.some((old) => old.id === pdf.id)),
  };

  await page.reload({ waitUntil: "domcontentloaded", timeout: waitTimeoutMs });
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: waitTimeoutMs });
  await page.getByTestId("request-estimate-items-editor").waitFor({ timeout: waitTimeoutMs });
  const reloadSnapshot = snapshotBundle(await readLatestBundle(page, draftId));
  const reload = {
    snapshot: reloadSnapshot,
    revision_persisted: reloadSnapshot.current_revision_id === afterApplySnapshot.current_revision_id,
    params_persisted: allApplied(reloadSnapshot, edits),
    positions_persisted: reloadSnapshot.item_row_count === afterApplySnapshot.item_row_count && reloadSnapshot.item_row_count > 0,
  };

  const newPdfSnapshot = await createPdfAndReturnToRequest(page, plainRequestUrl, waitTimeoutMs, pdfReturnMode, draftId, cdpInputMode);
  if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
    await page.getByTestId("request-estimate-parameters-toggle").click();
    await page.getByTestId("request-estimate-parameter-panel").waitFor({ timeout: 10_000 });
  }
  await revealDerivedParameters(page);
  if (await page.getByTestId("estimate-revision-diff").count() === 0) {
    await page.getByTestId("request-estimate-runtime-details-toggle").click();
    await page.getByTestId("estimate-revision-diff").waitFor({ timeout: 20_000 });
  }
  const newestGeneratedPdf = newPdfSnapshot.generated_pdfs[0] ?? null;
  const oldGeneratedPdf = oldPdf.generated_pdfs[0] ?? null;
  const newPdf = {
    snapshot: newPdfSnapshot,
    generated_for_latest_revision: Boolean(
      newestGeneratedPdf &&
      newestGeneratedPdf.id !== oldGeneratedPdf?.id &&
      newestGeneratedPdf.revisionId !== oldGeneratedPdf?.revisionId,
    ),
    old_pdf_remains_archived: Boolean(
      oldGeneratedPdf &&
      newPdfSnapshot.archived_pdfs.some((pdf) => pdf.id === oldGeneratedPdf.id),
    ),
  };

  const derivedEditorsVisible = (await Promise.all(
    MANDATORY_BATCH_EDITS
      .filter((edit) => edit.source === "derived")
      .map((edit) => page
        .locator(`[data-testid="editable-param-inline-editor-${edit.paramKey}"] [data-testid="editable-param-popover-input"]`)
        .count()),
  )).every((count) => count > 0);
  const ui = {
    revision_panel_visible: await page.getByTestId("request-estimate-parameter-panel").count() > 0,
    param_chip_visible: await page.getByTestId(`editable-param-chip-${paramKeys[0]}`).count() > 0,
    popover_visible: await page.getByTestId("editable-param-popover").count() >= edits.length,
    revision_diff_visible: await page.getByTestId("estimate-revision-diff").count() > 0,
    timeline_r2_visible: await page.getByTestId("estimate-revision-timeline-r2").count() > 0,
    artifact_status_visible: await page.getByTestId("estimate-revision-artifact-status").count() > 0 ||
      await page.getByTestId("request-estimate-parameter-apply-status").count() > 0,
    positions_visible: await page.getByTestId("request-estimate-items-editor").count() > 0,
    derived_editors_visible: derivedEditorsVisible,
    visible_russian_labels: visibleLabelsBeforeApply,
    ...batchUiBeforeApply,
  };

  const result: EditableParamRevisionSmokeCaseResult = {
    case_id: testCase.id,
    prompt: testCase.prompt,
    param_key: testCase.paramKey,
    param_keys: paramKeys,
    batch_size: edits.length,
    batch_payload: edits,
    passed: false,
    ui,
    proof: {
      initial,
      old_pdf: oldPdf,
      cancel,
      before_apply: beforeApply,
      after_apply: afterApply,
      reload,
      new_pdf: newPdf,
    },
    blocking_reasons: [],
  };
  result.blocking_reasons = validateResult(result);
  result.passed = result.blocking_reasons.length === 0;
  return result;
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const write = hasFlag("write-summary");
  const requestedCases = Math.max(1, Number(argValue("case-count", "100")) || 100);
  const baseUrl = String(process.env.EDITABLE_PARAM_REVISION_WEB_BASE_URL ?? process.env.INLINE_WORK_PROMPT_WEB_BASE_URL ?? "").replace(/\/$/, "");
  const cases = smokeCases(requestedCases);
  const summary: EditableParamRevisionWebSmokeSummary = {
    final_status: STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: EDITABLE_PARAM_REVISION_CASE_SET,
    corpus_fingerprint: fingerprint(cases),
    target: "web",
    require_real_browser: requireRealBrowser,
    actual_web_browser_editable_param_revision_passed: false,
    web_editable_revision_cases_passed: `0/${cases.length}`,
    web_revision_diff_visible_count: 0,
    web_template_lost_after_edit_count: 0,
    web_param_update_failures: 0,
    web_recalc_failures: 0,
    web_stale_pdf_failures: 0,
    web_stale_buyer_failures: 0,
    web_console_errors_count: 0,
    web_page_errors_count: 0,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    route_equivalent_used: false,
    env_flag_green: false,
    case_results: [],
    blockers: [],
  };

  if (requireRealBrowser && !baseUrl) {
    summary.blockers.push("EDITABLE_PARAM_REVISION_WEB_BASE_URL_missing");
    if (write) summary.runtime_summary_path = writeSummary(summary);
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  try {
    for (const testCase of cases) {
      try {
        const result = await runEditableParamRevisionPageCase(page, testCase);
        summary.case_results.push(result);
      } catch (error) {
        summary.case_results.push({
          case_id: testCase.id,
          prompt: testCase.prompt,
          param_key: testCase.paramKey,
          passed: false,
          ui: {
            revision_panel_visible: false,
            param_chip_visible: false,
            popover_visible: false,
            revision_diff_visible: false,
            timeline_r2_visible: false,
            artifact_status_visible: false,
          },
          blocking_reasons: [error instanceof Error ? error.message : String(error)],
        });
      }
    }
  } finally {
    await browser.close();
  }

  const passed = summary.case_results.filter((item) => item.passed).length;
  summary.web_editable_revision_cases_passed = `${passed}/${cases.length}`;
  summary.web_revision_diff_visible_count = summary.case_results.filter((item) => item.ui.revision_diff_visible).length;
  summary.web_param_update_failures = summary.case_results.filter((item) =>
    item.blocking_reasons.some((reason) => reason.includes("param_chip") || reason.includes("inline_editor") || reason.includes("derived_editors")),
  ).length;
  summary.web_recalc_failures = summary.case_results.filter((item) =>
    item.blocking_reasons.some((reason) => reason.includes("revision") || reason.includes("quantities_not_recalculated") || reason.includes("boq_empty")),
  ).length;
  summary.web_stale_pdf_failures = summary.case_results.filter((item) =>
    item.blocking_reasons.some((reason) => reason.includes("pdf")),
  ).length;
  summary.web_console_errors_count = consoleErrors.length;
  summary.web_page_errors_count = pageErrors.length;
  summary.blockers.push(
    ...summary.case_results.flatMap((item) => item.blocking_reasons.map((reason) => `${item.case_id}:${reason}`)).slice(0, 100),
    ...consoleErrors.slice(0, 20).map((error) => `console:${error}`),
    ...pageErrors.slice(0, 20).map((error) => `pageerror:${error}`),
  );
  const green = passed === cases.length && consoleErrors.length === 0 && pageErrors.length === 0 && cases.length === requestedCases;
  summary.actual_web_browser_editable_param_revision_passed = green;
  summary.final_status = green
    ? GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE
    : STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_WEB_BROWSER_SMOKE_FAILED;
  if (write) summary.runtime_summary_path = writeSummary(summary);
  console.log(JSON.stringify(summary, null, 2));
  if (!green) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
