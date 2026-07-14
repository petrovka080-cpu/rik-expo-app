import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  buildAiEstimateParameterSchema,
  clearAiEstimateParameterSchemaCache,
  type AiEstimateParameterSchema,
} from "../../src/lib/estimate/aiEstimateParameterSchema";
import { parseInlineWorkEstimatePrompt } from "../../src/lib/ai/parseInlineWorkEstimatePrompt";
import {
  containsForbiddenAiEstimateVisibleToken,
  hasHumanReadableAiEstimateParameterPassport,
  isAiEstimateGenericParameterLabel,
} from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import { validateProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";
import { auditPublicReferenceEstimateOwnership } from "../../src/lib/estimate/publicReferenceEstimateOwnership";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport } from "../../src/lib/estimate/workPassportContract";

export const GREEN_AI_ESTIMATE_11610_CATALOG_TRUTH_GAP_LEDGER_READY_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_CATALOG_TRUTH_GAP_LEDGER_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_RAW_INPUT_AND_PROFESSIONAL_BOQ_TRUTH_INCOMPLETE_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_RAW_INPUT_AND_PROFESSIONAL_BOQ_TRUTH_INCOMPLETE_NO_RELEASE" as const;

const CATALOG_TOTAL = 11610;
const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-11610-catalog-truth-gap-ledger");

type GapStatus = "ready" | "partial" | "missing" | "blocked";

export type CatalogTruthGapLedgerRow = {
  work_id: string;
  canonical_name_ru: string;
  template_kind: string;
  work_family_id: string;
  raw_input_parser_status: GapStatus;
  raw_input_probe_count: number;
  raw_input_probe_passed_count: number;
  raw_input_facts_count: number;
  ignored_explicit_facts_count: number;
  wrong_fact_units_count: number;
  facts_without_passport_owner_count: number;
  facts_without_formula_ownership_count: number;
  facts_overwritten_by_defaults_count: number;
  parameter_passport_status: GapStatus;
  parameter_graph_status: GapStatus;
  material_assembly_status: GapStatus;
  work_operations_status: GapStatus;
  service_operations_status: GapStatus;
  equipment_status: GapStatus;
  formula_status: GapStatus;
  unit_status: GapStatus;
  norm_source_status: GapStatus;
  reference_estimate_status: GapStatus;
  reference_owner_id: string | null;
  reference_family_id: string | null;
  reference_validation_status: string | null;
  reference_source_registry_ids_count: number;
  reference_source_url_present: boolean;
  generic_rows_count: number;
  filler_rows_count: number;
  wrong_unit_count: number;
  rows_without_formula_count: number;
  rows_without_norm_source_count: number;
  row_count: number;
  material_rows_count: number;
  work_rows_count: number;
  labor_rows_count: number;
  service_rows_count: number;
  equipment_rows_count: number;
  transport_rows_count: number;
  professional_readiness: "ready" | "blocked";
  blockers: string[];
};

export type CatalogTruthGapLedgerSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_11610_CATALOG_TRUTH_GAP_LEDGER_READY_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_11610_RAW_INPUT_AND_PROFESSIONAL_BOQ_TRUTH_INCOMPLETE_NO_RELEASE;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  worktree_clean: boolean;
  catalog_total: number;
  ready_count: number;
  blocked_count: number;
  raw_input_binding_ready_count: number;
  raw_input_binding_missing_count: number;
  raw_input_probe_count: number;
  raw_input_probe_passed_count: number;
  ignored_explicit_facts_count: number;
  wrong_fact_units_count: number;
  facts_without_passport_owner_count: number;
  facts_without_formula_ownership_count: number;
  facts_overwritten_by_defaults_count: number;
  parameter_passport_missing_count: number;
  material_assembly_missing_count: number;
  work_operation_missing_count: number;
  service_ownership_missing_count: number;
  equipment_ownership_missing_count: number;
  formula_missing_count: number;
  norm_source_missing_count: number;
  reference_estimate_ready_count: number;
  reference_estimate_missing_count: number;
  reference_owner_unique_count: number;
  reference_family_unique_count: number;
  reference_global_singleton_violation_count: number;
  generic_rows_count: number;
  filler_rows_count: number;
  wrong_unit_count: number;
  rows_without_formula_count: number;
  rows_without_norm_source_count: number;
  release_started: false;
  deploy_started: false;
  eas_started: false;
  native_build_started: false;
  production_db_touched: false;
  main_changed: false;
  pr44_changed: false;
  fake_green_claimed: false;
  ledger_artifact: string | null;
  summary_artifact: string | null;
  blocking_reasons: string[];
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

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function compactText(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function isGenericRow(row: ProfessionalBoqRecipeRow): boolean {
  const text = compactText(`${row.rowId} ${row.titleRu}`);
  return /\b(generic|fallback|placeholder|template only|template_only|todo|main material|additional material|main work|installation work|work by template|materials by template|service by template)\b/i.test(text) ||
    /^(work|works|materials|equipment|services|transport|other|item|row|boq row)$/i.test(text);
}

function isFillerRow(row: ProfessionalBoqRecipeRow): boolean {
  const text = compactText(`${row.rowId} ${row.titleRu} ${row.formulaId} ${row.normId}`);
  return /\b(filler|minimum rows|minimumrows|min rows|professional depth|professionaldepth|supplement|domain block|category prefix|synthetic category|template only|template_only)\b/i.test(text);
}

function rowsWithoutNormSource(rows: readonly ProfessionalBoqRecipeRow[]): number {
  return rows.filter((row) => !row.normSourceId || !row.normId || !row.normVersion).length;
}

function rowsWithoutFormula(rows: readonly ProfessionalBoqRecipeRow[]): number {
  return rows.filter((row) => !row.formulaId || !row.quantityFormula || !row.calculationTraceTemplate).length;
}

function wrongUnitRows(passport: ProfessionalWorkPassport, rows: readonly ProfessionalBoqRecipeRow[]): number {
  return rows.filter((row) => !validateProfessionalBoqUnit({
    unit: row.sourceUnit,
    rowLabel: row.titleRu,
    rowCode: row.rowId,
    rowKind: row.rowType,
    workFamily: passport.familyId,
    normId: row.normId,
    normPackId: row.normFamilyId,
    normSourceId: row.normSourceId,
  }).valid).length;
}

function statusForRows(count: number): GapStatus {
  return count > 0 ? "ready" : "missing";
}

function statusForBlocking(blocking: boolean): GapStatus {
  return blocking ? "blocked" : "ready";
}

function parameterAudit(templateId: string): {
  status: GapStatus;
  graphStatus: GapStatus;
  blockers: string[];
  schema: AiEstimateParameterSchema | null;
} {
  const schema = buildAiEstimateParameterSchema(templateId);
  if (!schema || schema.fields.length === 0) {
    return {
      status: "missing",
      graphStatus: "missing",
      blockers: ["parameter_schema_missing"],
      schema: null,
    };
  }
  const blockers: string[] = [];
  let disconnected = 0;
  for (const field of schema.fields) {
    const visible = `${field.labelRu} ${field.unitRu}`;
    if (!hasHumanReadableAiEstimateParameterPassport(field.key, field.labelRu)) {
      blockers.push(`UNMAPPED_VISIBLE_PARAMETER_KEY:${field.key}`);
    }
    if (isAiEstimateGenericParameterLabel(field.labelRu)) {
      blockers.push(`generic_parameter_label:${field.key}`);
    }
    if (containsForbiddenAiEstimateVisibleToken(visible)) {
      blockers.push(`raw_technical_parameter_visible:${field.key}`);
    }
    if (field.affectsRowIds.length === 0 && field.formulaRefs.length === 0) {
      disconnected += 1;
    }
  }
  if (disconnected > 0) blockers.push(`parameter_graph_disconnected:${disconnected}`);
  return {
    status: blockers.some((item) => item.startsWith("UNMAPPED_VISIBLE_PARAMETER_KEY") || item.startsWith("generic_parameter_label") || item.startsWith("raw_technical_parameter_visible"))
      ? "blocked"
      : "ready",
    graphStatus: disconnected > 0 ? "partial" : "ready",
    blockers,
    schema,
  };
}

function rawInputProbePrompts(passport: ProfessionalWorkPassport): string[] {
  const name = passport.localizedNameRu || passport.workDescription.titleRu || passport.templateId;
  return [
    `${name} area 100 m2 volume 25 m3 count 4 pieces power 100 MW`,
    `${name} length 12 m width 5 m height 3 m thickness 0.2 m depth 300 mm`,
    `${name} area 1500 sqm line length 5 km d132 cable 4x50 turnkey`,
  ];
}

function rawInputFactReady(input: {
  fact: { canonical_parameter_key: string; source: string; raw_text: string; evidence_start: number; evidence_end: number; passport_owner: string; affected_formulas: string[] };
  schemaFieldKeys: ReadonlySet<string>;
  passport: ProfessionalWorkPassport;
  rawInputLength: number;
}): boolean {
  if (!input.schemaFieldKeys.has(input.fact.canonical_parameter_key)) return false;
  if (input.fact.source !== "USER_RAW_INPUT") return false;
  if (!input.fact.raw_text.trim()) return false;
  if (input.fact.evidence_start < 0 || input.fact.evidence_end <= input.fact.evidence_start) return false;
  if (input.fact.evidence_end > input.rawInputLength) return false;
  if (input.fact.passport_owner !== input.passport.familyId && input.fact.passport_owner !== input.passport.templateId) return false;
  if (input.fact.affected_formulas.length === 0) return false;
  return true;
}

function unitsCompatible(expectedUnit: string | null | undefined, actualUnit: string | null | undefined): boolean {
  if (!expectedUnit || !actualUnit) return true;
  return expectedUnit.toLowerCase() === actualUnit.toLowerCase();
}

function rawInputAudit(input: {
  templateId: string;
  passport: ProfessionalWorkPassport;
  schema: AiEstimateParameterSchema | null;
}): {
  status: GapStatus;
  blockers: string[];
  probeCount: number;
  passedProbeCount: number;
  factsCount: number;
  ignoredExplicitFactsCount: number;
  wrongFactUnitsCount: number;
  factsWithoutPassportOwnerCount: number;
  factsWithoutFormulaOwnershipCount: number;
  factsOverwrittenByDefaultsCount: number;
} {
  if (!input.passport.parameterSchema.freeOrderWorkParamsSupported) {
    return {
      status: "missing",
      blockers: ["raw_input_free_order_not_supported"],
      probeCount: 0,
      passedProbeCount: 0,
      factsCount: 0,
      ignoredExplicitFactsCount: 0,
      wrongFactUnitsCount: 0,
      factsWithoutPassportOwnerCount: 0,
      factsWithoutFormulaOwnershipCount: 0,
      factsOverwrittenByDefaultsCount: 0,
    };
  }
  if (!input.schema || input.schema.fields.length === 0) {
    return {
      status: "missing",
      blockers: ["raw_input_parameter_schema_missing"],
      probeCount: 0,
      passedProbeCount: 0,
      factsCount: 0,
      ignoredExplicitFactsCount: 0,
      wrongFactUnitsCount: 0,
      factsWithoutPassportOwnerCount: 0,
      factsWithoutFormulaOwnershipCount: 0,
      factsOverwrittenByDefaultsCount: 0,
    };
  }

  const schemaFieldKeys = new Set(input.schema.fields.map((field) => field.key));
  const schemaFieldsByKey = new Map(input.schema.fields.map((field) => [field.key, field]));
  const probes = rawInputProbePrompts(input.passport);
  const failures: string[] = [];
  let passed = 0;
  let factsCount = 0;
  let ignoredExplicitFactsCount = 0;
  let wrongFactUnitsCount = 0;
  let factsWithoutPassportOwnerCount = 0;
  let factsWithoutFormulaOwnershipCount = 0;
  let factsOverwrittenByDefaultsCount = 0;

  for (const [index, prompt] of probes.entries()) {
    const parse = parseInlineWorkEstimatePrompt({
      rawInput: prompt,
      selectedTemplateId: input.templateId,
    });
    ignoredExplicitFactsCount += parse.rawInputFactExtraction.metrics.explicit_input_facts_ignored;
    wrongFactUnitsCount += parse.rawInputFactExtraction.metrics.explicit_input_unit_mismatches;
    factsOverwrittenByDefaultsCount += parse.rawInputFactExtraction.metrics.explicit_input_facts_overwritten_by_default;
    const schemaFacts = parse.rawInputFacts.filter((fact) => schemaFieldKeys.has(fact.canonical_parameter_key));
    factsCount += schemaFacts.length;
    factsWithoutPassportOwnerCount += schemaFacts.filter((fact) => !fact.passport_owner.trim()).length;
    factsWithoutFormulaOwnershipCount += schemaFacts.filter((fact) => fact.affected_formulas.length === 0).length;
    wrongFactUnitsCount += schemaFacts.filter((fact) => {
      const field = schemaFieldsByKey.get(fact.canonical_parameter_key);
      return field ? !unitsCompatible(field.unit, fact.normalized_unit) : false;
    }).length;
    const readyFacts = parse.rawInputFacts.filter((fact) =>
      rawInputFactReady({
        fact,
        schemaFieldKeys,
        passport: input.passport,
        rawInputLength: parse.rawInput.length,
      })
    );
    const metricsClean =
      parse.rawInputFactExtraction.metrics.explicit_input_facts_ignored === 0 &&
      parse.rawInputFactExtraction.metrics.explicit_input_unit_mismatches === 0 &&
      parse.rawInputFactExtraction.metrics.explicit_input_facts_overwritten_by_default === 0;
    const probeReady =
      parse.matchedTemplate?.templateId === input.templateId &&
      parse.canBuildPreliminaryEstimate &&
      readyFacts.length > 0 &&
      metricsClean;
    if (probeReady) {
      passed += 1;
      continue;
    }
    failures.push(`raw_input_probe_${index + 1}_failed:${[
      parse.matchedTemplate?.templateId === input.templateId ? "" : "selected_template_lock_failed",
      parse.canBuildPreliminaryEstimate ? "" : "preliminary_parse_not_buildable",
      readyFacts.length > 0 ? "" : "schema_bound_facts_missing",
      metricsClean ? "" : "raw_fact_metrics_not_clean",
    ].filter(Boolean).join("|")}`);
  }

  if (ignoredExplicitFactsCount > 0) failures.push(`ignored_explicit_facts:${ignoredExplicitFactsCount}`);
  if (wrongFactUnitsCount > 0) failures.push(`wrong_fact_units:${wrongFactUnitsCount}`);
  if (factsWithoutPassportOwnerCount > 0) failures.push(`facts_without_passport_owner:${factsWithoutPassportOwnerCount}`);
  if (factsWithoutFormulaOwnershipCount > 0) failures.push(`facts_without_formula_ownership:${factsWithoutFormulaOwnershipCount}`);
  if (factsOverwrittenByDefaultsCount > 0) failures.push(`facts_overwritten_by_defaults:${factsOverwrittenByDefaultsCount}`);

  return {
    status: passed === probes.length && failures.length === 0 ? "ready" : passed > 0 ? "partial" : "missing",
    blockers: failures,
    probeCount: probes.length,
    passedProbeCount: passed,
    factsCount,
    ignoredExplicitFactsCount,
    wrongFactUnitsCount,
    factsWithoutPassportOwnerCount,
    factsWithoutFormulaOwnershipCount,
    factsOverwrittenByDefaultsCount,
  };
}

function rowForTemplate(templateId: string): CatalogTruthGapLedgerRow {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) {
    return {
      work_id: templateId,
      canonical_name_ru: "",
      template_kind: "missing",
      work_family_id: "",
      raw_input_parser_status: "missing",
      raw_input_probe_count: 0,
      raw_input_probe_passed_count: 0,
      raw_input_facts_count: 0,
      ignored_explicit_facts_count: 0,
      wrong_fact_units_count: 0,
      facts_without_passport_owner_count: 0,
      facts_without_formula_ownership_count: 0,
      facts_overwritten_by_defaults_count: 0,
      parameter_passport_status: "missing",
      parameter_graph_status: "missing",
      material_assembly_status: "missing",
      work_operations_status: "missing",
      service_operations_status: "missing",
      equipment_status: "missing",
      formula_status: "missing",
      unit_status: "missing",
      norm_source_status: "missing",
      reference_estimate_status: "missing",
      reference_owner_id: null,
      reference_family_id: null,
      reference_validation_status: null,
      reference_source_registry_ids_count: 0,
      reference_source_url_present: false,
      generic_rows_count: 0,
      filler_rows_count: 0,
      wrong_unit_count: 0,
      rows_without_formula_count: 0,
      rows_without_norm_source_count: 0,
      row_count: 0,
      material_rows_count: 0,
      work_rows_count: 0,
      labor_rows_count: 0,
      service_rows_count: 0,
      equipment_rows_count: 0,
      transport_rows_count: 0,
      professional_readiness: "blocked",
      blockers: ["work_passport_missing"],
    };
  }
  const rows = passport.boqRecipe.allRows;
  const parameter = parameterAudit(templateId);
  const rawInput = rawInputAudit({
    templateId,
    passport,
    schema: parameter.schema,
  });
  const genericRowsCount = rows.filter(isGenericRow).length;
  const fillerRowsCount = rows.filter(isFillerRow).length;
  const wrongUnitCount = wrongUnitRows(passport, rows);
  const rowsWithoutFormulaCount = rowsWithoutFormula(rows);
  const rowsWithoutNormSourceCount = rowsWithoutNormSource(rows);
  const rawInputParserStatus = rawInput.status;
  const materialAssemblyStatus = statusForRows(passport.boqRecipe.materialRows.length);
  const workOperationsStatus = statusForRows(passport.boqRecipe.workRows.length + passport.boqRecipe.laborRows.length);
  const serviceOperationsStatus = statusForRows(passport.boqRecipe.serviceRows.length + passport.boqRecipe.transportRows.length);
  const equipmentStatus = statusForRows(passport.boqRecipe.equipmentRows.length);
  const formulaStatus = statusForBlocking(rowsWithoutFormulaCount > 0);
  const unitStatus = statusForBlocking(wrongUnitCount > 0);
  const normSourceStatus = statusForBlocking(rowsWithoutNormSourceCount > 0 || passport.sources.sourceRegistryIds.length === 0);
  const reference = auditPublicReferenceEstimateOwnership(passport);
  const referenceEstimateStatus: GapStatus = reference.ready ? "ready" : "missing";
  const blockers = [
    rawInputParserStatus === "ready" ? "" : `raw_input_parser_${rawInputParserStatus}`,
    parameter.status === "ready" ? "" : `parameter_passport_${parameter.status}`,
    parameter.graphStatus === "ready" ? "" : `parameter_graph_${parameter.graphStatus}`,
    materialAssemblyStatus === "ready" ? "" : "material_assembly_missing",
    workOperationsStatus === "ready" ? "" : "work_operations_missing",
    serviceOperationsStatus === "ready" ? "" : "service_operations_missing",
    equipmentStatus === "ready" ? "" : "equipment_ownership_missing",
    formulaStatus === "ready" ? "" : `formula_rows_missing:${rowsWithoutFormulaCount}`,
    unitStatus === "ready" ? "" : `wrong_units:${wrongUnitCount}`,
    normSourceStatus === "ready" ? "" : `norm_source_missing:${rowsWithoutNormSourceCount}`,
    referenceEstimateStatus === "ready" ? "" : "reference_estimate_missing",
    ...reference.blockers.map((blocker) => `reference_ownership:${blocker}`),
    genericRowsCount === 0 ? "" : `generic_rows:${genericRowsCount}`,
    fillerRowsCount === 0 ? "" : `filler_rows:${fillerRowsCount}`,
    ...parameter.blockers,
    ...rawInput.blockers,
  ].filter(Boolean);
  return {
    work_id: templateId,
    canonical_name_ru: passport.localizedNameRu,
    template_kind: passport.templateKind,
    work_family_id: passport.familyId,
    raw_input_parser_status: rawInputParserStatus,
    raw_input_probe_count: rawInput.probeCount,
    raw_input_probe_passed_count: rawInput.passedProbeCount,
    raw_input_facts_count: rawInput.factsCount,
    ignored_explicit_facts_count: rawInput.ignoredExplicitFactsCount,
    wrong_fact_units_count: rawInput.wrongFactUnitsCount,
    facts_without_passport_owner_count: rawInput.factsWithoutPassportOwnerCount,
    facts_without_formula_ownership_count: rawInput.factsWithoutFormulaOwnershipCount,
    facts_overwritten_by_defaults_count: rawInput.factsOverwrittenByDefaultsCount,
    parameter_passport_status: parameter.status,
    parameter_graph_status: parameter.graphStatus,
    material_assembly_status: materialAssemblyStatus,
    work_operations_status: workOperationsStatus,
    service_operations_status: serviceOperationsStatus,
    equipment_status: equipmentStatus,
    formula_status: formulaStatus,
    unit_status: unitStatus,
    norm_source_status: normSourceStatus,
    reference_estimate_status: referenceEstimateStatus,
    reference_owner_id: reference.ownership?.reference_owner_id ?? null,
    reference_family_id: reference.ownership?.reference_family_id ?? null,
    reference_validation_status: reference.ownership?.validation_status ?? null,
    reference_source_registry_ids_count: reference.ownership?.source_registry_ids.length ?? 0,
    reference_source_url_present: Boolean(reference.ownership?.source_url),
    generic_rows_count: genericRowsCount,
    filler_rows_count: fillerRowsCount,
    wrong_unit_count: wrongUnitCount,
    rows_without_formula_count: rowsWithoutFormulaCount,
    rows_without_norm_source_count: rowsWithoutNormSourceCount,
    row_count: rows.length,
    material_rows_count: passport.boqRecipe.materialRows.length,
    work_rows_count: passport.boqRecipe.workRows.length,
    labor_rows_count: passport.boqRecipe.laborRows.length,
    service_rows_count: passport.boqRecipe.serviceRows.length,
    equipment_rows_count: passport.boqRecipe.equipmentRows.length,
    transport_rows_count: passport.boqRecipe.transportRows.length,
    professional_readiness: blockers.length === 0 ? "ready" : "blocked",
    blockers,
  };
}

function countByStatus(rows: readonly CatalogTruthGapLedgerRow[], field: keyof CatalogTruthGapLedgerRow): number {
  return rows.filter((row) => row[field] !== "ready").length;
}

export function auditAiEstimate11610CatalogTruthGapLedger(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
} = {}): {
  summary: CatalogTruthGapLedgerSummary;
  ledger: CatalogTruthGapLedgerRow[];
  outDir: string | null;
  ledgerPath: string | null;
  summaryPath: string | null;
} {
  const templateIds = listProfessionalWorkPassportTemplateIds();
  const ledger: CatalogTruthGapLedgerRow[] = [];
  for (const [index, templateId] of templateIds.entries()) {
    ledger.push(rowForTemplate(templateId));
    if (index > 0 && index % 100 === 0) {
      clearProfessionalWorkPassportBuildCaches();
      clearAiEstimateParameterSchemaCache();
    }
  }
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateParameterSchemaCache();

  const ready = ledger.filter((row) => row.professional_readiness === "ready").length;
  const blocked = ledger.length - ready;
  const outDir = input.writeLedger || input.writeSummary ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "catalog-truth-gap-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "catalog-truth-gap-summary.json") : null;
  const blockingReasons = ledger
    .filter((row) => row.blockers.length > 0)
    .flatMap((row) => row.blockers.map((reason) => `${row.work_id}:${reason}`));
  const summary: CatalogTruthGapLedgerSummary = {
    final_status: ledger.length === CATALOG_TOTAL && blocked === 0
      ? GREEN_AI_ESTIMATE_11610_CATALOG_TRUTH_GAP_LEDGER_READY_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_RAW_INPUT_AND_PROFESSIONAL_BOQ_TRUTH_INCOMPLETE_NO_RELEASE,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "HEAD...origin/feature/ai-estimate-11610-parameter-material-truth"], "unknown").replace(/\s+/g, " "),
    worktree_clean: gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "",
    catalog_total: ledger.length,
    ready_count: ready,
    blocked_count: blocked,
    raw_input_binding_ready_count: ledger.filter((row) => row.raw_input_parser_status === "ready").length,
    raw_input_binding_missing_count: countByStatus(ledger, "raw_input_parser_status"),
    raw_input_probe_count: ledger.reduce((sum, row) => sum + row.raw_input_probe_count, 0),
    raw_input_probe_passed_count: ledger.reduce((sum, row) => sum + row.raw_input_probe_passed_count, 0),
    ignored_explicit_facts_count: ledger.reduce((sum, row) => sum + row.ignored_explicit_facts_count, 0),
    wrong_fact_units_count: ledger.reduce((sum, row) => sum + row.wrong_fact_units_count, 0),
    facts_without_passport_owner_count: ledger.reduce((sum, row) => sum + row.facts_without_passport_owner_count, 0),
    facts_without_formula_ownership_count: ledger.reduce((sum, row) => sum + row.facts_without_formula_ownership_count, 0),
    facts_overwritten_by_defaults_count: ledger.reduce((sum, row) => sum + row.facts_overwritten_by_defaults_count, 0),
    parameter_passport_missing_count: countByStatus(ledger, "parameter_passport_status"),
    material_assembly_missing_count: countByStatus(ledger, "material_assembly_status"),
    work_operation_missing_count: countByStatus(ledger, "work_operations_status"),
    service_ownership_missing_count: countByStatus(ledger, "service_operations_status"),
    equipment_ownership_missing_count: countByStatus(ledger, "equipment_status"),
    formula_missing_count: countByStatus(ledger, "formula_status"),
    norm_source_missing_count: countByStatus(ledger, "norm_source_status"),
    reference_estimate_ready_count: ledger.filter((row) => row.reference_estimate_status === "ready").length,
    reference_estimate_missing_count: countByStatus(ledger, "reference_estimate_status"),
    reference_owner_unique_count: new Set(ledger.map((row) => row.reference_owner_id).filter(Boolean)).size,
    reference_family_unique_count: new Set(ledger.map((row) => row.reference_family_id).filter(Boolean)).size,
    reference_global_singleton_violation_count: new Set(ledger.map((row) => row.reference_owner_id).filter(Boolean)).size <= 1 ? 1 : 0,
    generic_rows_count: ledger.reduce((sum, row) => sum + row.generic_rows_count, 0),
    filler_rows_count: ledger.reduce((sum, row) => sum + row.filler_rows_count, 0),
    wrong_unit_count: ledger.reduce((sum, row) => sum + row.wrong_unit_count, 0),
    rows_without_formula_count: ledger.reduce((sum, row) => sum + row.rows_without_formula_count, 0),
    rows_without_norm_source_count: ledger.reduce((sum, row) => sum + row.rows_without_norm_source_count, 0),
    release_started: false,
    deploy_started: false,
    eas_started: false,
    native_build_started: false,
    production_db_touched: false,
    main_changed: false,
    pr44_changed: false,
    fake_green_claimed: false,
    ledger_artifact: ledgerPath,
    summary_artifact: summaryPath,
    blocking_reasons: blockingReasons.slice(0, 300),
  };
  if (ledgerPath) writeJsonl(ledgerPath, ledger);
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, ledger, outDir, ledgerPath, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimate11610CatalogTruthGapLedger({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    branch: result.summary.branch,
    upstream_sync: result.summary.upstream_sync,
    catalog_total: result.summary.catalog_total,
    ready_count: result.summary.ready_count,
    blocked_count: result.summary.blocked_count,
    raw_input_binding_ready_count: result.summary.raw_input_binding_ready_count,
    raw_input_binding_missing_count: result.summary.raw_input_binding_missing_count,
    raw_input_probe_count: result.summary.raw_input_probe_count,
    raw_input_probe_passed_count: result.summary.raw_input_probe_passed_count,
    ignored_explicit_facts_count: result.summary.ignored_explicit_facts_count,
    wrong_fact_units_count: result.summary.wrong_fact_units_count,
    facts_without_passport_owner_count: result.summary.facts_without_passport_owner_count,
    facts_without_formula_ownership_count: result.summary.facts_without_formula_ownership_count,
    facts_overwritten_by_defaults_count: result.summary.facts_overwritten_by_defaults_count,
    parameter_passport_missing_count: result.summary.parameter_passport_missing_count,
    material_assembly_missing_count: result.summary.material_assembly_missing_count,
    work_operation_missing_count: result.summary.work_operation_missing_count,
    service_ownership_missing_count: result.summary.service_ownership_missing_count,
    equipment_ownership_missing_count: result.summary.equipment_ownership_missing_count,
    formula_missing_count: result.summary.formula_missing_count,
    norm_source_missing_count: result.summary.norm_source_missing_count,
    reference_estimate_ready_count: result.summary.reference_estimate_ready_count,
    reference_estimate_missing_count: result.summary.reference_estimate_missing_count,
    reference_owner_unique_count: result.summary.reference_owner_unique_count,
    reference_family_unique_count: result.summary.reference_family_unique_count,
    reference_global_singleton_violation_count: result.summary.reference_global_singleton_violation_count,
    generic_rows_count: result.summary.generic_rows_count,
    filler_rows_count: result.summary.filler_rows_count,
    wrong_unit_count: result.summary.wrong_unit_count,
    ledger_artifact: result.summary.ledger_artifact,
    summary_artifact: result.summary.summary_artifact,
    blockers: result.summary.blocking_reasons.slice(0, 20),
  }, null, 2));
  if (hasFlag("fail-on-blocker") && result.summary.final_status !== GREEN_AI_ESTIMATE_11610_CATALOG_TRUTH_GAP_LEDGER_READY_NO_RELEASE) {
    process.exitCode = 1;
  }
}
