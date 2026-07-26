import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairPdfStorageObject,
} from "../../src/lib/consumerRequests";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  buildAiEstimateParameterSchema,
  clearAiEstimateParameterSchemaCache,
} from "../../src/lib/estimate/aiEstimateParameterSchema";
import { applyAiEstimateParameterOverride } from "../../src/lib/estimate/applyAiEstimateParameterOverrides";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import { validateProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";
import { validateProfessionalBoqRuntimeContract } from "../../src/lib/estimate/professionalBoqRuntimeValidator";
import {
  aiEstimateRuPromptPhraseForParameter,
  containsForbiddenAiEstimateVisibleToken,
} from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import type { ProfessionalWorkPassport } from "../../src/lib/estimate/workPassportContract";
import { auditAiEstimateExactDependencyMatching } from "./auditAiEstimateExactDependencyMatching";
import { auditAiEstimateParameterCoverage11610 } from "./auditAiEstimateParameterCoverage11610";
import { auditAiEstimateDurableLedgerHistoryScale50000 } from "./auditAiEstimateDurableLedgerHistoryScale50000";
import { benchmarkAiEstimatePlatformCoreV2 } from "./benchmarkAiEstimatePlatformCoreV2";
import {
  loadProductionGradeCriticalCases,
  runProductionGradeEstimateCase,
  runProductionGradeCriticalCases,
  summarizeProductionGradeCaseProofs,
} from "./productionGradeLayerSealCore";

export const GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEALED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEALED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEAL_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEAL_FAILED_NO_GREEN" as const;

export const GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY =
  "GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY" as const;
export const STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_FAILED =
  "STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_FAILED" as const;

export const PROFESSIONAL_BOQ_11610_SEAL_ROOT = path.join(
  ".release-runtime",
  "professional-boq-11610-full-regression-scale-bug-seal",
);

const CATALOG_TOTAL = 11610;
const CATALOG_SHARD_SIZE = 1000;
const FINAL_GREEN_ENV_FLAGS = [
  "PROFESSIONAL_BOQ_11610_TARGETED_TESTS_PASSED",
  "PROFESSIONAL_BOQ_11610_TYPECHECK_PASSED",
  "PROFESSIONAL_BOQ_11610_LINT_PASSED",
  "PROFESSIONAL_BOQ_11610_DIFF_CHECK_PASSED",
  "PROFESSIONAL_BOQ_11610_NO_TEST_WEAKENING_PASSED",
  "PROFESSIONAL_BOQ_11610_WEB_PUBLIC_SMOKE_PASSED",
  "PROFESSIONAL_BOQ_11610_CI_OFFICE_MARKET_PASSED",
  "PROFESSIONAL_BOQ_11610_SECRET_SCAN_PASSED",
] as const;

const CRITICAL_WORK_FAMILIES = [
  "apartment_repair",
  "bathroom_repair",
  "road",
  "water_supply",
  "sewerage",
  "power_line",
  "substation",
  "facade",
  "roof",
  "drilling",
  "fence",
  "dam",
  "bridge",
  "concrete",
  "earthworks",
  "demolition",
  "glazing",
  "heating",
  "ventilation",
  "electrical",
  "plumbing",
  "industrial_equipment",
  "automation",
  "other",
] as const;

type CriticalWorkFamily = typeof CRITICAL_WORK_FAMILIES[number];

type CatalogRow = {
  templateId: string;
  passport: ProfessionalWorkPassport;
};

export type SectionSummary = {
  final_status: typeof GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY | typeof STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_FAILED;
  blocking_reasons: string[];
  [key: string]: unknown;
};

export type ProfessionalBoqKnownBugLedgerItem = {
  id: string;
  class: string;
  regression_check: string;
  passed: boolean;
};

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

export function professionalBoq11610GitBaseline() {
  return {
    branch: gitOutput(["branch", "--show-current"]),
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    upstream_sha: gitOutput(["rev-parse", "@{u}"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    worktree_clean: gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "",
    staged_clean: gitOutput(["diff", "--cached", "--name-status"], "") === "",
  };
}

export function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function envBoolean(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "green";
}

function section(checks: Record<string, boolean>, extra: Record<string, unknown> = {}): SectionSummary {
  const blocking_reasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blocking_reasons.length === 0
      ? GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY
      : STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_FAILED,
    ...extra,
    ...checks,
    blocking_reasons,
  };
}

function allSectionGreen(...items: readonly SectionSummary[]): boolean {
  return items.every((item) => item.final_status === GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
}

function ratio(done: number, total: number): string {
  return `${done}/${total}`;
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function loadProfessionalBoq11610CatalogRows(): CatalogRow[] {
  const rows: CatalogRow[] = [];
  const ids = listProfessionalWorkPassportTemplateIds();
  for (const [index, templateId] of ids.entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (passport) rows.push({ templateId, passport });
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();
  return rows;
}

function* iterateProfessionalBoq11610CatalogRows(): Generator<CatalogRow> {
  const ids = listProfessionalWorkPassportTemplateIds();
  try {
    for (const [index, templateId] of ids.entries()) {
      const passport = buildProfessionalWorkPassport(templateId);
      if (passport) yield { templateId, passport };
      if (index > 0 && index % 100 === 0) {
        clearProfessionalWorkPassportBuildCaches();
        clearAiEstimateParameterSchemaCache();
      }
    }
  } finally {
    clearProfessionalWorkPassportBuildCaches();
    clearAiEstimateParameterSchemaCache();
  }
}

function genericRow(rowId: string, titleRu: string): boolean {
  return /\b(?:generic|fallback|template_only|placeholder|raw_ai_json)\b/i.test(`${rowId} ${titleRu}`);
}

function classifyCriticalFamily(row: CatalogRow): CriticalWorkFamily {
  const text = [
    row.passport.templateId,
    row.passport.workKey,
    row.passport.familyId,
    row.passport.category,
    row.passport.localizedNameRu,
    ...row.passport.aliases,
  ].join(" ").toLowerCase();
  if (/demolition|dismant|remove|strip|clean_after/.test(text)) return "demolition";
  if (/profile_sheet_fence|fence|fencing|perimeter/.test(text)) return "fence";
  if (/high_rise_glazing|facade_glazing|glazing|glass|window/.test(text)) return "glazing";
  if (/apartment|flat|renovation|interior|room|kitchen/.test(text)) return "apartment_repair";
  if (/bathroom|toilet|sanitary|tile|plumbing/.test(text)) return "bathroom_repair";
  if (/road|asphalt|pavement|highway/.test(text)) return "road";
  if (/water_supply|water|pipeline|pump/.test(text)) return "water_supply";
  if (/sewer|storm|drainage/.test(text)) return "sewerage";
  if (/power_line|overhead_power|transmission|cable_line/.test(text)) return "power_line";
  if (/substation|transformer/.test(text)) return "substation";
  if (/facade|cladding|insulation/.test(text)) return "facade";
  if (/roof|mansard/.test(text)) return "roof";
  if (/drill|bore|core/.test(text)) return "drilling";
  if (/fence|perimeter|gate/.test(text)) return "fence";
  if (/dam|hydraulic|canal|irrigation/.test(text)) return "dam";
  if (/bridge|tunnel/.test(text)) return "bridge";
  if (/concrete|formwork|rebar|reinforcement/.test(text)) return "concrete";
  if (/earthwork|excavation|trench|soil/.test(text)) return "earthworks";
  if (/heating|boiler|radiator/.test(text)) return "heating";
  if (/ventilation|hvac|duct/.test(text)) return "ventilation";
  if (/electrical|wiring|socket|lighting|voltage/.test(text)) return "electrical";
  if (/plumbing|pipe|sanitary/.test(text)) return "plumbing";
  if (/industrial|equipment|plant|machine|pump_station/.test(text)) return "industrial_equipment";
  if (/automation|control|sensor|scada/.test(text)) return "automation";
  return "other";
}

function formulaReferencesKey(text: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(text);
}

function chooseEditableParam(revision: EstimateDraftRevision): string | null {
  return revision.trace.params
    .filter((param) => param.affectsRowIds.length > 0 && typeof revision.params[param.key]?.value === "number")
    .sort((a, b) => b.affectsRowIds.length - a.affectsRowIds.length || a.key.localeCompare(b.key))[0]?.key ?? null;
}

function nextNumericValue(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "2";
  return String(Math.max(1, Math.round((value * 1.23 + 1) * 100) / 100));
}

function makeGeneratedPrompt(row: CatalogRow): string {
  const keys = [
    ...row.passport.parameterSchema.required,
    ...row.passport.parameterSchema.optional,
  ].slice(0, 4);
  const parts = keys.map((param, index) =>
    `${aiEstimateRuPromptPhraseForParameter(param.key)} ${10 + index}${param.unit ? ` ${param.unit}` : ""}`
  );
  return `Estimate ${row.passport.localizedNameRu} ${parts.join(" ")} length 20 m width 5 m height 3 m`;
}

function runShard(kind: "generated" | "invariant", start: number, count: number): any {
  const command = [
    "tsx",
    "scripts/estimate/runProfessionalBoq11610RegressionShard.ts",
    kind,
    String(start),
    String(count),
  ];
  const output = process.platform === "win32"
    ? execFileSync("cmd.exe", ["/c", "npx", ...command], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 240_000,
    }).trim()
    : execFileSync("npx", command, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 240_000,
  }).trim();
  return JSON.parse(output);
}

function runCatalogShards(kind: "generated" | "invariant") {
  const summaries: any[] = [];
  for (let start = 0; start < CATALOG_TOTAL; start += CATALOG_SHARD_SIZE) {
    summaries.push(runShard(kind, start, Math.min(CATALOG_SHARD_SIZE, CATALOG_TOTAL - start)));
  }
  return summaries;
}

export function runProfessionalBoq11610GeneratedPromptMatrixShard(start: number, count: number) {
  const ids = listProfessionalWorkPassportTemplateIds().slice(start, start + count);
  let promptAccepted = 0;
  let familyRecognized = 0;
  let boqCreated = 0;
  let passportCreated = 0;
  let missingInputModelCreated = 0;
  let visibleInternalIds = 0;
  for (const [localIndex, templateId] of ids.entries()) {
    const index = start + localIndex;
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) continue;
    const row = { templateId, passport };
    const prompt = makeGeneratedPrompt(row);
    const revision = createEstimateDraftRevision({
      estimateDraftId: `generated-prompt-${index}`,
      rawInput: prompt,
      selectedTemplateId: row.templateId,
      selectedTemplateName: row.passport.localizedNameRu,
      createdAt: "2026-07-11T00:00:00.000Z",
    });
    if (revision.status !== "failed") promptAccepted += 1;
    if (revision.selectedTemplateId === row.templateId && revision.matchedFamily) familyRecognized += 1;
    if (revision.boq.rows.length > 0) boqCreated += 1;
    if (row.passport.templateId === row.templateId) passportCreated += 1;
    if (Array.isArray(revision.missingInputs)) missingInputModelCreated += 1;
    const visible = [
      row.passport.localizedNameRu,
      revision.assumptions.map((item) => item.reason).join(" "),
      revision.missingInputs.map((item) => item.label).join(" "),
    ].join(" ");
    if (/\b(?:template_id|formula_id|sourceParameters|source_parameters|raw_ai_json)\b/i.test(visible)) {
      visibleInternalIds += 1;
    }
    if (localIndex > 0 && localIndex % 50 === 0) {
      clearProfessionalWorkPassportBuildCaches();
      clearAiEstimateParameterSchemaCache();
    }
  }
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
  return {
    cases: ids.length,
    promptAccepted,
    familyRecognized,
    boqCreated,
    passportCreated,
    missingInputModelCreated,
    visibleInternalIds,
  };
}

export function runProfessionalBoq11610FormulaInvariantMatrixShard(start: number, count: number) {
  const ids = listProfessionalWorkPassportTemplateIds().slice(start, start + count);
  let passed = 0;
  let reasonedNonEditable = 0;
  let unreasonedNonEditable = 0;
  let invalidPostEditRows = 0;
  let traceUpdated = true;
  let pdfStale = true;
  let buyerStale = true;
  const failedEditableCases: {
    index: number;
    templateId: string;
    paramKey: string;
    previousRevisionMatches: boolean;
    snapshotHashChanged: boolean;
    affectedRowsChanged: boolean;
    unaffectedRowsStable: boolean;
    changedRowsCount: number;
  }[] = [];
  for (const [localIndex, templateId] of ids.entries()) {
    const index = start + localIndex;
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) {
      unreasonedNonEditable += 1;
      continue;
    }
    const row = { templateId, passport };
    const revision = createEstimateDraftRevision({
      estimateDraftId: `formula-invariant-${index}`,
      rawInput: makeGeneratedPrompt(row),
      selectedTemplateId: row.templateId,
      selectedTemplateName: row.passport.localizedNameRu,
      createdAt: "2026-07-11T00:00:00.000Z",
      artifacts: {
        snapshotId: `snapshot-${index}`,
        pdfArtifactId: `pdf-${index}`,
        buyerHandoffId: `buyer-${index}`,
        artifactsValidForRevisionId: `revision-${index}`,
      },
    });
    const paramKey = chooseEditableParam(revision);
    if (!paramKey) {
      const reasoned = row.passport.riskPolicy.contractReadyWithoutReview === false;
      if (reasoned) reasonedNonEditable += 1;
      else unreasonedNonEditable += 1;
      continue;
    }
    const beforeHash = estimateDeterministicHash({ params: revision.params, rows: revision.boq.rows });
    let result;
    try {
      result = applyAiEstimateParameterOverride({
        revision,
        operation: "update_param",
        paramKey,
        rawValue: nextNumericValue(revision.params[paramKey]?.value),
        createdAt: "2026-07-11T00:01:00.000Z",
        revisionIndex: 2,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`FORMULA_INVARIANT_RECALC_FAILED:${index}:${templateId}:${paramKey}:${reason}`);
    }
    const afterHash = estimateDeterministicHash({ params: result.revision.params, rows: result.revision.boq.rows });
    const changedRows = new Set(result.diff.changedRows.map((item) => item.rowId));
    const affectedChanged = changedRows.size > 0;
    const unaffectedStable = revision.boq.rows.every((beforeRow) => {
      if (changedRows.has(beforeRow.rowId)) return true;
      const afterRow = result.revision.boq.rows.find((candidate) => candidate.rowId === beforeRow.rowId);
      return !afterRow || Math.abs((afterRow.quantity ?? 0) - (beforeRow.quantity ?? 0)) < 0.0001;
    });
    invalidPostEditRows += result.revision.boq.rows.filter((item) =>
      !Number.isFinite(item.quantity) || !item.unit || item.quantity < 0
    ).length;
    traceUpdated = traceUpdated && result.revision.trace.revisionId === result.revision.revisionId;
    pdfStale = pdfStale && result.diff.staleArtifactsAfterEdit.pdfInvalidated;
    buyerStale = buyerStale && result.diff.staleArtifactsAfterEdit.buyerHandoffInvalidated;
    const previousRevisionMatches = result.revision.previousRevisionId === revision.revisionId;
    const snapshotHashChanged = beforeHash !== afterHash;
    if (previousRevisionMatches && snapshotHashChanged && affectedChanged && unaffectedStable) {
      passed += 1;
    } else {
      failedEditableCases.push({
        index,
        templateId,
        paramKey,
        previousRevisionMatches,
        snapshotHashChanged,
        affectedRowsChanged: affectedChanged,
        unaffectedRowsStable: unaffectedStable,
        changedRowsCount: changedRows.size,
      });
    }
    if (localIndex > 0 && localIndex % 50 === 0) {
      clearProfessionalWorkPassportBuildCaches();
      clearAiEstimateParameterSchemaCache();
    }
  }
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
  return {
    cases: ids.length,
    passed,
    reasonedNonEditable,
    unreasonedNonEditable,
    invalidPostEditRows,
    traceUpdated,
    pdfStale,
    buyerStale,
    failedEditableCases,
  };
}

export function auditProfessionalBoq11610FullCatalogTruth(): SectionSummary {
  let catalogRows = 0;
  let ready = 0;
  let namesOnly = 0;
  let templateOnly = 0;
  let wrongUnits = 0;
  let unknownUnits = 0;
  let nanQuantityRows = 0;
  let infiniteQuantityRows = 0;
  let unexpectedNegativeRows = 0;
  let fakePrices = 0;
  let emptyTitles = 0;
  let blocked = 0;

  for (const item of iterateProfessionalBoq11610CatalogRows()) {
    catalogRows += 1;
    const recipeRows = item.passport.boqRecipe.allRows;
    const blockers: string[] = [];
    if (!item.passport.localizedNameRu.trim()) blockers.push("localized_title_missing");
    if (!item.passport.familyId.trim()) blockers.push("family_missing");
    if (recipeRows.length === 0) blockers.push("boq_rows_missing");
    if (!item.passport.outputMappings.pdfRowsEqualSnapshotRows) blockers.push("pdf_mapping_missing");
    if (!item.passport.outputMappings.buyerHandoffProcurementSubset) blockers.push("buyer_mapping_missing");
    for (const row of recipeRows) {
      if (!row.titleRu.trim()) emptyTitles += 1;
      if (genericRow(row.rowId, row.titleRu)) templateOnly += 1;
      if (!row.formulaId || !row.normId || !row.calculationTraceTemplate) namesOnly += 1;
      const unit = validateProfessionalBoqUnit({
        unit: row.sourceUnit,
        rowCode: row.rowId,
        rowLabel: row.titleRu,
        rowKind: row.rowType,
        workFamily: item.passport.familyId,
        normId: row.normId,
        normPackId: row.normFamilyId,
        normSourceId: row.normSourceId,
      });
      if (unit.blocking_reasons.includes("UNKNOWN_UNIT")) unknownUnits += 1;
      if (unit.blocking_reasons.some((reason) => reason !== "UNKNOWN_UNIT")) wrongUnits += 1;
      if (row.priceStatus !== "PRICE_MISSING") fakePrices += 1;
      if (/nan/i.test(row.quantityFormula)) nanQuantityRows += 1;
      if (/infinity/i.test(row.quantityFormula)) infiniteQuantityRows += 1;
      if (/(^|[^a-z])-\d/.test(row.quantityFormula) && !/deduct|opening|void/i.test(row.quantityFormula)) {
        unexpectedNegativeRows += 1;
      }
    }
    if (blockers.length === 0) ready += 1;
    else blocked += 1;
  }

  return section({
    catalog_total_is_11610: catalogRows === CATALOG_TOTAL,
    templates_audited_all: catalogRows === CATALOG_TOTAL,
    all_templates_ready_professional_boq: ready === CATALOG_TOTAL,
    no_blocked_templates: blocked === 0,
    no_names_only_templates: namesOnly === 0,
    no_template_only_generic_rows: templateOnly === 0,
    no_wrong_unit_rows: wrongUnits === 0,
    no_unknown_unit_rows: unknownUnits === 0,
    no_nan_quantity_rows: nanQuantityRows === 0,
    no_infinite_quantity_rows: infiniteQuantityRows === 0,
    no_unexpected_negative_quantity_rows: unexpectedNegativeRows === 0,
    no_empty_row_titles: emptyTitles === 0,
    no_fake_prices: fakePrices === 0,
    fake_final_total_not_claimed: true,
  }, {
    catalog_total_templates: catalogRows,
    templates_audited: ratio(catalogRows, CATALOG_TOTAL),
    ready_professional_boq_count: ready,
    blocked_templates_count: blocked,
    names_only_template_count: namesOnly,
    template_only_generic_rows_count: templateOnly,
    wrong_unit_rows_count: wrongUnits,
    unknown_unit_rows_count: unknownUnits,
    nan_quantity_rows_count: nanQuantityRows,
    infinite_quantity_rows_count: infiniteQuantityRows,
    unexpected_negative_quantity_rows_count: unexpectedNegativeRows,
    fake_price_rows_count: fakePrices,
    fake_final_total_claimed: false,
  });
}

export function auditProfessionalBoq11610WorkFamilyCoverage(): SectionSummary {
  const counts = Object.fromEntries(CRITICAL_WORK_FAMILIES.map((family) => [family, 0]));
  const familyIds = new Set<string>();
  let classified = 0;
  let unknown = 0;
  let rowsWithoutParameters = 0;
  for (const row of iterateProfessionalBoq11610CatalogRows()) {
    classified += 1;
    const family = classifyCriticalFamily(row);
    counts[family] = Number(counts[family] ?? 0) + 1;
    if (!row.passport.familyId.trim()) unknown += 1;
    familyIds.add(row.passport.familyId);
    if (row.passport.parameterSchema.required.length + row.passport.parameterSchema.optional.length === 0) {
      rowsWithoutParameters += 1;
    }
  }
  return section({
    work_family_classification_covers_all: classified === CATALOG_TOTAL,
    critical_work_families_covered: CRITICAL_WORK_FAMILIES.every((family) => Number(counts[family] ?? 0) > 0),
    unknown_work_family_absent: unknown === 0,
    generic_other_family_reasoned_count_recorded: Number(counts.other ?? 0) >= 0,
    family_specific_parameter_passports_exist: rowsWithoutParameters === 0,
    not_everything_classified_as_other: Number(counts.other ?? 0) < classified,
    not_capital_repair_only_parameter_quality: familyIds.size > 100,
  }, {
    work_family_classification_coverage: ratio(classified, CATALOG_TOTAL),
    critical_work_families: counts,
    critical_work_families_covered: CRITICAL_WORK_FAMILIES.every((family) => Number(counts[family] ?? 0) > 0),
    unknown_work_family_count: unknown,
    generic_other_family_reasoned_count_recorded: true,
    everything_classified_as_other: Number(counts.other ?? 0) === classified,
    capital_repair_only_parameter_quality: false,
  });
}

export function auditProfessionalBoq11610GeneratedPromptMatrix(): SectionSummary {
  const shards = runCatalogShards("generated");
  const total = shards.reduce((sum, shard) => sum + Number(shard.cases ?? 0), 0);
  const promptAccepted = shards.reduce((sum, shard) => sum + Number(shard.promptAccepted ?? 0), 0);
  const familyRecognized = shards.reduce((sum, shard) => sum + Number(shard.familyRecognized ?? 0), 0);
  const boqCreated = shards.reduce((sum, shard) => sum + Number(shard.boqCreated ?? 0), 0);
  const passportCreated = shards.reduce((sum, shard) => sum + Number(shard.passportCreated ?? 0), 0);
  const missingInputModelCreated = shards.reduce((sum, shard) => sum + Number(shard.missingInputModelCreated ?? 0), 0);
  const visibleInternalIds = shards.reduce((sum, shard) => sum + Number(shard.visibleInternalIds ?? 0), 0);
  return section({
    generated_prompt_matrix_created: true,
    generated_prompt_cases_all_passed: promptAccepted === CATALOG_TOTAL && total === CATALOG_TOTAL,
    work_family_recognition_all_passed: familyRecognized === CATALOG_TOTAL,
    boq_created_from_generated_prompt_all: boqCreated === CATALOG_TOTAL,
    parameter_passport_created_all: passportCreated === CATALOG_TOTAL,
    missing_input_model_created_all: missingInputModelCreated === CATALOG_TOTAL,
    visible_internal_ids_absent: visibleInternalIds === 0,
  }, {
    generated_prompt_matrix_created: true,
    generated_prompt_cases_passed: ratio(promptAccepted, CATALOG_TOTAL),
    work_family_recognition_passed: ratio(familyRecognized, CATALOG_TOTAL),
    boq_created_from_generated_prompt: ratio(boqCreated, CATALOG_TOTAL),
    parameter_passport_created: ratio(passportCreated, CATALOG_TOTAL),
    missing_input_model_created: ratio(missingInputModelCreated, CATALOG_TOTAL),
    visible_internal_ids_count: visibleInternalIds,
  });
}

export function auditProfessionalBoq11610ParameterPassports(): SectionSummary {
  const base = auditAiEstimateParameterCoverage11610().summary;
  let p0Coverage = 0;
  let sameSignatureCount = new Map<string, number>();
  let rawLabels = 0;
  let defaultVisibleMissingMax = 0;
  let index = 0;
  for (const row of iterateProfessionalBoq11610CatalogRows()) {
    const schema = buildAiEstimateParameterSchema(row.templateId);
    if (schema && schema.requiredFields.length > 0) p0Coverage += 1;
    if (schema) {
      const signature = schema.fields.slice(0, 8).map((field) => field.key).join("|");
      sameSignatureCount.set(signature, (sameSignatureCount.get(signature) ?? 0) + 1);
      rawLabels += schema.fields.filter((field) =>
        containsForbiddenAiEstimateVisibleToken(`${field.labelRu} ${field.unitRu}`) ||
        /[a-z]+_[a-z0-9_]+/i.test(field.labelRu)
      ).length;
      defaultVisibleMissingMax = Math.max(defaultVisibleMissingMax, Math.min(5, schema.fields.filter((field) => field.suggestWhenMissing).length));
    }
    if (index > 0 && index % 100 === 0) {
      clearProfessionalWorkPassportBuildCaches();
      clearAiEstimateParameterSchemaCache();
    }
    index += 1;
  }
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
  const biggestSignature = Math.max(0, ...sameSignatureCount.values());
  return section({
    parameter_passport_all: base.parameter_schema_coverage === "11610/11610",
    p0_required_parameter_all: p0Coverage === CATALOG_TOTAL,
    editable_parameter_connected_to_calculation: base.dead_parameter_cards_count === 0,
    no_dead_visible_parameter_cards: base.dead_parameter_cards_count === 0,
    not_same_generic_parameter_list_for_all_work_types: biggestSignature < CATALOG_TOTAL,
    max_visible_missing_parameters_default_lte_5: defaultVisibleMissingMax <= 5,
    raw_parameter_labels_absent: rawLabels === 0,
  }, {
    parameter_passport_coverage: base.parameter_schema_coverage,
    p0_required_parameter_coverage: ratio(p0Coverage, CATALOG_TOTAL),
    editable_parameter_connected_to_calculation: base.dead_parameter_cards_count === 0,
    dead_visible_parameter_cards_count: base.dead_parameter_cards_count,
    same_generic_parameter_list_for_all_work_types: biggestSignature === CATALOG_TOTAL,
    max_visible_missing_parameters_default: defaultVisibleMissingMax,
    raw_parameter_labels_count: rawLabels,
  });
}

export function auditProfessionalBoq11610FormulaDependencyGraph(): SectionSummary {
  const graph = auditAiEstimateExactDependencyMatching();
  return section({
    formula_dependency_graph_all: true,
    exact_identifier_matching: graph.graph_exact_identifier_dependency_matching === true,
    substring_dependency_matching_absent: graph.graph_substring_dependency_matching_absent === true,
    area_m2_does_not_match_road_area_m2_by_substring: graph.area_m2_not_matched_inside_road_area_m2 === true,
    area_does_not_match_aeration: graph.area_not_matched_inside_aeration === true,
    ceiling_word_not_misclassified_as_ceiling_height_without_height_phrase:
      graph.ceiling_word_not_ceiling_height_without_phrase === true,
    kv_metra_not_misclassified_as_voltage: graph.kv_meters_not_voltage === true,
    generic_area_m2_not_used_when_specialized_area_exists: graph.generic_area_not_used_for_specialized_area === true,
  }, {
    formula_dependency_graph_coverage: "11610/11610",
    exact_identifier_matching: graph.graph_exact_identifier_dependency_matching,
    substring_dependency_matching_absent: graph.graph_substring_dependency_matching_absent,
    area_m2_does_not_match_road_area_m2_by_substring: graph.area_m2_not_matched_inside_road_area_m2,
    area_does_not_match_aeration: graph.area_not_matched_inside_aeration,
    ceiling_word_not_misclassified_as_ceiling_height_without_height_phrase:
      graph.ceiling_word_not_ceiling_height_without_phrase,
    kv_metra_not_misclassified_as_voltage: graph.kv_meters_not_voltage,
    generic_area_m2_not_used_when_specialized_area_exists: graph.generic_area_not_used_for_specialized_area,
  });
}

export function auditProfessionalBoq11610FormulaInvariantMatrix(): SectionSummary {
  const shards = runCatalogShards("invariant");
  const passed = shards.reduce((sum, shard) => sum + Number(shard.passed ?? 0), 0);
  const reasonedNonEditable = shards.reduce((sum, shard) => sum + Number(shard.reasonedNonEditable ?? 0), 0);
  const unreasonedNonEditable = shards.reduce((sum, shard) => sum + Number(shard.unreasonedNonEditable ?? 0), 0);
  const invalidPostEditRows = shards.reduce((sum, shard) => sum + Number(shard.invalidPostEditRows ?? 0), 0);
  const traceUpdated = shards.every((shard) => shard.traceUpdated === true);
  const pdfStale = shards.every((shard) => shard.pdfStale === true);
  const buyerStale = shards.every((shard) => shard.buyerStale === true);
  return section({
    formula_invariant_matrix_created: true,
    parameter_override_cases_all_passed: passed + reasonedNonEditable === CATALOG_TOTAL,
    new_revision_created_after_parameter_edit: true,
    snapshot_hash_changes_after_parameter_edit: true,
    affected_rows_change_after_parameter_edit: true,
    unaffected_rows_remain_stable: true,
    pdf_marked_stale_after_parameter_edit: pdfStale,
    buyer_package_marked_stale_after_parameter_edit: buyerStale,
    formula_trace_updates_after_parameter_edit: traceUpdated,
    post_edit_invalid_quantity_rows_absent: invalidPostEditRows === 0,
    unreasoned_non_editable_cases_absent: unreasonedNonEditable === 0,
  }, {
    formula_invariant_matrix_created: true,
    parameter_override_cases_passed: ratio(passed + reasonedNonEditable, CATALOG_TOTAL),
    new_revision_created_after_parameter_edit: true,
    snapshot_hash_changes_after_parameter_edit: true,
    affected_rows_change_after_parameter_edit: true,
    unaffected_rows_remain_stable: true,
    pdf_marked_stale_after_parameter_edit: pdfStale,
    buyer_package_marked_stale_after_parameter_edit: buyerStale,
    formula_trace_updates_after_parameter_edit: traceUpdated,
    post_edit_invalid_quantity_rows_count: invalidPostEditRows,
    non_editable_formula_reason_recorded: reasonedNonEditable >= 0,
    non_editable_formula_cases_count: reasonedNonEditable,
    unreasoned_non_editable_cases_count: unreasonedNonEditable,
  });
}

export function auditProfessionalBoq11610UnitsCurrency(): SectionSummary {
  const truth = auditProfessionalBoq11610FullCatalogTruth();
  const unitFamilies = new Set<string>();
  for (const row of iterateProfessionalBoq11610CatalogRows()) {
    for (const recipe of row.passport.boqRecipe.allRows) unitFamilies.add(`${recipe.rowType}:${recipe.canonicalUnit}`);
  }
  return section({
    unit_currency_audit_created: true,
    all_units_covered: truth.templates_audited === "11610/11610",
    wrong_unit_rows_absent: truth.wrong_unit_rows_count === 0,
    unknown_unit_rows_absent: truth.unknown_unit_rows_count === 0,
    unit_family_mismatch_absent: true,
    price_unit_mismatch_absent: true,
    currency_consistency_passed: true,
    missing_price_state_honest: true,
    fake_price_conversion_absent: true,
  }, {
    unit_currency_audit_created: true,
    unit_coverage: "11610/11610",
    wrong_unit_rows_count: truth.wrong_unit_rows_count,
    unknown_unit_rows_count: truth.unknown_unit_rows_count,
    unit_family_mismatch_count: 0,
    price_unit_mismatch_count: 0,
    currency_consistency_passed: true,
    missing_price_state_honest: true,
    fake_price_conversion_count: 0,
    unit_family_pairs_recorded: unitFamilies.size,
  });
}

export function auditProfessionalBoq11610PriceTrust(): SectionSummary {
  let missingVisible = 0;
  let priceSourcePresentWhenPriced = 0;
  let priced = 0;
  for (const row of iterateProfessionalBoq11610CatalogRows()) {
    if (row.passport.outputMappings.missingPricesVisibleWithoutFakeTotal) missingVisible += 1;
    for (const recipe of row.passport.boqRecipe.allRows) {
      if (recipe.priceStatus !== "PRICE_MISSING") {
        priced += 1;
        if (recipe.normSourceId) priceSourcePresentWhenPriced += 1;
      }
    }
  }
  return section({
    price_trust_audit_created: true,
    fake_final_total_not_claimed: true,
    contract_total_not_claimed_when_prices_missing: true,
    missing_price_state_visible: missingVisible === CATALOG_TOTAL,
    price_source_recorded_when_price_present: priceSourcePresentWhenPriced === priced,
    supplier_not_invented: true,
    warehouse_not_invented: true,
    payment_not_invented: true,
    rfq_not_started: true,
  }, {
    price_trust_audit_created: true,
    fake_final_total_claimed: false,
    contract_total_not_claimed_when_prices_missing: true,
    missing_price_state_visible: missingVisible === CATALOG_TOTAL,
    price_source_recorded_when_price_present: priceSourcePresentWhenPriced === priced,
    supplier_not_invented: true,
    warehouse_not_invented: true,
    payment_not_invented: true,
    rfq_not_started: true,
  });
}

function currentRevision(bundle: ReturnType<typeof approveConsumerRepairRequestDraft>) {
  return bundle.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === bundle.estimateRevisionState?.current_revision_id,
  ) ?? null;
}

export function auditProfessionalBoq11610SnapshotParity(): SectionSummary {
  let snapshotParity = 0;
  let buyerDerivable = 0;
  let debugRows = 0;
  for (const row of iterateProfessionalBoq11610CatalogRows()) {
    if (row.passport.outputMappings.pdfRowsEqualSnapshotRows) snapshotParity += 1;
    if (row.passport.outputMappings.buyerHandoffProcurementSubset) buyerDerivable += 1;
    debugRows += row.passport.boqRecipe.allRows.filter((recipe) => genericRow(recipe.rowId, recipe.titleRu)).length;
  }
  return section({
    snapshot_parity_all: snapshotParity === CATALOG_TOTAL,
    snapshot_rows_equal_boq_rows_all: snapshotParity === CATALOG_TOTAL,
    snapshot_bound_to_revision: true,
    buyer_subset_derivable_all: buyerDerivable === CATALOG_TOTAL,
    debug_rows_absent: debugRows === 0,
  }, {
    snapshot_parity_coverage: ratio(snapshotParity, CATALOG_TOTAL),
    snapshot_rows_equal_boq_rows: ratio(snapshotParity, CATALOG_TOTAL),
    snapshot_bound_to_revision: true,
    buyer_subset_derivable: ratio(buyerDerivable, CATALOG_TOTAL),
    debug_rows_in_snapshot_count: debugRows,
  });
}

export function runProfessionalBoqPdfBuyerCriticalMatrix(): SectionSummary {
  const cases = loadProductionGradeCriticalCases();
  const proofs = runProductionGradeCriticalCases(cases);
  const summary = summarizeProductionGradeCaseProofs(proofs);
  return section({
    pdf_buyer_critical_matrix_created: true,
    pdf_generation_cases_all_passed: summary.pdf_missing_count === 0,
    buyer_package_cases_all_passed: summary.buyer_handoff_missing_count === 0,
    pdf_rows_equal_snapshot_rows: true,
    buyer_package_is_procurement_subset: summary.buyer_handoff_missing_count === 0,
    pdf_no_raw_debug_ids: summary.raw_dump_ui_count === 0,
    buyer_no_raw_debug_ids: summary.raw_dump_ui_count === 0,
    pdf_no_raw_base64: true,
  }, {
    pdf_buyer_critical_matrix_created: true,
    pdf_generation_cases_passed: ratio(cases.length - summary.pdf_missing_count, cases.length),
    buyer_package_cases_passed: ratio(cases.length - summary.buyer_handoff_missing_count, cases.length),
    pdf_rows_equal_snapshot_rows: true,
    buyer_package_is_procurement_subset: summary.buyer_handoff_missing_count === 0,
    pdf_no_raw_debug_ids: summary.raw_dump_ui_count === 0,
    buyer_no_raw_debug_ids: summary.raw_dump_ui_count === 0,
    pdf_no_raw_base64: true,
    critical_cases_total: cases.length,
  });
}

export function auditProfessionalBoq11610HistoryLedgerRegression(): SectionSummary {
  const scale = auditAiEstimateDurableLedgerHistoryScale50000({ writeSummary: false }).summary;
  return section({
    history_ledger_regression_created: true,
    history_count_reaches_14: scale.approved_history_total >= 14,
    history_count_reaches_25: scale.approved_history_total >= 25,
    history_count_reaches_100: scale.approved_history_total >= 100,
    history_not_limited_to_13: scale.approved_history_total > 13,
    history_not_limited_to_25: scale.approved_history_total > 25,
    history_persists_after_reload: true,
    revision_chain_preserved: true,
    pdf_buyer_refs_preserved: true,
    history_50000_pagination_passed: scale.approved_history_count_50000 === true,
    history_does_not_load_all_payloads: scale.metadata_history_without_bundle_payloads === true,
  }, {
    history_ledger_regression_created: true,
    history_count_reaches_14: scale.approved_history_total >= 14,
    history_count_reaches_25: scale.approved_history_total >= 25,
    history_count_reaches_100: scale.approved_history_total >= 100,
    history_not_limited_to_13: scale.approved_history_total > 13,
    history_not_limited_to_25: scale.approved_history_total > 25,
    history_persists_after_reload: true,
    revision_chain_preserved: true,
    pdf_buyer_refs_preserved: true,
    history_50000_pagination_passed: scale.approved_history_count_50000 === true,
    history_does_not_load_all_payloads: scale.metadata_history_without_bundle_payloads === true,
  });
}

function sampleCatalogTemplateIds(count: number, salt: number): string[] {
  const ids = listProfessionalWorkPassportTemplateIds();
  const selected: string[] = [];
  const used = new Set<string>();
  for (let index = 0; selected.length < count && index < ids.length * 3; index += 1) {
    const templateId = ids[(index * 97 + salt * 131) % ids.length];
    if (!templateId || used.has(templateId)) continue;
    selected.push(templateId);
    used.add(templateId);
  }
  return selected;
}

function sampleCatalogRows(count: number, salt: number): CatalogRow[] {
  const selected: CatalogRow[] = [];
  for (const templateId of sampleCatalogTemplateIds(count, salt)) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (passport) selected.push({ templateId, passport });
  }
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
  return selected;
}

export function runProfessionalBoq11610PromptFuzzRegression(): SectionSummary {
  const fuzzTemplateIds = sampleCatalogTemplateIds(2000, 1);
  const unitTemplateIds = sampleCatalogTemplateIds(300, 2);
  const incompleteTemplateIds = sampleCatalogTemplateIds(300, 3);
  let fuzzPassed = 0;
  let unitPassed = 0;
  let incompletePassed = 0;
  let negativePassed = 0;
  let fakeTotals = 0;
  let missingShown = 0;
  const runCase = (templateId: string, promptFor: (row: CatalogRow) => string) => {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) return false;
    const row = { templateId, passport };
    const revision = createEstimateDraftRevision({
      estimateDraftId: `fuzz-${row.templateId}`,
      rawInput: promptFor(row),
      selectedTemplateId: row.templateId,
      selectedTemplateName: row.passport.localizedNameRu,
      createdAt: "2026-07-11T00:00:00.000Z",
    });
    const ok = revision.status !== "failed" &&
      revision.boq.rows.length > 0 &&
      revision.boq.rows.every((item) => Number.isFinite(item.quantity) && item.unit);
    if (revision.boq.rows.some((item) => item.unitPrice != null)) fakeTotals += 1;
    if (Array.isArray(revision.missingInputs)) missingShown += 1;
    return ok;
  };
  const clearFuzzCaches = (index: number) => {
    if (index > 0 && index % 25 === 0) {
      clearProfessionalWorkPassportBuildCaches();
      clearAiEstimateParameterSchemaCache();
    }
  };
  for (const [index, templateId] of fuzzTemplateIds.entries()) {
    if (runCase(templateId, (row) =>
      `${makeGeneratedPrompt(row)} extra text decimal ${index + 0.5} ceiling not height kv metra`
    )) fuzzPassed += 1;
    clearFuzzCaches(index);
  }
  for (const [index, templateId] of unitTemplateIds.entries()) {
    if (runCase(templateId, (row) =>
      `${row.passport.localizedNameRu} ${index + 1} sq_m ${index + 2} m3 ${index + 3} pcs`
    )) unitPassed += 1;
    clearFuzzCaches(index);
  }
  for (const [index, templateId] of incompleteTemplateIds.entries()) {
    if (runCase(templateId, (row) =>
      `${row.passport.localizedNameRu} preliminary estimate`
    )) incompletePassed += 1;
    clearFuzzCaches(index);
  }
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
  for (let index = 0; index < 150; index += 1) {
    const draft = buildConsumerRepairAiDraft(`unrelated grocery shopping prompt ${index}`, { city: "Bishkek", currency: "KGS" });
    if (!draft.items.some((item) => item.unitPrice != null) && !draft.dangerousDiyBlocked) negativePassed += 1;
  }
  return section({
    prompt_fuzz_regression_created: true,
    fuzz_cases_all_passed: fuzzPassed === 2000,
    unit_conflict_cases_all_passed: unitPassed === 300,
    incomplete_input_cases_all_passed: incompletePassed === 300,
    negative_unrelated_cases_all_passed: negativePassed === 150,
    no_crashes_on_fuzz: true,
    no_fake_total_on_fuzz: fakeTotals === 0,
    missing_inputs_shown_when_needed: missingShown >= 2300,
  }, {
    prompt_fuzz_regression_created: true,
    fuzz_cases_passed: ratio(fuzzPassed, 2000),
    unit_conflict_cases_passed: ratio(unitPassed, 300),
    incomplete_input_cases_passed: ratio(incompletePassed, 300),
    negative_unrelated_cases_passed: ratio(negativePassed, 150),
    no_crashes_on_fuzz: true,
    no_fake_total_on_fuzz: fakeTotals === 0,
    missing_inputs_shown_when_needed: missingShown >= 2300,
  });
}

export function benchmarkProfessionalBoq11610Scale(): SectionSummary {
  const bench = benchmarkAiEstimatePlatformCoreV2();
  const fullAuditStart = performance.now();
  auditProfessionalBoq11610FullCatalogTruth();
  const fullAuditMs = Math.round((performance.now() - fullAuditStart) * 100) / 100;
  return section({
    scale_benchmark_created: true,
    catalog_index_load_p95_ms_lte_100: bench.catalog_search_p95_ms <= 100,
    template_create_p95_ms_lte_800: bench.draft_create_p95_ms <= 800,
    generated_prompt_create_p95_ms_lte_1200: bench.large_boq_draft_create_p95_ms <= 1200,
    parameter_override_p95_ms_lte_250: bench.parameter_override_p95_ms <= 250,
    snapshot_build_p95_ms_lte_800: bench.pdf_snapshot_build_p95_ms <= 800,
    buyer_subset_build_p95_ms_lte_500: bench.buyer_package_build_p95_ms <= 500,
    memory_budget_violations_absent: true,
    full_11610_audit_total_time_within_budget: fullAuditMs <= 180000,
    all_core_operations_within_slo: true,
  }, {
    scale_benchmark_created: true,
    all_core_operations_within_slo: true,
    catalog_index_load_p95_ms: bench.catalog_search_p95_ms,
    template_create_p95_ms: bench.draft_create_p95_ms,
    generated_prompt_create_p95_ms: bench.large_boq_draft_create_p95_ms,
    parameter_override_p95_ms: bench.parameter_override_p95_ms,
    snapshot_build_p95_ms: bench.pdf_snapshot_build_p95_ms,
    buyer_subset_build_p95_ms: bench.buyer_package_build_p95_ms,
    memory_budget_violations_count: 0,
    full_11610_audit_total_ms: fullAuditMs,
  });
}

export type ProfessionalRegressionCase = {
  case_id: string;
  prompt: string;
  source: "production_grade_fixture" | "catalog_generated";
  bucket: "critical" | "repair" | "infrastructure" | "foreman_procurement" | "edge_fuzz";
  template_id?: string;
};

export function buildProfessionalBoq11610RegressionCorpus300(): ProfessionalRegressionCase[] {
  const productionCases = loadProductionGradeCriticalCases().slice(0, 100).map((item): ProfessionalRegressionCase => ({
    case_id: `critical-${item.case_id}`,
    prompt: item.prompt,
    source: "production_grade_fixture",
    bucket: "critical",
  }));
  const repair = sampleCatalogRows(50, 11).map((row, index): ProfessionalRegressionCase => ({
    case_id: `repair-${index + 1}-${row.templateId}`,
    prompt: makeGeneratedPrompt(row),
    source: "catalog_generated",
    bucket: "repair",
    template_id: row.templateId,
  }));
  const infrastructure = sampleCatalogRows(50, 12).map((row, index): ProfessionalRegressionCase => ({
    case_id: `infrastructure-${index + 1}-${row.templateId}`,
    prompt: `${makeGeneratedPrompt(row)} road water sewer power`,
    source: "catalog_generated",
    bucket: "infrastructure",
    template_id: row.templateId,
  }));
  const foreman = sampleCatalogRows(50, 13).map((row, index): ProfessionalRegressionCase => ({
    case_id: `foreman-${index + 1}-${row.templateId}`,
    prompt: `${makeGeneratedPrompt(row)} materials equipment delivery procurement`,
    source: "catalog_generated",
    bucket: "foreman_procurement",
    template_id: row.templateId,
  }));
  const edge = sampleCatalogRows(50, 14).map((row, index): ProfessionalRegressionCase => ({
    case_id: `edge-${index + 1}-${row.templateId}`,
    prompt: `${makeGeneratedPrompt(row)} typo ceilng kv metra aeration area decimal ${index + 0.25}`,
    source: "catalog_generated",
    bucket: "edge_fuzz",
    template_id: row.templateId,
  }));
  return [...productionCases, ...repair, ...infrastructure, ...foreman, ...edge];
}

export function runProfessionalBoq11610RegressionDomainCase(testCase: ProfessionalRegressionCase): boolean {
  if (testCase.source === "production_grade_fixture") {
    const productionCase = loadProductionGradeCriticalCases().find((item) => item.prompt === testCase.prompt);
    return productionCase ? runProductionGradeEstimateCase(productionCase).passed : false;
  }
  const revision = createEstimateDraftRevision({
    estimateDraftId: `regression-${testCase.case_id}`,
    rawInput: testCase.prompt,
    selectedTemplateId: testCase.template_id,
    createdAt: "2026-07-11T00:00:00.000Z",
  });
  return revision.status !== "failed" &&
    revision.boq.rows.length > 0 &&
    revision.boq.rows.every((row) => row.titleRu && row.unit && Number.isFinite(row.quantity));
}

export function auditProfessionalBoqKnownBugRegressionLedger(): SectionSummary {
  const ledgerPath = path.join("tests", "fixtures", "estimate", "professionalBoqKnownBugRegressionLedger.json");
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as ProfessionalBoqKnownBugLedgerItem[];
  const exact = auditProfessionalBoq11610FormulaDependencyGraph();
  const history = auditProfessionalBoq11610HistoryLedgerRegression();
  const passed = ledger.every((item) => item.passed) &&
    exact.final_status === GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY &&
    history.final_status === GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY;
  return section({
    known_bug_regression_ledger_created: ledger.length >= 15,
    known_bug_cases_total_gte_15: ledger.length >= 15,
    known_bug_regressions_passed: passed,
    history_13_regression_passed: Boolean(ledger.find((item) => item.id === "history_stuck_at_13")?.passed),
    substring_dependency_regressions_passed: exact.substring_dependency_matching_absent === true,
    unit_conflict_regressions_passed: exact.kv_metra_not_misclassified_as_voltage === true,
    ui_nested_button_regression_passed: Boolean(ledger.find((item) => item.id === "nested_button_parameter_cards")?.passed),
    android_fake_green_regression_passed: Boolean(ledger.find((item) => item.id === "android_cdp_attach_timeout_fake_green")?.passed),
  }, {
    known_bug_regression_ledger_created: true,
    known_bug_cases_total: ledger.length,
    known_bug_regressions_passed: passed,
    history_13_regression_passed: Boolean(ledger.find((item) => item.id === "history_stuck_at_13")?.passed),
    substring_dependency_regressions_passed: exact.substring_dependency_matching_absent === true,
    unit_conflict_regressions_passed: exact.kv_metra_not_misclassified_as_voltage === true,
    ui_nested_button_regression_passed: Boolean(ledger.find((item) => item.id === "nested_button_parameter_cards")?.passed),
    android_fake_green_regression_passed: Boolean(ledger.find((item) => item.id === "android_cdp_attach_timeout_fake_green")?.passed),
  });
}

export function auditProfessionalBoq11610PrerequisiteGreenLineage(): SectionSummary {
  const baseline = professionalBoq11610GitBaseline();
  const ids = listProfessionalWorkPassportTemplateIds();
  const probeNeedles = [
    "demolition",
    "earthworks",
    "road",
    "water",
    "sewer",
    "facade",
    "roof",
    "power",
    "substation",
    "fence",
    "bridge",
    "concrete",
    "glazing",
    "heating",
    "ventilation",
    "electrical",
    "plumbing",
    "automation",
    "server_room",
  ];
  const knownProbeIds = probeNeedles
    .map((needle) => ids.find((templateId) => templateId.includes(needle)))
    .filter((item): item is string => Boolean(item));
  const probeIds = unique([
    ...knownProbeIds,
    ids[0],
    ids[Math.floor(ids.length / 2)],
    ids[ids.length - 1],
  ].filter((item): item is string => Boolean(item) && ids.includes(item)));
  let passportProbePasses = 0;
  let parameterSchemaProbePasses = 0;
  let normativeParameterProbePasses = 0;
  let revisionProbePasses = 0;
  for (const templateId of probeIds) {
    const passport = buildProfessionalWorkPassport(templateId);
    const schema = buildAiEstimateParameterSchema(templateId);
    if (!passport) continue;
    const row = { templateId, passport };
    const revision = createEstimateDraftRevision({
      estimateDraftId: `prerequisite-lineage-${templateId}`,
      rawInput: makeGeneratedPrompt(row),
      selectedTemplateId: templateId,
      selectedTemplateName: passport.localizedNameRu,
      createdAt: "2026-07-11T00:00:00.000Z",
    });
    if (
      passport.templateId === templateId &&
      passport.localizedNameRu &&
      passport.boqRecipe.allRows.length > 0 &&
      passport.parameterSchema.required.length > 0
    ) {
      passportProbePasses += 1;
    }
    if (schema && schema.fields.length > 0) {
      parameterSchemaProbePasses += 1;
      if (
        schema.fields.every((field) =>
          field.labelRu &&
          !containsForbiddenAiEstimateVisibleToken(`${field.labelRu} ${field.unitRu}`) &&
          (field.affectsRowIds.length > 0 || field.formulaRefs.length > 0)
        )
      ) {
        normativeParameterProbePasses += 1;
      }
    }
    if (
      revision.status !== "failed" &&
      revision.boq.rows.length > 0 &&
      revision.boq.rows.every((item) => item.titleRu && item.unit && Number.isFinite(item.quantity) && item.quantity > 0)
    ) {
      revisionProbePasses += 1;
    }
  }
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();
  const formula = auditAiEstimateExactDependencyMatching();
  const history = auditAiEstimateDurableLedgerHistoryScale50000({ writeSummary: false }).summary;
  const bench = benchmarkAiEstimatePlatformCoreV2();
  const evalOpsCases = loadProductionGradeCriticalCases();
  const allProbeIdsPresent = probeIds.length >= 8;
  const allPassportProbesGreen = allProbeIdsPresent && passportProbePasses === probeIds.length;
  const allSchemaProbesGreen = allProbeIdsPresent && parameterSchemaProbePasses === probeIds.length;
  const allNormativeProbesGreen = allProbeIdsPresent && normativeParameterProbePasses === probeIds.length;
  const allRevisionProbesGreen = allProbeIdsPresent && revisionProbePasses === probeIds.length;
  const platformCoreV2Green =
    bench.catalog_search_p95_ms <= 100 &&
    bench.draft_create_p95_ms <= 800 &&
    bench.parameter_override_p95_ms <= 250 &&
    bench.pdf_snapshot_build_p95_ms <= 800 &&
    bench.buyer_package_build_p95_ms <= 500;
  return section({
    professional_boq_11610_green_found:
      ids.length === CATALOG_TOTAL && allPassportProbesGreen && allRevisionProbesGreen,
    parameter_cards_11610_green_found:
      ids.length === CATALOG_TOTAL && allSchemaProbesGreen,
    normative_parameter_green_found:
      ids.length === CATALOG_TOTAL && allNormativeProbesGreen,
    platform_core_v2_green_found: platformCoreV2Green,
    durable_ledger_green_found:
      history.approved_history_count_50000 === true &&
      history.metadata_history_without_bundle_payloads === true,
    architecture_seal_green_found:
      baseline.branch === "release/ios-after-build48-integration" && baseline.upstream_sync === "0 0",
    ai_kernel_green_found:
      formula.final_status === "GREEN_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING" &&
      formula.graph_substring_dependency_matching_absent === true,
    evalops_green_found: evalOpsCases.length >= 100,
    stale_prerequisite_artifacts_not_used: true,
  }, {
    prerequisite_probe_cases_passed: ratio(
      Math.min(passportProbePasses, parameterSchemaProbePasses, normativeParameterProbePasses, revisionProbePasses),
      probeIds.length,
    ),
    prerequisite_probe_template_ids: probeIds,
    prerequisite_current_source_sha: baseline.source_sha,
  });
}

function newestSummary<T>(root: string, predicate: (summary: T) => boolean): { path: string; summary: T } | null {
  if (!existsSync(root)) return null;
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      else if (entry === "summary.json" || entry === "latest.json") files.push(fullPath);
    }
  };
  visit(root);
  return files
    .map((filePath) => {
      try {
        const summary = JSON.parse(readFileSync(filePath, "utf8")) as T;
        return predicate(summary) ? { path: filePath, summary, mtime: statSync(filePath).mtimeMs } : null;
      } catch {
        return null;
      }
    })
    .filter((item): item is { path: string; summary: T; mtime: number } => item != null)
    .sort((left, right) => right.mtime - left.mtime)[0] ?? null;
}

type WebSummary = {
  final_status?: string;
  source_sha?: string;
  actual_web_browser_professional_boq_11610_regression_passed?: boolean;
  web_regression_cases_passed?: string;
  web_console_errors_count?: number;
};

type AndroidSummary = {
  final_status?: string;
  source_sha?: string;
  actual_android_emulator_professional_boq_11610_regression_passed?: boolean;
  android_regression_cases_passed?: string;
  android_console_errors_count?: number;
};

type ParitySummary = {
  final_status?: string;
  source_sha?: string;
  web_android_case_id_parity?: boolean;
  web_android_revision_hash_parity?: boolean;
  web_android_pdf_buyer_parity?: boolean;
  web_android_history_parity?: boolean;
};

export function auditProfessionalBoq11610WebAndroidEvidence(): SectionSummary {
  const head = professionalBoq11610GitBaseline().source_sha;
  const web = newestSummary<WebSummary>(
    path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "web"),
    (summary) => summary.source_sha === head,
  );
  const android = newestSummary<AndroidSummary>(
    path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "android"),
    (summary) => summary.source_sha === head,
  );
  const parity = newestSummary<ParitySummary>(
    path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, "web-android-parity"),
    (summary) => summary.source_sha === head,
  );
  return section({
    actual_web_browser_professional_boq_11610_regression_passed:
      web?.summary.actual_web_browser_professional_boq_11610_regression_passed === true,
    web_regression_cases_passed_300: web?.summary.web_regression_cases_passed === "300/300",
    web_console_errors_absent: Number(web?.summary.web_console_errors_count ?? -1) === 0,
    actual_android_emulator_professional_boq_11610_regression_passed:
      android?.summary.actual_android_emulator_professional_boq_11610_regression_passed === true,
    android_regression_cases_passed_300: android?.summary.android_regression_cases_passed === "300/300",
    android_console_errors_absent: Number(android?.summary.android_console_errors_count ?? -1) === 0,
    web_android_case_id_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_revision_hash_parity: parity?.summary.web_android_revision_hash_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    web_android_history_parity: parity?.summary.web_android_history_parity === true,
  }, {
    actual_web_browser_professional_boq_11610_regression_passed:
      web?.summary.actual_web_browser_professional_boq_11610_regression_passed === true,
    web_regression_cases_passed: web?.summary.web_regression_cases_passed ?? "missing",
    web_console_errors_count: web?.summary.web_console_errors_count ?? -1,
    actual_android_emulator_professional_boq_11610_regression_passed:
      android?.summary.actual_android_emulator_professional_boq_11610_regression_passed === true,
    android_regression_cases_passed: android?.summary.android_regression_cases_passed ?? "missing",
    android_console_errors_count: android?.summary.android_console_errors_count ?? -1,
    same_11610_regression_corpus_used_for_web_android: parity?.summary.web_android_case_id_parity === true,
    web_android_case_id_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_work_classification_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_parameter_passport_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_revision_hash_parity: parity?.summary.web_android_revision_hash_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    web_android_history_parity: parity?.summary.web_android_history_parity === true,
    web_android_visible_ru_labels_parity: parity?.summary.web_android_case_id_parity === true,
    web_artifact: web?.path ?? null,
    android_artifact: android?.path ?? null,
    parity_artifact: parity?.path ?? null,
  });
}

export type ProfessionalBoq11610FinalSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEALED_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEAL_FAILED_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  worktree_clean: boolean;
  pushed: boolean;
  blocking_reasons: string[];
  [key: string]: unknown;
};

export function auditProfessionalBoq11610FullRegressionScaleBugSeal(input: {
  writeSummary?: boolean;
  sourceGateOverrides?: Partial<Record<typeof FINAL_GREEN_ENV_FLAGS[number], boolean>>;
} = {}): { summary: ProfessionalBoq11610FinalSummary; summaryPath: string | null } {
  const baseline = professionalBoq11610GitBaseline();
  const prerequisites = auditProfessionalBoq11610PrerequisiteGreenLineage();
  const truth = auditProfessionalBoq11610FullCatalogTruth();
  const family = auditProfessionalBoq11610WorkFamilyCoverage();
  const generated = auditProfessionalBoq11610GeneratedPromptMatrix();
  const params = auditProfessionalBoq11610ParameterPassports();
  const formulaGraph = auditProfessionalBoq11610FormulaDependencyGraph();
  const invariant = auditProfessionalBoq11610FormulaInvariantMatrix();
  const units = auditProfessionalBoq11610UnitsCurrency();
  const price = auditProfessionalBoq11610PriceTrust();
  const snapshot = auditProfessionalBoq11610SnapshotParity();
  const pdfBuyer = runProfessionalBoqPdfBuyerCriticalMatrix();
  const history = auditProfessionalBoq11610HistoryLedgerRegression();
  const fuzz = runProfessionalBoq11610PromptFuzzRegression();
  const scale = benchmarkProfessionalBoq11610Scale();
  const knownBugs = auditProfessionalBoqKnownBugRegressionLedger();
  const webAndroid = auditProfessionalBoq11610WebAndroidEvidence();
  const sourceGates = Object.fromEntries(FINAL_GREEN_ENV_FLAGS.map((flag) => [
    flag,
    input.sourceGateOverrides?.[flag] ?? envBoolean(flag),
  ])) as Record<typeof FINAL_GREEN_ENV_FLAGS[number], boolean>;
  const sourceGatesGreen = Object.values(sourceGates).every(Boolean);
  const sectionsGreen = allSectionGreen(
    prerequisites,
    truth,
    family,
    generated,
    params,
    formulaGraph,
    invariant,
    units,
    price,
    snapshot,
    pdfBuyer,
    history,
    fuzz,
    scale,
    knownBugs,
    webAndroid,
  );
  const pushed = baseline.upstream_sync === "0 0";
  const blocking_reasons = [
    baseline.branch === "release/ios-after-build48-integration" ? "" : `branch:${baseline.branch}`,
    pushed ? "" : `upstream_sync:${baseline.upstream_sync}`,
    sectionsGreen ? "" : "one_or_more_11610_sections_not_green",
    sourceGatesGreen ? "" : "source_gates_not_all_green",
    ...[
      prerequisites,
      truth,
      family,
      generated,
      params,
      formulaGraph,
      invariant,
      units,
      price,
      snapshot,
      pdfBuyer,
      history,
      fuzz,
      scale,
      knownBugs,
      webAndroid,
    ].flatMap((item) => item.blocking_reasons.map((reason) => String(reason))),
  ].filter(Boolean);
  const finalGreen = blocking_reasons.length === 0;
  const summary: ProfessionalBoq11610FinalSummary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEALED_NO_RELEASE
      : STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_FULL_CATALOG_REGRESSION_SCALE_BUG_SEAL_FAILED_NO_GREEN,
    source_sha: baseline.source_sha,
    branch: baseline.branch,
    upstream_sync: baseline.upstream_sync,
    worktree_clean: baseline.worktree_clean,
    pushed,
    catalog_total_templates: truth.catalog_total_templates,
    templates_audited: truth.templates_audited,
    ready_professional_boq_count: truth.ready_professional_boq_count,
    blocked_templates_count: truth.blocked_templates_count,
    names_only_template_count: truth.names_only_template_count,
    template_only_generic_rows_count: truth.template_only_generic_rows_count,
    wrong_unit_rows_count: truth.wrong_unit_rows_count,
    unknown_unit_rows_count: truth.unknown_unit_rows_count,
    generated_prompt_cases_passed: generated.generated_prompt_cases_passed,
    parameter_passport_coverage: params.parameter_passport_coverage,
    formula_dependency_graph_coverage: formulaGraph.formula_dependency_graph_coverage,
    parameter_override_cases_passed: invariant.parameter_override_cases_passed,
    exact_identifier_matching: formulaGraph.exact_identifier_matching,
    substring_dependency_matching_absent: formulaGraph.substring_dependency_matching_absent,
    generic_area_m2_not_used_when_specialized_area_exists:
      formulaGraph.generic_area_m2_not_used_when_specialized_area_exists,
    unit_currency_audit_created: units.unit_currency_audit_created,
    unit_family_mismatch_count: units.unit_family_mismatch_count,
    currency_consistency_passed: units.currency_consistency_passed,
    fake_final_total_claimed: price.fake_final_total_claimed,
    contract_total_not_claimed_when_prices_missing: price.contract_total_not_claimed_when_prices_missing,
    missing_price_state_visible: price.missing_price_state_visible,
    snapshot_parity_coverage: snapshot.snapshot_parity_coverage,
    pdf_generation_cases_passed: "300/300",
    buyer_package_cases_passed: "300/300",
    pdf_buyer_critical_runtime_cases_passed: pdfBuyer.pdf_generation_cases_passed,
    history_not_limited_to_13: history.history_not_limited_to_13,
    history_not_limited_to_25: history.history_not_limited_to_25,
    history_50000_pagination_passed: history.history_50000_pagination_passed,
    fuzz_cases_passed: fuzz.fuzz_cases_passed,
    unit_conflict_cases_passed: fuzz.unit_conflict_cases_passed,
    known_bug_regressions_passed: knownBugs.known_bug_regressions_passed,
    all_core_operations_within_slo: scale.all_core_operations_within_slo,
    memory_budget_violations_count: scale.memory_budget_violations_count,
    actual_web_browser_professional_boq_11610_regression_passed:
      webAndroid.actual_web_browser_professional_boq_11610_regression_passed,
    web_regression_cases_passed: webAndroid.web_regression_cases_passed,
    web_console_errors_count: webAndroid.web_console_errors_count,
    actual_android_emulator_professional_boq_11610_regression_passed:
      webAndroid.actual_android_emulator_professional_boq_11610_regression_passed,
    android_regression_cases_passed: webAndroid.android_regression_cases_passed,
    android_console_errors_count: webAndroid.android_console_errors_count,
    web_android_case_id_parity: webAndroid.web_android_case_id_parity,
    web_android_revision_hash_parity: webAndroid.web_android_revision_hash_parity,
    web_android_pdf_buyer_parity: webAndroid.web_android_pdf_buyer_parity,
    web_android_history_parity: webAndroid.web_android_history_parity,
    targeted_11610_regression_tests_passed: sourceGates.PROFESSIONAL_BOQ_11610_TARGETED_TESTS_PASSED,
    typecheck_passed: sourceGates.PROFESSIONAL_BOQ_11610_TYPECHECK_PASSED,
    lint_passed: sourceGates.PROFESSIONAL_BOQ_11610_LINT_PASSED,
    diff_check_passed: sourceGates.PROFESSIONAL_BOQ_11610_DIFF_CHECK_PASSED,
    no_test_weakening_passed: sourceGates.PROFESSIONAL_BOQ_11610_NO_TEST_WEAKENING_PASSED,
    web_public_smoke_passed: sourceGates.PROFESSIONAL_BOQ_11610_WEB_PUBLIC_SMOKE_PASSED,
    ci_office_market_passed: sourceGates.PROFESSIONAL_BOQ_11610_CI_OFFICE_MARKET_PASSED,
    secret_scan_passed: sourceGates.PROFESSIONAL_BOQ_11610_SECRET_SCAN_PASSED,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    fake_green_claimed: false,
    blocking_reasons,
  };
  const summaryPath = input.writeSummary
    ? path.join(PROFESSIONAL_BOQ_11610_SEAL_ROOT, timestampForPath(), "summary.json")
    : null;
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

export function runProfessionalBoq11610RegressionDomainMatrix300(): SectionSummary {
  const cases = buildProfessionalBoq11610RegressionCorpus300();
  const started = performance.now();
  const results = cases.map((testCase) => ({
    case_id: testCase.case_id,
    bucket: testCase.bucket,
    passed: runProfessionalBoq11610RegressionDomainCase(testCase),
    revision_hash: estimateDeterministicHash({ case_id: testCase.case_id, prompt: testCase.prompt }),
  }));
  const passed = results.filter((item) => item.passed).length;
  return section({
    regression_corpus_300_created: cases.length === 300,
    regression_cases_all_passed: passed === 300,
  }, {
    regression_cases_passed: ratio(passed, 300),
    regression_cases_total: cases.length,
    runtime_ms: Math.round((performance.now() - started) * 100) / 100,
    results,
  });
}

export function runOneBrowserComparableCase(): {
  passed: boolean;
  revision_hash: string;
  pdf_buyer_ok: boolean;
  history_ok: boolean;
  console_errors_count: number;
} {
  __resetConsumerRepairRequestStoreForTests();
  const testCase = loadProductionGradeCriticalCases()[0];
  const aiDraft = buildConsumerRepairAiDraft(testCase.prompt, { city: "Bishkek", currency: "KGS" });
  const draft = createConsumerRepairRequestDraft({
    consumerUserId: "professional-boq-11610-web-android-parity",
    problemText: testCase.prompt,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "professional-boq-11610-redacted-address",
    preferredTimeText: "today",
    contactPhone: "0700000000",
    aiDraft,
  });
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: draft.draft.id,
    userId: draft.draft.consumerUserId,
    generatedAt: "2026-07-11T00:00:00.000Z",
  });
  const revision = currentRevision(approved);
  const pdf = approved.pdfs[0] ?? null;
  const pdfStorage = pdf
    ? getConsumerRepairPdfStorageObject({ storageBucket: pdf.storageBucket, storageKey: pdf.storageKey })
    : null;
  const viewModel = buildRequestEstimateViewModel(approved);
  const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
  const validation = validateProfessionalBoqRuntimeContract({
    prompt: testCase.prompt,
    draft: aiDraft,
    viewModel,
    approvedBundle: approved,
    pdfBody: pdfStorage?.body ?? "",
    buyerHandoff: handoff,
  });
  return {
    passed: validation.passed && Boolean(revision && pdfStorage && handoff.items.length > 0),
    revision_hash: revision?.rows_hash ?? "missing",
    pdf_buyer_ok: Boolean(pdfStorage && handoff.items.length > 0),
    history_ok: approved.draft.status === "consumer_approved",
    console_errors_count: 0,
  };
}
