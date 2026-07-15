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
import { extractEstimatePdfText, validateEstimatePdf } from "../../src/lib/estimatePdf";
import { validateNoPdfMojibake } from "../../src/lib/estimatePdf/validateNoPdfMojibake";

export const AI_ESTIMATE_11610_PDF_SEMANTIC_PROOF_SCHEMA =
  "ai-estimate-11610-pdf-semantic-proof-v1" as const;
export const GREEN_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_PASSED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_BLOCKED_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_BLOCKED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PASSED_VISUAL_1000_ANDROID_OPEN_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PASSED_VISUAL_1000_ANDROID_OPEN_NO_RELEASE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-pdf-semantic-proof");

type PdfLedgerRow = {
  schema: typeof AI_ESTIMATE_11610_PDF_SEMANTIC_PROOF_SCHEMA;
  case_id: string;
  template_id: string;
  prompt_hash: string;
  selected_work_key: string | null;
  draft_item_count: number;
  expected_row_count: number;
  pdf_section_count: number;
  pdf_view_model_row_count: number;
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

function runPdfCase(passport: ProfessionalWorkPassport): PdfLedgerRow {
  const started = performance.now();
  const prompt = buildAiEstimate11610NaturalLanguagePromptForPassport(passport, "professional_full");
  try {
    __resetConsumerRepairRequestStoreForTests();
    const aiDraft = buildConsumerRepairDraftFromAiEstimateRuntime({
      estimateDraftId: `pdf-semantic-${passport.templateId}`,
      rawInput: prompt,
      city: "Bishkek",
      countryCode: "KG",
      currency: "KGS",
      createdAt: "2026-07-15T00:00:00.000Z",
    });
    if (!aiDraft) throw new Error("AI_DRAFT_NOT_CREATED");
    const draft = createConsumerRepairRequestDraft({
      consumerUserId: "ai-estimate-11610-pdf-semantic-proof",
      problemText: prompt,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "pdf-semantic-redacted-address",
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
    const validation = validateEstimatePdf({
      pdf: storage.body,
      requiredText: [pdfViewModel?.workTitle ?? generated.draft.title ?? passport.localizedNameRu],
    });
    const text = validation.text || extractEstimatePdfText(storage.body);
    const mojibake = validateNoPdfMojibake(text);
    const estimateRevision = currentEstimateRevision(generated);
    const pdfRowCount = pdfViewModel?.sections.reduce((sum, section) => sum + section.rows.length, 0) ?? 0;
    const internalTokenCount = badInternalTokenCount(text);
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
    ].filter(Boolean);
    return {
      schema: AI_ESTIMATE_11610_PDF_SEMANTIC_PROOF_SCHEMA,
      case_id: `${passport.templateId}:pdf_semantic`,
      template_id: passport.templateId,
      prompt_hash: hashText(prompt),
      selected_work_key: generated.draft.selectedWorkKey ?? null,
      draft_item_count: generated.items.length,
      expected_row_count: passport.boqRecipe.rowCount,
      pdf_section_count: pdfViewModel?.sections.length ?? 0,
      pdf_view_model_row_count: pdfRowCount,
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
      schema: AI_ESTIMATE_11610_PDF_SEMANTIC_PROOF_SCHEMA,
      case_id: `${passport.templateId}:pdf_semantic`,
      template_id: passport.templateId,
      prompt_hash: hashText(prompt),
      selected_work_key: null,
      draft_item_count: 0,
      expected_row_count: passport.boqRecipe.rowCount,
      pdf_section_count: 0,
      pdf_view_model_row_count: 0,
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

export function runAiEstimate11610PdfSemanticProof(input: {
  all?: boolean;
  limit?: number;
  startIndex?: number;
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  const allIds = listProfessionalWorkPassportTemplateIds();
  const startIndex = Math.max(0, Math.floor(input.startIndex ?? 0));
  const selectedIds = input.all
    ? allIds.slice(startIndex)
    : allIds.slice(startIndex, startIndex + Math.max(0, Math.floor(input.limit ?? 10)));
  const runId = timestampForPath();
  const outDir = input.writeSummary || input.writeLedger ? path.join(ROOT, runId) : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8" }) : null;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const failureSamples: PdfLedgerRow[] = [];
  const rows: PdfLedgerRow[] = [];
  let maxHeapUsedMb = 0;
  for (const [index, templateId] of selectedIds.entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) continue;
    const row = runPdfCase(passport);
    rows.push(row);
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
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  ledgerStream?.end();
  clearProfessionalWorkPassportBuildCaches();
  __resetConsumerRepairRequestStoreForTests();
  const passed = rows.filter((row) => row.passed).length;
  const fullRunRequested = input.all === true && startIndex === 0 && selectedIds.length === PROFESSIONAL_WORK_PASSPORT_TOTAL;
  const semanticPassed = fullRunRequested && passed === PROFESSIONAL_WORK_PASSPORT_TOTAL;
  const sourceTreeStatus = gitOutput(["status", "--porcelain"]);
  const ledgerBody = `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const summary = {
    run_id: runId,
    schema: AI_ESTIMATE_11610_PDF_SEMANTIC_PROOF_SCHEMA,
    final_status: semanticPassed
      ? STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PASSED_VISUAL_1000_ANDROID_OPEN_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_BLOCKED_NO_RELEASE,
    pdf_semantic_status: semanticPassed
      ? GREEN_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_PDF_SEMANTIC_PARITY_BLOCKED_NO_RELEASE,
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
    corpus_hash: hashText(JSON.stringify({ selected_template_ids: selectedIds, start_index: startIndex })),
    ledger_sha256: hashText(ledgerBody),
    catalog_total_expected: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    template_ids_total: allIds.length,
    selected_templates: selectedIds.length,
    start_index: startIndex,
    cases_completed: rows.length,
    cases_passed: passed,
    cases_failed: rows.length - passed,
    full_11610_pdf_semantic_completed: rows.length === PROFESSIONAL_WORK_PASSPORT_TOTAL,
    full_11610_pdf_semantic_passed: semanticPassed,
    pdf_visual_render_sample_count: 0,
    pdf_visual_render_1000_passed: false,
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
  const result = runAiEstimate11610PdfSemanticProof({
    all: hasFlag("all"),
    limit: numericArg("limit") ?? undefined,
    startIndex: numericArg("start-index") ?? undefined,
    writeSummary: hasFlag("write-summary") || hasFlag("json") || hasFlag("all"),
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    pdf_semantic_status: result.summary.pdf_semantic_status,
    selected_templates: result.summary.selected_templates,
    cases_completed: result.summary.cases_completed,
    cases_passed: result.summary.cases_passed,
    cases_failed: result.summary.cases_failed,
    full_11610_pdf_semantic_passed: result.summary.full_11610_pdf_semantic_passed,
    pdf_visual_render_1000_passed: result.summary.pdf_visual_render_1000_passed,
    limited_smoke_only: result.summary.limited_smoke_only,
    failure_samples: result.summary.failure_samples.slice(0, 5),
    summary_path: result.summary.summary_path,
    ledger_path: result.summary.ledger_path,
  }, null, 2));
  if (result.summary.cases_failed > 0) process.exitCode = 1;
}
