import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  buildProfessionalEstimateComplexityProfile,
  ESTIMATE_BOQ_MINIMUM_ROWS,
  type EstimateBoqDepthClass,
} from "../../src/lib/ai/globalEstimate/estimateBoqDepthPolicy";
import {
  containsRawFormulaOrDebugProfessionalBoqName,
  isGenericProfessionalBoqLineItemName,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";
import { normalizeProfessionalBoqText } from "../../src/lib/estimate/professionalNomenclatureResolver";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import type { ProfessionalBoqRecipeRow, ProfessionalWorkPassport } from "../../src/lib/estimate/workPassportContract";

export const GREEN_AI_ESTIMATE_11610_COMPLEXITY_ADAPTIVE_DEEP_BOQ_DEPTH_SOURCE_READY =
  "GREEN_AI_ESTIMATE_11610_COMPLEXITY_ADAPTIVE_DEEP_BOQ_DEPTH_SOURCE_READY" as const;
export const STOP_AI_ESTIMATE_11610_COMPLEXITY_ADAPTIVE_DEEP_BOQ_DEPTH_BLOCKED =
  "STOP_AI_ESTIMATE_11610_COMPLEXITY_ADAPTIVE_DEEP_BOQ_DEPTH_BLOCKED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-complexity-adaptive-deep-boq-depth");
const LEVELS: EstimateBoqDepthClass[] = [
  "local_operation",
  "full_professional",
  "complex_professional",
  "industrial_infrastructure",
  "mega_project",
];

type LevelStats = {
  count: number;
  minimum_required: number;
  min_rows: number;
  max_rows: number;
  total_rows: number;
  average_rows: number;
  below_minimum_count: number;
};

type LedgerRow = {
  template_id: string;
  work_key: string;
  family_id: string;
  title_ru: string;
  complexity_level: EstimateBoqDepthClass;
  minimum_required_rows: number;
  row_count: number;
  meaningful_row_count: number;
  material_rows: number;
  operation_rows: number;
  support_rows: number;
  blocking_reasons: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
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

function passportText(passport: ProfessionalWorkPassport): string {
  return [
    passport.templateId,
    passport.workKey,
    passport.familyId,
    passport.category,
    passport.localizedNameRu,
    ...passport.aliases,
  ].join(" ");
}

function complexityForPassport(passport: ProfessionalWorkPassport) {
  const text = passportText(passport);
  return buildProfessionalEstimateComplexityProfile({
    work: {
      workKey: passport.workKey,
      title: text,
      category: passport.category,
    },
    input: {
      volume: passport.boqRecipe.rowCount,
      unit: "set",
      originalText: text,
    },
    requiresReview: passport.riskPolicy.specialistReviewNoteRequired,
  } as any);
}

function hasSourceFormulaAndTrace(row: ProfessionalBoqRecipeRow): boolean {
  return Boolean(
    row.rowId &&
      row.titleRu &&
      row.sourceUnit &&
      row.normId &&
      row.normFamilyId &&
      row.normSourceId &&
      row.normVersion &&
      row.formulaId &&
      row.quantityFormula &&
      row.calculationTraceTemplate,
  );
}

function semanticSignature(row: ProfessionalBoqRecipeRow): string {
  return [
    row.rowType,
    normalizeProfessionalBoqText(row.titleRu),
    normalizeProfessionalBoqText(row.sourceUnit),
    normalizeProfessionalBoqText(row.quantityFormula),
  ].join("|");
}

function ledgerForPassport(passport: ProfessionalWorkPassport): LedgerRow {
  const profile = complexityForPassport(passport);
  const rows = passport.boqRecipe.allRows;
  const signatureCounts = new Map<string, number>();
  for (const row of rows) signatureCounts.set(semanticSignature(row), (signatureCounts.get(semanticSignature(row)) ?? 0) + 1);
  const duplicateRows = rows.filter((row) => (signatureCounts.get(semanticSignature(row)) ?? 0) > 1);
  const genericRows = rows.filter((row) => isGenericProfessionalBoqLineItemName(row.titleRu));
  const rawRows = rows.filter((row) => containsRawFormulaOrDebugProfessionalBoqName(row.titleRu));
  const missingTraceRows = rows.filter((row) => !hasSourceFormulaAndTrace(row));
  const meaningfulRows = rows.filter((row) =>
    !isGenericProfessionalBoqLineItemName(row.titleRu) &&
    !containsRawFormulaOrDebugProfessionalBoqName(row.titleRu) &&
    (signatureCounts.get(semanticSignature(row)) ?? 0) === 1 &&
    hasSourceFormulaAndTrace(row)
  );
  const operationRows = passport.boqRecipe.workRows.length + passport.boqRecipe.laborRows.length;
  const supportRows = passport.boqRecipe.serviceRows.length + passport.boqRecipe.equipmentRows.length + passport.boqRecipe.transportRows.length;
  const blocking_reasons = [
    rows.length >= profile.minimumMeaningfulRows ? "" : `row_count_below_complexity_min:${rows.length}<${profile.minimumMeaningfulRows}`,
    meaningfulRows.length >= profile.minimumMeaningfulRows ? "" : `meaningful_rows_below_complexity_min:${meaningfulRows.length}<${profile.minimumMeaningfulRows}`,
    passport.boqRecipe.materialRows.length > 0 ? "" : "materials_missing",
    operationRows > 0 ? "" : "operations_missing",
    supportRows > 0 ? "" : "support_rows_missing",
    genericRows.length === 0 ? "" : `generic_rows:${genericRows.length}`,
    rawRows.length === 0 ? "" : `raw_formula_or_debug_rows:${rawRows.length}`,
    missingTraceRows.length === 0 ? "" : `missing_source_formula_or_trace:${missingTraceRows.length}`,
    duplicateRows.length === 0 ? "" : `duplicate_semantic_rows:${duplicateRows.length}`,
  ].filter(Boolean);
  return {
    template_id: passport.templateId,
    work_key: passport.workKey,
    family_id: passport.familyId,
    title_ru: passport.localizedNameRu,
    complexity_level: profile.level,
    minimum_required_rows: profile.minimumMeaningfulRows,
    row_count: rows.length,
    meaningful_row_count: meaningfulRows.length,
    material_rows: passport.boqRecipe.materialRows.length,
    operation_rows: operationRows,
    support_rows: supportRows,
    blocking_reasons,
  };
}

function emptyLevelStats(level: EstimateBoqDepthClass): LevelStats {
  return {
    count: 0,
    minimum_required: ESTIMATE_BOQ_MINIMUM_ROWS[level],
    min_rows: Number.POSITIVE_INFINITY,
    max_rows: 0,
    total_rows: 0,
    average_rows: 0,
    below_minimum_count: 0,
  };
}

export function audit11610ComplexityAdaptiveDeepBoqDepth(input: {
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  const ids = listProfessionalWorkPassportTemplateIds();
  const ledger: LedgerRow[] = [];
  const levelStats = Object.fromEntries(LEVELS.map((level) => [level, emptyLevelStats(level)])) as Record<EstimateBoqDepthClass, LevelStats>;
  let minRows = Number.POSITIVE_INFINITY;
  let maxRows = 0;

  for (const [index, templateId] of ids.entries()) {
    const passport = buildProfessionalWorkPassport(templateId);
    if (!passport) {
      ledger.push({
        template_id: templateId,
        work_key: "",
        family_id: "",
        title_ru: "",
        complexity_level: "full_professional",
        minimum_required_rows: ESTIMATE_BOQ_MINIMUM_ROWS.full_professional,
        row_count: 0,
        meaningful_row_count: 0,
        material_rows: 0,
        operation_rows: 0,
        support_rows: 0,
        blocking_reasons: ["passport_missing"],
      });
      continue;
    }
    const row = ledgerForPassport(passport);
    ledger.push(row);
    const stats = levelStats[row.complexity_level];
    stats.count += 1;
    stats.min_rows = Math.min(stats.min_rows, row.row_count);
    stats.max_rows = Math.max(stats.max_rows, row.row_count);
    stats.total_rows += row.row_count;
    if (row.row_count < row.minimum_required_rows || row.meaningful_row_count < row.minimum_required_rows) stats.below_minimum_count += 1;
    minRows = Math.min(minRows, row.row_count);
    maxRows = Math.max(maxRows, row.row_count);
    if (index > 0 && index % 250 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();

  for (const stats of Object.values(levelStats)) {
    stats.min_rows = Number.isFinite(stats.min_rows) ? stats.min_rows : 0;
    stats.average_rows = stats.count > 0 ? Math.round(stats.total_rows / stats.count * 100) / 100 : 0;
  }

  const blocked = ledger.filter((row) => row.blocking_reasons.length > 0);
  const sourceGreen =
    ids.length === PROFESSIONAL_WORK_PASSPORT_TOTAL &&
    ledger.length === PROFESSIONAL_WORK_PASSPORT_TOTAL &&
    blocked.length === 0 &&
    minRows >= ESTIMATE_BOQ_MINIMUM_ROWS.full_professional &&
    levelStats.complex_professional.min_rows >= ESTIMATE_BOQ_MINIMUM_ROWS.complex_professional &&
    levelStats.industrial_infrastructure.min_rows >= ESTIMATE_BOQ_MINIMUM_ROWS.industrial_infrastructure &&
    levelStats.mega_project.min_rows >= ESTIMATE_BOQ_MINIMUM_ROWS.mega_project;
  const outDir = input.writeSummary || input.writeLedger ? path.join(ROOT, timestampForPath()) : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  const summary = {
    final_status: sourceGreen
      ? GREEN_AI_ESTIMATE_11610_COMPLEXITY_ADAPTIVE_DEEP_BOQ_DEPTH_SOURCE_READY
      : STOP_AI_ESTIMATE_11610_COMPLEXITY_ADAPTIVE_DEEP_BOQ_DEPTH_BLOCKED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    catalog_total_expected: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    template_ids_total: ids.length,
    templates_audited: ledger.length,
    blocked_templates_count: blocked.length,
    min_rows_per_template: Number.isFinite(minRows) ? minRows : 0,
    max_rows_per_template: maxRows,
    complexity_thresholds: ESTIMATE_BOQ_MINIMUM_ROWS,
    level_distribution: levelStats,
    all_11610_templates_have_complexity_adaptive_deep_boq: sourceGreen,
    all_full_professional_have_at_least_46_rows: levelStats.full_professional.below_minimum_count === 0,
    all_complex_professional_have_at_least_100_rows: levelStats.complex_professional.below_minimum_count === 0,
    all_industrial_infrastructure_have_at_least_200_rows: levelStats.industrial_infrastructure.below_minimum_count === 0,
    all_mega_projects_have_at_least_500_rows: levelStats.mega_project.below_minimum_count === 0,
    all_templates_have_material_operation_and_support_rows: ledger.every((row) =>
      row.material_rows > 0 && row.operation_rows > 0 && row.support_rows > 0
    ),
    fake_green_claimed: false,
    runtime_web_android_pdf_proven_in_this_script: false,
    blocking_reasons: blocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.template_id}:${reason}`)).slice(0, 200),
    blocked_samples: blocked.slice(0, 20),
    summary_path: summaryPath,
    ledger_path: ledgerPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  if (ledgerPath) writeJsonl(ledgerPath, ledger);
  return { summary, ledger, summaryPath, ledgerPath };
}

if (require.main === module) {
  const result = audit11610ComplexityAdaptiveDeepBoqDepth({
    writeSummary: hasFlag("write-summary") || hasFlag("all") || hasFlag("json"),
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    templates_audited: result.summary.templates_audited,
    blocked_templates_count: result.summary.blocked_templates_count,
    min_rows_per_template: result.summary.min_rows_per_template,
    max_rows_per_template: result.summary.max_rows_per_template,
    level_distribution: result.summary.level_distribution,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    summary_path: result.summary.summary_path,
    ledger_path: result.summary.ledger_path,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_11610_COMPLEXITY_ADAPTIVE_DEEP_BOQ_DEPTH_SOURCE_READY) {
    process.exitCode = 1;
  }
}
