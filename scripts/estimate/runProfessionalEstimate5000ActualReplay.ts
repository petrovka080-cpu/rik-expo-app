import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi, type BuiltInAiAnswer } from "../../src/lib/ai/builtInAi";
import { validateConstructionUnitSemantics } from "../../src/lib/ai/constructionFormulas/validateConstructionUnitSemantics";
import {
  createEditableEstimateSnapshot,
  type EditableEstimateRow,
  type EditableEstimateRowType,
} from "../../src/lib/ai/editableEstimate";
import { buildEstimatePresentationViewModel, validateNoMojibakeInEstimateViewModel } from "../../src/lib/ai/estimatePresentation";
import { createEstimateRevisionState, getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";
import { resolveEstimatorOutcome } from "../../src/lib/ai/estimatorKernel";
import type {
  GlobalEstimateResult,
  GlobalEstimateSectionType,
  SourceBackedEstimateRow,
} from "../../src/lib/ai/globalEstimate";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE } from "../../src/lib/estimate/professionalEstimate5000CorpusContract";
import {
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_BLOCKED_STATUS,
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD,
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA,
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARD_PASSED_STATUS,
  PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL,
  getProfessionalEstimate5000ReplayShardPrompts,
  planProfessionalEstimate5000ReplayShards,
  type ProfessionalEstimate5000ReplayPrompt,
  type ProfessionalEstimate5000ReplayShardPlan,
} from "../../src/lib/estimate/professionalEstimate5000ReplayContract";
import { createEstimatePdf } from "../../src/lib/estimatePdf";
import type { ProfessionalEstimateRiskBlockerClass } from "../../src/lib/estimate/professionalEstimateRiskAuditContract";

const FIXTURE_DIR = path.join(process.cwd(), "tests", "fixtures", "aiPromptPacks");
const RUNTIME_ROOT = path.join(
  ".release-runtime",
  "ai-estimate-11610-risk-audit-5000-remediation",
  "5000-actual-replay",
);
const GENERATED_AT = "2026-07-14T00:00:00.000Z";

type ReplayRoute = "/request" | "/ai?context=foreman" | "/ai?context=request";

type ReplayRowSnapshot = {
  row_code: string;
  row_name: string;
  section_type: GlobalEstimateSectionType;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  currency: string;
  price_status: SourceBackedEstimateRow["priceStatus"];
  source_evidence_count: number;
};

type ReplayPriceState = ReplayRowSnapshot & {
  source_id: string;
  source_evidence_ids: readonly string[];
};

type ReplayRiskFinding = {
  code: string;
  severity: "P0" | "P1" | "P2";
  blocker_class: ProfessionalEstimateRiskBlockerClass;
  status: "OPEN";
  message: string;
};

export type ProfessionalEstimate5000ActualReplayCaseResult = {
  schema: typeof PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA;
  case_id: string;
  shard_id: number;
  case_index: number;
  route: ReplayRoute;
  domain: string;
  prompt: string;
  selected_work: {
    work_key: string | null;
    title: string | null;
    category: string | null;
  };
  extracted_facts: {
    prompt_hash: string;
    classification: string;
    parsable_work_detected: boolean;
    regulated_work_detected: boolean;
    template_exact_match: boolean;
    semantic_frame: Record<string, unknown> | null;
  };
  parameters: Record<string, unknown>;
  missing_inputs: readonly string[];
  materials: readonly ReplayRowSnapshot[];
  works: readonly ReplayRowSnapshot[];
  services: readonly ReplayRowSnapshot[];
  equipment: readonly ReplayRowSnapshot[];
  quantities: readonly {
    row_code: string;
    quantity: number;
    unit: string;
    display_quantity: string;
  }[];
  units: readonly string[];
  price_states: readonly ReplayPriceState[];
  totals: GlobalEstimateResult["totals"] | null;
  runtime_payload_hash: string | null;
  ui_payload_hash: string | null;
  revision_hash: string | null;
  revision_rows_hash: string | null;
  revision_totals_hash: string | null;
  pdf_payload_hash: string | null;
  risk_findings: readonly ReplayRiskFinding[];
  failure_codes: readonly string[];
  passed: boolean;
};

export type ProfessionalEstimate5000ActualReplayShardCheckpoint = {
  schema: typeof PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA;
  run_id: string;
  generated_at: string;
  shard: ProfessionalEstimate5000ReplayShardPlan;
  cases_total: number;
  cases_completed: number;
  cases_passed: number;
  cases_failed: number;
  final_status:
    | typeof PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_BLOCKED_STATUS
    | typeof PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARD_PASSED_STATUS;
  case_results: readonly ProfessionalEstimate5000ActualReplayCaseResult[];
  checkpoint_hash: string;
  full_5000_green_claimed: false;
  fake_green_claimed: false;
  release_started: false;
  deploy_started: false;
  eas_started: false;
  native_build_started: false;
  production_db_touched: false;
  main_changed: false;
  pr44_changed: false;
};

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function routeFor(index: number): ReplayRoute {
  if (index % 3 === 1) return "/ai?context=foreman";
  if (index % 3 === 2) return "/ai?context=request";
  return "/request";
}

function contextFor(route: ReplayRoute): "request" | "foreman" {
  return route.includes("foreman") ? "foreman" : "request";
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.filter(Boolean))].sort());
}

function rowSnapshot(sectionType: GlobalEstimateSectionType, row: SourceBackedEstimateRow): ReplayRowSnapshot {
  return {
    row_code: row.code,
    row_name: row.name,
    section_type: sectionType,
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unitPrice,
    total: row.total,
    currency: row.currency,
    price_status: row.priceStatus,
    source_evidence_count: row.sourceEvidence.length,
  };
}

function rowSnapshotsFor(estimate: GlobalEstimateResult, sectionTypes: readonly GlobalEstimateSectionType[]): ReplayRowSnapshot[] {
  return estimate.sections
    .filter((section) => sectionTypes.includes(section.type))
    .flatMap((section) => section.rows.map((row) => rowSnapshot(section.type, row)));
}

function allRows(
  estimate: GlobalEstimateResult,
): { sectionType: GlobalEstimateSectionType; row: SourceBackedEstimateRow }[] {
  return estimate.sections.flatMap((section) => section.rows.map((row) => ({ sectionType: section.type, row })));
}

function rowTypeFromSection(sectionType: GlobalEstimateSectionType): EditableEstimateRowType {
  if (sectionType === "materials") return "material";
  if (sectionType === "delivery") return "service";
  if (sectionType === "tax") return "other";
  return "work";
}

function priceStatusFor(row: SourceBackedEstimateRow): EditableEstimateRow["priceStatus"] {
  if (row.priceStatus === "unavailable") return "PRICE_MISSING";
  if (row.priceStatus === "manual_fallback") return "USER_CONFIRMED_MARKET_PRICE";
  if (row.priceStatus === "stale_fallback") return "REFERENCE_PRICE_ESTIMATE";
  return "REFERENCE_PRICE_ESTIMATE";
}

function priceSourceFor(row: SourceBackedEstimateRow): EditableEstimateRow["priceSource"] {
  if (row.priceStatus === "unavailable") return "missing";
  if (row.priceStatus === "manual_fallback") return "user";
  return "reference_price_book";
}

function editableRowsFromEstimate(estimate: GlobalEstimateResult): EditableEstimateRow[] {
  return allRows(estimate).map(({ sectionType, row }, index) => ({
    rowId: `replay:${estimate.estimateId}:${row.code}:${index}`,
    requestItemId: row.code,
    rowType: rowTypeFromSection(sectionType),
    titleRu: row.name,
    quantity: row.quantity,
    unit: row.unit,
    unitLabel: row.unit,
    unitPrice: row.unitPrice,
    totalPrice: row.total,
    currency: row.currency,
    rowSource: "professional_estimate_5000_actual_replay",
    materialKey: row.materialKey ?? null,
    rateKey: row.rateKey ?? null,
    category: estimate.work.category,
    sourceId: row.sourceId,
    sourceLabel: row.sourceEvidence[0]?.label ?? row.sourceId,
    formulaId: row.formulaId ?? null,
    quantityFormula: row.quantityFormula ?? null,
    calculationTrace: row.calculationTrace ?? null,
    sourceParameters: row.sourceParameters ?? null,
    templateId: row.templateId ?? null,
    templateVersion: row.templateVersion ?? null,
    normId: row.normId ?? null,
    normFamilyId: row.normFamilyId ?? null,
    normSourceId: row.normSourceId ?? null,
    normSourceTitle: row.normSourceTitle ?? null,
    normVersion: row.normVersion ?? null,
    normReviewStatus: row.normReviewStatus ?? null,
    confidence: row.confidence,
    addedBy: "ai",
    editableByConsumer: row.editable !== false,
    quantitySource: "estimate",
    priceStatus: priceStatusFor(row),
    priceSource: priceSourceFor(row),
    priceSourceId: row.sourceId,
    priceSourceLabel: row.sourceEvidence[0]?.label ?? row.sourceId,
    manualPrice: null,
    removed: row.deletedByUser === true,
  }));
}

function createRevisionProof(estimate: GlobalEstimateResult): {
  revision_hash: string;
  revision_rows_hash: string;
  revision_totals_hash: string;
} {
  const snapshot = createEditableEstimateSnapshot({
    snapshotId: `professional-estimate-5000-replay-snapshot:${estimate.estimateId}`,
    requestDraftId: `professional-estimate-5000-replay-request:${estimate.estimateId}`,
    sourceEstimateId: estimate.estimateId,
    workKey: estimate.work.workKey,
    currency: estimate.totals.currency,
    rows: editableRowsFromEstimate(estimate),
    createdAt: GENERATED_AT,
  });
  const state = createEstimateRevisionState({
    estimate_id: estimate.estimateId,
    request_id: `professional-estimate-5000-replay-request:${estimate.estimateId}`,
    selected_work_key: estimate.work.workKey,
    region: estimate.locale.countryCode,
    currency: "KGS",
    editable_estimate_snapshot: snapshot,
    created_by: "ai",
    created_at: GENERATED_AT,
    source: "AI_GENERATED",
    status: "DRAFT",
  });
  const current = getCurrentEstimateRevision(state);
  return {
    revision_hash: current.full_snapshot_hash,
    revision_rows_hash: current.rows_hash,
    revision_totals_hash: current.totals_hash,
  };
}

function sha256Bytes(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function riskFinding(
  code: string,
  message: string,
  blockerClass: ProfessionalEstimateRiskBlockerClass = "INTERNAL_CODE",
  severity: "P0" | "P1" | "P2" = "P1",
): ReplayRiskFinding {
  return {
    code,
    severity,
    blocker_class: blockerClass,
    status: "OPEN",
    message,
  };
}

function exceptionMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sourceEvidenceIds(row: SourceBackedEstimateRow): readonly string[] {
  return Object.freeze(row.sourceEvidence.map((evidence) => evidence.sourceId));
}

function buildPriceStates(estimate: GlobalEstimateResult): ReplayPriceState[] {
  return allRows(estimate).map(({ sectionType, row }) => ({
    ...rowSnapshot(sectionType, row),
    source_id: row.sourceId,
    source_evidence_ids: sourceEvidenceIds(row),
  }));
}

function buildRuntimeRiskFindings(input: {
  outcomeFailures: readonly string[];
  answer: BuiltInAiAnswer | null;
  estimate: GlobalEstimateResult | null;
  pdfError: string | null;
  revisionError: string | null;
  uiMojibakePassed: boolean | null;
  unitSemanticsPassed: boolean | null;
}): ReplayRiskFinding[] {
  const findings: ReplayRiskFinding[] = [];
  for (const failure of input.outcomeFailures) {
    findings.push(riskFinding(failure, `Estimator resolver reported ${failure}.`, "INTERNAL_MAPPING"));
  }
  if (!input.answer) {
    findings.push(riskFinding("BUILT_IN_AI_RUNTIME_EXCEPTION", "Built-in AI runtime did not return an answer.", "INTERNAL_CODE", "P0"));
    return findings;
  }
  if (input.answer.route.intent !== "estimate") {
    findings.push(riskFinding("ESTIMATE_INTENT_LOST", `Detected ${input.answer.route.intent}.`, "INTERNAL_MAPPING", "P0"));
  }
  if (input.answer.toolResult.toolName !== "calculate_global_estimate") {
    findings.push(riskFinding(
      "CALCULATE_GLOBAL_ESTIMATE_NOT_SELECTED",
      `Selected ${input.answer.toolResult.toolName ?? "none"}.`,
      "INTERNAL_CODE",
      "P0",
    ));
  }
  if (!input.estimate) {
    findings.push(riskFinding("GLOBAL_ESTIMATE_RESULT_MISSING", "Runtime did not produce structured estimate.", "INTERNAL_CODE", "P0"));
    return findings;
  }
  const rows = allRows(input.estimate).map((entry) => entry.row);
  const materialRows = rowSnapshotsFor(input.estimate, ["materials"]);
  const workRows = rowSnapshotsFor(input.estimate, ["labor", "equipment"]);
  if (rows.length === 0) findings.push(riskFinding("EMPTY_ESTIMATE", "Estimate has no BOQ rows.", "INTERNAL_DATA", "P0"));
  if (materialRows.length === 0) findings.push(riskFinding("MATERIALS_SECTION_MISSING", "Estimate has no material rows.", "INTERNAL_DATA"));
  if (workRows.length === 0) findings.push(riskFinding("WORKS_SECTION_MISSING", "Estimate has no labor/equipment rows.", "INTERNAL_DATA"));
  if (rows.some((row) => row.sourceEvidence.length === 0)) {
    findings.push(riskFinding("SOURCE_EVIDENCE_MISSING", "At least one priced row has no source evidence.", "INTERNAL_SOURCE_INGESTION"));
  }
  if (rows.some((row) => row.priceStatus === "unavailable")) {
    findings.push(riskFinding("PRICE_STATE_UNAVAILABLE", "At least one row is unavailable.", "INTERNAL_SOURCE_INGESTION"));
  }
  if (typeof input.estimate.totals.grandTotal !== "number" || input.estimate.totals.grandTotal <= 0) {
    findings.push(riskFinding("TOTALS_INVALID", "Grand total is missing or non-positive.", "INTERNAL_CODE", "P0"));
  }
  if (input.uiMojibakePassed === false) {
    findings.push(riskFinding("UI_MOJIBAKE_FOUND", "Presentation view model contains mojibake.", "INTERNAL_CODE"));
  }
  if (input.unitSemanticsPassed === false) {
    findings.push(riskFinding("UNIT_SEMANTICS_FAILED", "Construction unit semantic validator failed.", "INTERNAL_MAPPING"));
  }
  if (input.revisionError) {
    findings.push(riskFinding("REVISION_PAYLOAD_FAILED", input.revisionError, "INTERNAL_CODE", "P0"));
  }
  if (input.pdfError) {
    findings.push(riskFinding("PDF_PAYLOAD_FAILED", input.pdfError, "INTERNAL_CODE", "P0"));
  }
  return findings;
}

export function readProfessionalEstimate5000ReplayPrompts(): readonly ProfessionalEstimate5000ReplayPrompt[] {
  const fixturePath = path.join(FIXTURE_DIR, PROFESSIONAL_ESTIMATE_5000_CORPUS_SOURCE.fixture_file_name);
  return Object.freeze(readJson<ProfessionalEstimate5000ReplayPrompt[]>(fixturePath));
}

export function evaluateProfessionalEstimate5000ReplayCase(input: {
  prompt: ProfessionalEstimate5000ReplayPrompt;
  shardId: number;
  caseIndex: number;
  globalIndex: number;
}): ProfessionalEstimate5000ActualReplayCaseResult {
  const route = routeFor(input.globalIndex);
  const outcome = resolveEstimatorOutcome({ text: input.prompt.prompt, currency: "KGS" });
  let answer: BuiltInAiAnswer | null = null;
  let runtimeError: string | null = null;
  try {
    answer = answerBuiltInAi({
      text: input.prompt.prompt,
      route,
      screenContext: contextFor(route),
      role: contextFor(route),
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
  } catch (error) {
    runtimeError = exceptionMessage(error);
  }

  const estimate = answer?.toolResult.estimate ?? null;
  let uiPayloadHash: string | null = null;
  let uiMojibakePassed: boolean | null = null;
  let unitSemanticsPassed: boolean | null = null;
  let revisionHash: string | null = null;
  let revisionRowsHash: string | null = null;
  let revisionTotalsHash: string | null = null;
  let revisionError: string | null = null;
  let pdfPayloadHash: string | null = null;
  let pdfError: string | null = null;

  if (estimate) {
    try {
      const viewModel = buildEstimatePresentationViewModel(estimate);
      uiPayloadHash = estimateDeterministicHash(viewModel);
      uiMojibakePassed = validateNoMojibakeInEstimateViewModel(viewModel).passed;
      unitSemanticsPassed = validateConstructionUnitSemantics(estimate).passed;
    } catch (error) {
      revisionError = `UI_PAYLOAD_FAILED:${exceptionMessage(error)}`;
    }
    try {
      const revision = createRevisionProof(estimate);
      revisionHash = revision.revision_hash;
      revisionRowsHash = revision.revision_rows_hash;
      revisionTotalsHash = revision.revision_totals_hash;
    } catch (error) {
      revisionError = exceptionMessage(error);
    }
    try {
      const pdf = createEstimatePdf({
        estimate,
        runtimeTrace: answer?.runtimeTrace,
        generatedAt: GENERATED_AT,
        language: "ru",
      });
      pdfPayloadHash = sha256Bytes(pdf.bytes);
    } catch (error) {
      pdfError = exceptionMessage(error);
    }
  }

  const riskFindings = buildRuntimeRiskFindings({
    outcomeFailures: runtimeError ? [...outcome.failures, runtimeError] : outcome.failures,
    answer,
    estimate,
    pdfError,
    revisionError,
    uiMojibakePassed,
    unitSemanticsPassed,
  });
  const rows = estimate ? allRows(estimate) : [];
  const failureCodes = uniqueStrings(riskFindings.map((finding) => finding.code));

  return Object.freeze({
    schema: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA,
    case_id: input.prompt.id,
    shard_id: input.shardId,
    case_index: input.caseIndex,
    route,
    domain: input.prompt.domain,
    prompt: input.prompt.prompt,
    selected_work: {
      work_key: estimate?.work.workKey ?? outcome.plan?.workKey ?? null,
      title: estimate?.work.title ?? outcome.plan?.titleRu ?? null,
      category: estimate?.work.category ?? outcome.plan?.category ?? null,
    },
    extracted_facts: {
      prompt_hash: estimateDeterministicHash(input.prompt.prompt),
      classification: outcome.classification,
      parsable_work_detected: outcome.parsableWorkDetected,
      regulated_work_detected: outcome.regulatedWorkDetected,
      template_exact_match: outcome.templateExactMatch,
      semantic_frame: outcome.plan?.semanticFrame ?? null,
    },
    parameters: {
      resolver_quantities: outcome.plan?.quantities ?? null,
      runtime_input: estimate?.input ?? null,
      pricing_policy: outcome.plan?.pricingPolicy ?? null,
    },
    missing_inputs: uniqueStrings(outcome.plan?.formulas.flatMap((formula) => formula.missingInputs) ?? []),
    materials: Object.freeze(estimate ? rowSnapshotsFor(estimate, ["materials"]) : []),
    works: Object.freeze(estimate ? rowSnapshotsFor(estimate, ["labor"]) : []),
    services: Object.freeze(estimate ? rowSnapshotsFor(estimate, ["delivery"]) : []),
    equipment: Object.freeze(estimate ? rowSnapshotsFor(estimate, ["equipment"]) : []),
    quantities: Object.freeze(rows.map(({ row }) => ({
      row_code: row.code,
      quantity: row.quantity,
      unit: row.unit,
      display_quantity: row.displayQuantity,
    }))),
    units: uniqueStrings(rows.map(({ row }) => row.unit)),
    price_states: Object.freeze(estimate ? buildPriceStates(estimate) : []),
    totals: estimate?.totals ?? null,
    runtime_payload_hash: estimate ? estimateDeterministicHash(estimate) : null,
    ui_payload_hash: uiPayloadHash,
    revision_hash: revisionHash,
    revision_rows_hash: revisionRowsHash,
    revision_totals_hash: revisionTotalsHash,
    pdf_payload_hash: pdfPayloadHash,
    risk_findings: Object.freeze(riskFindings),
    failure_codes: failureCodes,
    passed: failureCodes.length === 0,
  });
}

export function buildProfessionalEstimate5000ReplayCheckpoint(input: {
  runId: string;
  shard: ProfessionalEstimate5000ReplayShardPlan;
  caseResults: readonly ProfessionalEstimate5000ActualReplayCaseResult[];
}): ProfessionalEstimate5000ActualReplayShardCheckpoint {
  const casesPassed = input.caseResults.filter((result) => result.passed).length;
  const casesFailed = input.caseResults.length - casesPassed;
  const finalStatus =
    input.caseResults.length === input.shard.cases_total && casesFailed === 0
      ? PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARD_PASSED_STATUS
      : PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_BLOCKED_STATUS;
  const withoutHash = {
    schema: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA,
    run_id: input.runId,
    generated_at: GENERATED_AT,
    shard: input.shard,
    cases_total: input.shard.cases_total,
    cases_completed: input.caseResults.length,
    cases_passed: casesPassed,
    cases_failed: casesFailed,
    final_status: finalStatus,
    case_results: input.caseResults,
    full_5000_green_claimed: false,
    fake_green_claimed: false,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    native_build_started: false,
    production_db_touched: false,
    main_changed: false,
    pr44_changed: false,
  } as const;
  return Object.freeze({
    ...withoutHash,
    checkpoint_hash: estimateDeterministicHash(withoutHash),
  });
}

function argValue(args: readonly string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function parseShardIds(args: readonly string[]): readonly number[] {
  if (args.includes("--all")) {
    return Object.freeze(Array.from({ length: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL }, (_, index) => index));
  }
  return Object.freeze([Number(argValue(args, "--shard") ?? "0")]);
}

export function runProfessionalEstimate5000ActualReplayCli(argv = process.argv.slice(2)): void {
  const prompts = readProfessionalEstimate5000ReplayPrompts();
  const plan = planProfessionalEstimate5000ReplayShards(prompts);
  const shardIds = parseShardIds(argv);
  const limit = argValue(argv, "--limit");
  const caseLimit = limit == null ? null : Math.max(0, Number(limit));
  const runId = timestamp();
  const outputs: {
    shard_id: number;
    checkpoint_path: string;
    cases_completed: number;
    cases_passed: number;
    cases_failed: number;
    final_status: string;
  }[] = [];

  for (const shardId of shardIds) {
    const shard = plan.shards[shardId];
    if (!shard) throw new Error(`PROFESSIONAL_ESTIMATE_5000_REPLAY_SHARD_NOT_PLANNED:${shardId}`);
    const shardPrompts = getProfessionalEstimate5000ReplayShardPrompts(prompts, shardId);
    const selectedPrompts = caseLimit == null ? shardPrompts : shardPrompts.slice(0, caseLimit);
    const checkpointPath = path.join(
      RUNTIME_ROOT,
      runId,
      `shard-${String(shardId).padStart(2, "0")}`,
      `professional-estimate-5000-replay-shard-${String(shardId).padStart(2, "0")}.json`,
    );
    const caseResults: ProfessionalEstimate5000ActualReplayCaseResult[] = [];
    const writeCheckpoint = (): ProfessionalEstimate5000ActualReplayShardCheckpoint => {
      const checkpoint = buildProfessionalEstimate5000ReplayCheckpoint({
        runId,
        shard,
        caseResults,
      });
      writeJson(checkpointPath, checkpoint);
      return checkpoint;
    };

    selectedPrompts.forEach((prompt, caseIndex) => {
      caseResults.push(evaluateProfessionalEstimate5000ReplayCase({
        prompt,
        shardId,
        caseIndex,
        globalIndex: shardId * PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD + caseIndex,
      }));
      writeCheckpoint();
    });

    const checkpoint = writeCheckpoint();
    outputs.push({
      shard_id: shardId,
      checkpoint_path: checkpointPath,
      cases_completed: checkpoint.cases_completed,
      cases_passed: checkpoint.cases_passed,
      cases_failed: checkpoint.cases_failed,
      final_status: checkpoint.final_status,
    });
  }

  const anyFailed = outputs.some((output) => output.cases_failed > 0 || output.final_status !== PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARD_PASSED_STATUS);
  process.stdout.write(`${JSON.stringify({
    schema: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SCHEMA,
    run_id: runId,
    shards_requested: shardIds,
    total_shards: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_SHARDS_TOTAL,
    cases_per_shard: PROFESSIONAL_ESTIMATE_5000_ACTUAL_REPLAY_CASES_PER_SHARD,
    outputs,
    fake_green_claimed: false,
  }, null, 2)}\n`);
  if (argv.includes("--fail-on-failure") && anyFailed) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/runProfessionalEstimate5000ActualReplay.ts")) {
  runProfessionalEstimate5000ActualReplayCli();
}
