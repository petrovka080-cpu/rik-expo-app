import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

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
import { buildConsumerRepairDraftFromAiEstimateRuntime } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  generateConsumerRepairRequestPdfForDraft,
  getConsumerRepairPdfStorageObject,
} from "../../src/lib/consumerRequests";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { extractEstimatePdfText, estimatePdfInputToBytes, validateEstimatePdf } from "../../src/lib/estimatePdf";
import { validateNoPdfMojibake } from "../../src/lib/estimatePdf/validateNoPdfMojibake";

export const AI_ESTIMATE_11610_PDF_VISUAL_PROOF_SCHEMA =
  "ai-estimate-11610-pdf-visual-proof-v1" as const;
export const GREEN_AI_ESTIMATE_11610_PDF_VISUAL_1000_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_PDF_VISUAL_1000_PASSED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_PDF_VISUAL_1000_BLOCKED_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_PDF_VISUAL_1000_BLOCKED_NO_RELEASE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-pdf-visual-proof");
const FULL_VISUAL_SAMPLE_COUNT = 1000;
const PDF_COLUMN_HEADERS = [
  "#",
  "\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435",
  "\u041a\u043e\u043b-\u0432\u043e",
  "\u0426\u0435\u043d\u0430",
  "\u0421\u0443\u043c\u043c\u0430",
  "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
] as const;

type PdfVisualLedgerRow = {
  schema: typeof AI_ESTIMATE_11610_PDF_VISUAL_PROOF_SCHEMA;
  case_id: string;
  template_id: string;
  prompt_hash: string;
  selected_work_key: string | null;
  draft_item_count: number;
  expected_row_count: number;
  pdf_bytes_length: number;
  pdf_page_count: number;
  pdf_rect_stroke_count: number;
  pdf_text_operator_count: number;
  pdf_view_model_section_count: number;
  pdf_view_model_row_count: number;
  table_header_columns_present: number;
  table_header_columns_total: number;
  visual_bordered_table: boolean;
  visual_row_grid: boolean;
  visual_metadata_block: boolean;
  visual_totals_block: boolean;
  visual_tax_source_block: boolean;
  visual_signature_block: boolean;
  pdf_binary_valid: boolean;
  pdf_text_extractable: boolean;
  pdf_cyrillic_readable: boolean;
  pdf_mojibake_found: boolean;
  pdf_bad_internal_token_count: number;
  pdf_revision_bound: boolean;
  pdf_rows_hash_bound: boolean;
  duration_ms: number;
  heap_used_mb: number;
  failure_codes: string[];
  passed: boolean;
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

function currentEstimateRevision(bundle: ReturnType<typeof createConsumerRepairRequestDraft>) {
  return bundle.estimateRevisionState ? getCurrentEstimateRevision(bundle.estimateRevisionState) : null;
}

function badInternalTokenCount(text: string): number {
  const matches = text.match(/\b(?:raw_ai_json|source_parameters|template_id|formula_id|normFactor|round_to)\b/gi);
  return matches?.length ?? 0;
}

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

type RenderedPdfVisualEvidence = {
  accepted: boolean;
  document_page_count?: number;
  png_bytes?: number;
  png_sha256?: string;
  text_item_count?: number;
  path_operator_count?: number;
  non_white_ratio?: number;
  horizontal_line_rows?: number;
  vertical_line_columns?: number;
  screenshot_path?: string;
  error?: string;
};

function renderPdfVisualEvidence(bytes: Uint8Array, evidenceId: string): RenderedPdfVisualEvidence {
  const evidenceDir = path.join(ROOT, "rendered", hashText(evidenceId).slice(0, 16));
  const pdfPath = path.resolve(evidenceDir, "source.pdf");
  const pngPath = path.resolve(evidenceDir, "page-1.png");
  const manifestPath = path.resolve(evidenceDir, "visual-evidence.json");
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(pdfPath, bytes);
  try {
    execFileSync(process.execPath, [
      path.resolve("scripts/e2e/renderPdfVisualEvidence.cjs"),
      pdfPath,
      pngPath,
      manifestPath,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
  } catch {
    // The helper writes a fail-closed manifest before returning a non-zero exit.
  }
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as RenderedPdfVisualEvidence;
  } catch (error) {
    return {
      accepted: false,
      error: `visual_manifest_unreadable:${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function selectIds(input: {
  allIds: string[];
  all?: boolean;
  limit?: number;
  startIndex?: number;
}): { ids: string[]; strategy: string } {
  const startIndex = Math.max(0, Math.floor(input.startIndex ?? 0));
  if (input.all) return { ids: input.allIds.slice(startIndex), strategy: "all_from_start_index" };
  const count = Math.max(0, Math.floor(input.limit ?? FULL_VISUAL_SAMPLE_COUNT));
  if (input.limit != null || startIndex > 0 || count !== FULL_VISUAL_SAMPLE_COUNT) {
    return {
      ids: input.allIds.slice(startIndex, startIndex + count),
      strategy: "contiguous_slice",
    };
  }
  return {
    ids: Array.from({ length: count }, (_, index) => {
      const sourceIndex = Math.floor(index * input.allIds.length / count);
      return input.allIds[sourceIndex];
    }),
    strategy: "evenly_spaced_1000",
  };
}

function visualEvidence(input: {
  pdfBody: string;
  pdfText: string;
  evidenceId: string;
  expectedRowCount: number;
  pdfViewModelRowCount: number;
  pdfViewModelSectionCount: number;
  requestMetaFieldCount: number;
}) {
  const bytes = estimatePdfInputToBytes(input.pdfBody);
  const rendered = renderPdfVisualEvidence(bytes, input.evidenceId);
  const rectStrokeCount = rendered.path_operator_count ?? countMatches(input.pdfBody, /\sre\s+S/g);
  const textOperatorCount = rendered.text_item_count ?? countMatches(input.pdfBody, />\s*Tj/g);
  const pageCount = rendered.document_page_count ?? countMatches(input.pdfBody, /\/Type\s*\/Page\b/g);
  const tableHeaderColumnsPresent = PDF_COLUMN_HEADERS.filter((header) => input.pdfText.includes(header)).length;
  const renderedGrid =
    rendered.accepted === true &&
    (rendered.horizontal_line_rows ?? 0) >= 2 &&
    (rendered.vertical_line_columns ?? 0) >= 2;
  return {
    pdfBytesLength: bytes.length,
    pageCount,
    rectStrokeCount,
    textOperatorCount,
    tableHeaderColumnsPresent,
    tableHeaderColumnsTotal: PDF_COLUMN_HEADERS.length,
    visualBorderedTable: renderedGrid,
    visualRowGrid:
      renderedGrid &&
      input.pdfViewModelRowCount === input.expectedRowCount &&
      input.pdfViewModelSectionCount > 0,
    visualMetadataBlock: input.requestMetaFieldCount >= 4 && input.pdfText.includes("\u0412\u0438\u0434 \u0440\u0430\u0431\u043e\u0442"),
    visualTotalsBlock:
      input.pdfText.includes("\u0418\u0442\u043e\u0433\u0438") &&
      input.pdfText.includes("\u041e\u0431\u0449\u0438\u0439 \u0438\u0442\u043e\u0433"),
    visualTaxSourceBlock:
      input.pdfText.includes("\u041d\u0430\u043b\u043e\u0433") &&
      input.pdfText.includes("\u0418\u0441\u0442\u043e\u0447\u043d"),
    visualSignatureBlock:
      input.pdfText.includes("\u0417\u0430\u043a\u0430\u0437\u0447\u0438\u043a") &&
      input.pdfText.includes("\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a"),
    rendered,
  };
}

function runPdfVisualCase(passport: ProfessionalWorkPassport): PdfVisualLedgerRow {
  const started = performance.now();
  const prompt = buildAiEstimate11610NaturalLanguagePromptForPassport(passport, "professional_full");
  try {
    __resetConsumerRepairRequestStoreForTests();
    const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      estimateDraftId: `pdf-visual-${passport.templateId}`,
      rawInput: prompt,
      city: "Bishkek",
      countryCode: "KG",
      currency: "KGS",
      createdAt: "2026-07-15T00:00:00.000Z",
    });
    if (!aiDraft) throw new Error("AI_DRAFT_NOT_CREATED");
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "ai-estimate-11610-pdf-visual-proof",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "pdf-visual-redacted-address",
      preferredTimeText: "today",
      contactPhone: "0700000000",
      selectedWork: aiDraft.selectedWork,
      aiDraft,
    });
    const generated = generateConsumerRepairRequestPdfForDraft({
      requestDraftId: draft.draft.id,
      userId: draft.draft.consumerUserId,
      generatedAt: "2026-07-15T00:00:01.000Z",
    });
    const pdf = generated.pdfs.find((item) => item.pdfStatus === "generated") ?? null;
    if (!pdf) throw new Error("PDF_RECORD_NOT_CREATED");
    const storage = getConsumerRepairPdfStorageObject({
      storageBucket: pdf.storageBucket,
      storageKey: pdf.storageKey,
    });
    if (!storage?.body) throw new Error("PDF_STORAGE_BODY_MISSING");
    const pdfViewModel = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: generated.draft,
      items: generated.items,
      media: generated.media,
      generatedAt: "2026-07-15T00:00:01.000Z",
    });
    if (!pdfViewModel) throw new Error("PDF_VIEW_MODEL_MISSING");
    const validation = validateEstimatePdf({
      pdf: storage.body,
      requiredText: [
        pdfViewModel.workTitle,
        pdfViewModel.sections[0]?.rows[0]?.name ?? passport.localizedNameRu,
      ],
    });
    const text = validation.text || extractEstimatePdfText(storage.body);
    const mojibake = validateNoPdfMojibake(text);
    const estimateRevision = currentEstimateRevision(generated);
    const pdfRowCount = pdfViewModel.sections.reduce((sum, section) => sum + section.rows.length, 0);
    const internalTokenCount = badInternalTokenCount(text);
    const visual = visualEvidence({
      pdfBody: storage.body,
      pdfText: text,
      evidenceId: `${passport.templateId}:${pdf.revisionId ?? "draft"}`,
      expectedRowCount: passport.boqRecipe.rowCount,
      pdfViewModelRowCount: pdfRowCount,
      pdfViewModelSectionCount: pdfViewModel.sections.length,
      requestMetaFieldCount: pdfViewModel.requestMetaFields.length,
    });
    const failureCodes = [
      generated.items.length === passport.boqRecipe.rowCount
        ? ""
        : `draft_item_count_mismatch:${generated.items.length}:${passport.boqRecipe.rowCount}`,
      pdfRowCount === generated.items.length ? "" : `pdf_view_model_row_count_mismatch:${pdfRowCount}:${generated.items.length}`,
      validation.details.binaryValid ? "" : "pdf_binary_header_missing",
      validation.details.eofPresent ? "" : "pdf_eof_missing",
      validation.details.textExtractable ? "" : "pdf_text_not_extractable",
      validation.details.cyrillicReadable ? "" : "pdf_cyrillic_not_readable",
      validation.details.mojibakeFound || !mojibake.passed ? `pdf_mojibake:${[...validation.failures, ...mojibake.failures].join("|")}` : "",
      internalTokenCount === 0 ? "" : `pdf_internal_tokens_visible:${internalTokenCount}`,
      pdf.revisionId && estimateRevision?.revision_id === pdf.revisionId ? "" : "pdf_revision_not_bound_to_current_revision",
      pdf.revisionRowsHash && estimateRevision?.rows_hash === pdf.revisionRowsHash ? "" : "pdf_rows_hash_not_bound",
      visual.pdfBytesLength > 1000 ? "" : `pdf_too_small:${visual.pdfBytesLength}`,
      visual.pageCount > 0 ? "" : "pdf_pages_missing",
      visual.textOperatorCount > 20 ? "" : `pdf_text_operator_count_low:${visual.textOperatorCount}`,
      visual.tableHeaderColumnsPresent === visual.tableHeaderColumnsTotal
        ? ""
        : `pdf_table_headers_missing:${visual.tableHeaderColumnsPresent}/${visual.tableHeaderColumnsTotal}`,
      visual.visualBorderedTable ? "" : `pdf_bordered_table_missing:${visual.rectStrokeCount}`,
      visual.visualRowGrid ? "" : "pdf_row_grid_missing",
      visual.visualMetadataBlock ? "" : "pdf_metadata_block_missing",
      visual.visualTotalsBlock ? "" : "pdf_totals_block_missing",
      visual.visualTaxSourceBlock ? "" : "pdf_tax_source_block_missing",
      visual.visualSignatureBlock ? "" : "pdf_signature_block_missing",
      visual.rendered.accepted ? "" : `pdf_rendered_screenshot_not_accepted:${visual.rendered.error ?? "visual_thresholds"}`,
    ].filter(Boolean);
    return {
      schema: AI_ESTIMATE_11610_PDF_VISUAL_PROOF_SCHEMA,
      case_id: `${passport.templateId}:pdf_visual`,
      template_id: passport.templateId,
      prompt_hash: hashText(prompt),
      selected_work_key: generated.draft.selectedWorkKey ?? null,
      draft_item_count: generated.items.length,
      expected_row_count: passport.boqRecipe.rowCount,
      pdf_bytes_length: visual.pdfBytesLength,
      pdf_page_count: visual.pageCount,
      pdf_rect_stroke_count: visual.rectStrokeCount,
      pdf_text_operator_count: visual.textOperatorCount,
      pdf_view_model_section_count: pdfViewModel.sections.length,
      pdf_view_model_row_count: pdfRowCount,
      table_header_columns_present: visual.tableHeaderColumnsPresent,
      table_header_columns_total: visual.tableHeaderColumnsTotal,
      visual_bordered_table: visual.visualBorderedTable,
      visual_row_grid: visual.visualRowGrid,
      visual_metadata_block: visual.visualMetadataBlock,
      visual_totals_block: visual.visualTotalsBlock,
      visual_tax_source_block: visual.visualTaxSourceBlock,
      visual_signature_block: visual.visualSignatureBlock,
      pdf_binary_valid: validation.details.binaryValid,
      pdf_text_extractable: validation.details.textExtractable,
      pdf_cyrillic_readable: validation.details.cyrillicReadable,
      pdf_mojibake_found: validation.details.mojibakeFound || !mojibake.passed,
      pdf_bad_internal_token_count: internalTokenCount,
      pdf_revision_bound: Boolean(pdf.revisionId && estimateRevision?.revision_id === pdf.revisionId),
      pdf_rows_hash_bound: Boolean(pdf.revisionRowsHash && estimateRevision?.rows_hash === pdf.revisionRowsHash),
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_codes: failureCodes,
      passed: failureCodes.length === 0,
    };
  } catch (error) {
    return {
      schema: AI_ESTIMATE_11610_PDF_VISUAL_PROOF_SCHEMA,
      case_id: `${passport.templateId}:pdf_visual`,
      template_id: passport.templateId,
      prompt_hash: hashText(prompt),
      selected_work_key: null,
      draft_item_count: 0,
      expected_row_count: passport.boqRecipe.rowCount,
      pdf_bytes_length: 0,
      pdf_page_count: 0,
      pdf_rect_stroke_count: 0,
      pdf_text_operator_count: 0,
      pdf_view_model_section_count: 0,
      pdf_view_model_row_count: 0,
      table_header_columns_present: 0,
      table_header_columns_total: PDF_COLUMN_HEADERS.length,
      visual_bordered_table: false,
      visual_row_grid: false,
      visual_metadata_block: false,
      visual_totals_block: false,
      visual_tax_source_block: false,
      visual_signature_block: false,
      pdf_binary_valid: false,
      pdf_text_extractable: false,
      pdf_cyrillic_readable: false,
      pdf_mojibake_found: false,
      pdf_bad_internal_token_count: 0,
      pdf_revision_bound: false,
      pdf_rows_hash_bound: false,
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_codes: [`exception:${error instanceof Error ? error.message : String(error)}`],
      passed: false,
    };
  }
}

export function runAiEstimate11610PdfVisualProof(input: {
  all?: boolean;
  limit?: number;
  startIndex?: number;
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  const allIds = listProfessionalWorkPassportTemplateIds();
  const startIndex = Math.max(0, Math.floor(input.startIndex ?? 0));
  const selection = selectIds({
    allIds,
    all: input.all,
    limit: input.limit,
    startIndex,
  });
  const selectedIds = selection.ids;
  const runId = timestampForPath();
  const outDir = input.writeSummary || input.writeLedger ? path.join(ROOT, runId) : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8" }) : null;
  const ledgerHasher = createHash("sha256");
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const failureSamples: PdfVisualLedgerRow[] = [];
  const rows: PdfVisualLedgerRow[] = [];
  let maxHeapUsedMb = 0;
  for (const [index, templateId] of selectedIds.entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) {
      const row: PdfVisualLedgerRow = {
        schema: AI_ESTIMATE_11610_PDF_VISUAL_PROOF_SCHEMA,
        case_id: `${templateId}:pdf_visual`,
        template_id: templateId,
        prompt_hash: "passport_missing",
        selected_work_key: null,
        draft_item_count: 0,
        expected_row_count: 0,
        pdf_bytes_length: 0,
        pdf_page_count: 0,
        pdf_rect_stroke_count: 0,
        pdf_text_operator_count: 0,
        pdf_view_model_section_count: 0,
        pdf_view_model_row_count: 0,
        table_header_columns_present: 0,
        table_header_columns_total: PDF_COLUMN_HEADERS.length,
        visual_bordered_table: false,
        visual_row_grid: false,
        visual_metadata_block: false,
        visual_totals_block: false,
        visual_tax_source_block: false,
        visual_signature_block: false,
        pdf_binary_valid: false,
        pdf_text_extractable: false,
        pdf_cyrillic_readable: false,
        pdf_mojibake_found: false,
        pdf_bad_internal_token_count: 0,
        pdf_revision_bound: false,
        pdf_rows_hash_bound: false,
        duration_ms: 0,
        heap_used_mb: heapUsedMb(),
        failure_codes: ["passport_missing"],
        passed: false,
      };
      rows.push(row);
      const serializedRow = JSON.stringify(row);
      ledgerHasher.update(`${serializedRow}\n`);
      ledgerStream?.write(`${serializedRow}\n`);
      failureSamples.push(row);
      continue;
    }
    const row = runPdfVisualCase(passport);
    rows.push(row);
    const serializedRow = JSON.stringify(row);
    ledgerHasher.update(`${serializedRow}\n`);
    ledgerStream?.write(`${serializedRow}\n`);
    maxHeapUsedMb = Math.max(maxHeapUsedMb, row.heap_used_mb);
    if (!row.passed && failureSamples.length < 50) failureSamples.push(row);
    console.info(JSON.stringify({
      case_id: row.case_id,
      passed: row.passed,
      blockers_count: row.failure_codes.length,
      cases_done: index + 1,
      cases_total: selectedIds.length,
    }));
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  ledgerStream?.end();
  clearProfessionalWorkPassportBuildCaches();
  __resetConsumerRepairRequestStoreForTests();
  const passed = rows.filter((row) => row.passed).length;
  const fullVisualRequested =
    input.all !== true &&
    startIndex === 0 &&
    selectedIds.length === FULL_VISUAL_SAMPLE_COUNT &&
    selection.strategy === "evenly_spaced_1000";
  const visualPassed = fullVisualRequested && passed === FULL_VISUAL_SAMPLE_COUNT;
  const sourceTreeStatus = gitOutput(["status", "--porcelain"]);
  const summary = {
    run_id: runId,
    schema: AI_ESTIMATE_11610_PDF_VISUAL_PROOF_SCHEMA,
    final_status: visualPassed
      ? GREEN_AI_ESTIMATE_11610_PDF_VISUAL_1000_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_PDF_VISUAL_1000_BLOCKED_NO_RELEASE,
    pdf_visual_status: visualPassed
      ? GREEN_AI_ESTIMATE_11610_PDF_VISUAL_1000_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_PDF_VISUAL_1000_BLOCKED_NO_RELEASE,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    duration_ms: Math.round((performance.now() - started) * 100) / 100,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    source_tree_clean: sourceTreeStatus.length === 0,
    source_tree_status: sourceTreeStatus,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    corpus_hash: hashText(JSON.stringify({ selected_template_ids: selectedIds, start_index: startIndex, strategy: selection.strategy })),
    ledger_sha256: ledgerHasher.digest("hex"),
    catalog_total_expected: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    template_ids_total: allIds.length,
    selected_templates: selectedIds.length,
    selection_strategy: selection.strategy,
    start_index: startIndex,
    cases_completed: rows.length,
    cases_passed: passed,
    cases_failed: rows.length - passed,
    full_1000_pdf_visual_completed: rows.length === FULL_VISUAL_SAMPLE_COUNT && fullVisualRequested,
    full_1000_pdf_visual_passed: visualPassed,
    limited_smoke_only: !fullVisualRequested,
    max_heap_used_mb: Math.round(maxHeapUsedMb * 100) / 100,
    retained_failure_samples_count: failureSamples.length,
    failure_samples: failureSamples,
    summary_path: summaryPath,
    ledger_path: ledgerPath,
    fake_green_claimed: false,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary };
}

if (require.main === module) {
  const result = runAiEstimate11610PdfVisualProof({
    all: hasFlag("all"),
    limit: numericArg("limit") ?? undefined,
    startIndex: numericArg("start-index") ?? undefined,
    writeSummary: hasFlag("write-summary") || hasFlag("json") || hasFlag("all"),
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    pdf_visual_status: result.summary.pdf_visual_status,
    selected_templates: result.summary.selected_templates,
    selection_strategy: result.summary.selection_strategy,
    cases_completed: result.summary.cases_completed,
    cases_passed: result.summary.cases_passed,
    cases_failed: result.summary.cases_failed,
    full_1000_pdf_visual_passed: result.summary.full_1000_pdf_visual_passed,
    limited_smoke_only: result.summary.limited_smoke_only,
    failure_samples: result.summary.failure_samples.slice(0, 5),
    summary_path: result.summary.summary_path,
    ledger_path: result.summary.ledger_path,
  }, null, 2));
  if (result.summary.cases_failed > 0) process.exitCode = 1;
}
