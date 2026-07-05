import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import baseManifestJson from "../../data/estimate-templates/estimate-10000-readiness-manifest.json";
import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedRow,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  normalizeCanonicalProfessionalBoqUnit,
  validateProfessionalBoqUnit,
} from "../../src/lib/estimate/canonicalUnits";
import { runProfessionalBoqTruthAudit10000 } from "./auditProfessionalBoqTruth10000";

export const GREEN_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATED_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATED_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATION_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATION_INCOMPLETE_NO_GREEN" as const;

const DEFAULT_TRUTH_SUMMARY =
  ".release-runtime/ai-estimate-10k-professional-boq-truth-audit/2026-07-05T12-11-51-597Z/summary.json";
const DEFAULT_TRUTH_LEDGER =
  ".release-runtime/ai-estimate-10k-professional-boq-truth-audit/2026-07-05T12-11-51-597Z/ledger.jsonl";
const RUNTIME_ROOT = ".release-runtime/ai-estimate-wave2b-wrong-units";

type BaseTemplate = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  calculator_family_id: string;
  norm_pack_id: string;
  category: string;
  localized_name_ru: string;
};

type TruthLedgerRow = {
  template_id: string;
  wrong_unit_rows_count: number;
  status: string;
};

export type Wave2BWrongUnitLedgerRow = {
  template_id: string;
  template_name: string;
  family: string;
  category: string;
  calculator_id: string;
  norm_pack_id: string;
  row_id: string;
  row_type: string;
  row_name: string;
  current_unit: string;
  expected_unit: string;
  canonical_unit: string | null;
  quantity_formula: string;
  norm_source_id: string;
  norm_version: string;
  reason: string;
  fix_strategy: string;
  source_file_expected: string;
};

export type Wave2BWrongUnitSummary = {
  source_sha: string;
  branch: string;
  upstream_sync: string;
  truth_summary_path: string;
  truth_ledger_path: string;
  wrong_unit_blocker_extract_created: boolean;
  wrong_unit_rows_loaded: number;
  base_catalog_wrong_unit_templates_loaded: number;
  every_wrong_unit_has_template_id: boolean;
  every_wrong_unit_has_fix_strategy: boolean;
  no_wrong_unit_silently_ignored: boolean;
  by_family: Record<string, number>;
  by_current_unit: Record<string, number>;
  by_expected_unit: Record<string, number>;
  by_row_type: Record<string, number>;
  by_calculator: Record<string, number>;
  by_norm_pack: Record<string, number>;
  by_source_file: Record<string, number>;
  ledger_artifact: string | null;
  summary_artifact: string | null;
};

export type Wave2BWrongUnitExtractResult = {
  ledger: Wave2BWrongUnitLedgerRow[];
  summary: Wave2BWrongUnitSummary;
  outDir: string | null;
  ledgerPath: string | null;
  summaryPath: string | null;
};

export type Wave2BWrongUnitRemediationSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATED_COMMITTED_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATION_INCOMPLETE_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  truth_summary_path_before: string;
  truth_ledger_path_before: string;
  wrong_unit_rows_before: number;
  base_catalog_wrong_unit_templates_before: number;
  wrong_unit_rows_after: number;
  unknown_unit_rows_after: number;
  base_catalog_wrong_unit_templates_after: number;
  material_rows_forced_to_m2_after: number;
  base_templates_ready_professional_boq_count: number;
  base_templates_blocked_count: number;
  expanded_templates_ready_professional_boq_count: number;
  expanded_templates_blocked_not_ready_professional: number;
  full_10000_professional_boq_green_claimed: false;
  targeted_tests_passed: boolean;
  focused_professional_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  render_staging_started: false;
  owner_go_no_go_started: false;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  production_db_touched: false;
  destructive_migration_run: false;
  full_jest_started: false;
  fake_green_claimed: false;
  blocking_reasons: string[];
  runtime_summary_path: string | null;
};

export type Wave2BWrongUnitRemediationResult = {
  summary: Wave2BWrongUnitRemediationSummary;
  outDir: string | null;
  summaryPath: string | null;
};

function git(args: string[], fallback = "unknown"): string {
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

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseJsonl(filePath: string): TruthLedgerRow[] {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TruthLedgerRow);
}

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item] = (counts[item] ?? 0) + 1;
    return counts;
  }, {});
}

function envBoolean(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function expectedUnitFor(input: {
  row: ProductionCompiledExpandedRow;
  reason: string;
}): string {
  const label = input.row.titleRu.toLocaleLowerCase("ru-RU");
  if (input.reason === "BASEBOARD_WRONG_M2_UNIT" || /baseboard|plinth|\u043f\u043b\u0438\u043d\u0442\u0443\u0441/i.test(label)) {
    return "linear_m";
  }
  if (/primer|\u0433\u0440\u0443\u043d\u0442/i.test(label)) return "l";
  if (/paint|\u043a\u0440\u0430\u0441\u043a/i.test(label)) return "l";
  if (/glue|\u043a\u043b\u0435\u0439/i.test(label)) return "kg";
  if (/putty|\u0448\u043f\u0430\u043a\u043b\u0435\u0432|\u0448\u043f\u0430\u043a\u043b\u0451\u0432/i.test(label)) return "kg";
  if (/concrete|\u0431\u0435\u0442\u043e\u043d/i.test(label)) return "m3";
  if (/rebar|\u0430\u0440\u043c\u0430\u0442\u0443\u0440/i.test(label)) return "kg";
  return "set";
}

function fixStrategyFor(reason: string): string {
  if (reason === "BASEBOARD_WRONG_M2_UNIT") {
    return "semantic_labor_unit_mapping: baseboard/plinth rows must emit linear_m instead of inheriting flooring area";
  }
  if (reason === "CONSUMABLE_MATERIAL_WRONG_M2_UNIT") {
    return "semantic_material_unit_mapping: paint/primer/glue/putty material rows must emit l_or_kg instead of inheriting area";
  }
  if (reason === "CONCRETE_MATERIAL_WRONG_M2_UNIT") {
    return "semantic_material_unit_mapping: concrete material rows must emit m3 instead of inheriting area";
  }
  if (reason === "REBAR_MATERIAL_WRONG_M2_UNIT") {
    return "semantic_material_unit_mapping: rebar material rows must emit kg instead of inheriting area";
  }
  return "semantic_unit_mapping: correct source generator/norm row unit instead of allowing wrong unit";
}

function sourceFileFor(reason: string): string {
  if (reason === "BASEBOARD_WRONG_M2_UNIT" || reason === "CONSUMABLE_MATERIAL_WRONG_M2_UNIT") {
    return "src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000.ts";
  }
  return "src/lib/estimate/canonicalUnits.ts";
}

export function runWave2BWrongUnitExtract(input: {
  truthSummaryPath?: string;
  truthLedgerPath?: string;
  writeArtifacts?: boolean;
} = {}): Wave2BWrongUnitExtractResult {
  const truthSummaryPath = input.truthSummaryPath ?? DEFAULT_TRUTH_SUMMARY;
  const truthLedgerPath = input.truthLedgerPath ?? DEFAULT_TRUTH_LEDGER;
  if (!existsSync(truthSummaryPath) || !existsSync(truthLedgerPath)) {
    throw new Error(`WAVE2B_TRUTH_AUDIT_ARTIFACTS_MISSING:${truthSummaryPath}:${truthLedgerPath}`);
  }
  const truthLedger = parseJsonl(truthLedgerPath);
  const wrongTemplateIds = new Set(
    truthLedger
      .filter((row) => row.wrong_unit_rows_count > 0)
      .map((row) => row.template_id),
  );
  const templates = (baseManifestJson as { templates: BaseTemplate[] }).templates
    .filter((template) => wrongTemplateIds.has(template.template_id));
  const ledger = templates.flatMap((template): Wave2BWrongUnitLedgerRow[] => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: template.work_key,
      quantity: 54,
      countryCode: "KG",
    });
    return compiled.rows.flatMap((row) => {
      const validation = validateProfessionalBoqUnit({
        unit: row.unit,
        rowCode: row.rowCode,
        rowLabel: row.titleRu,
        rowKind: row.lineType,
        workFamily: template.work_family_id,
        normId: row.normId,
        normPackId: row.normFamilyId,
        normSourceId: row.normSourceId,
      });
      return validation.blocking_reasons
        .filter((reason) => reason !== "UNKNOWN_UNIT")
        .map((reason) => {
          const expectedUnit = expectedUnitFor({ row, reason });
          return {
            template_id: template.template_id,
            template_name: template.localized_name_ru,
            family: template.work_family_id,
            category: template.category,
            calculator_id: template.calculator_family_id,
            norm_pack_id: template.norm_pack_id,
            row_id: row.rowCode,
            row_type: row.lineType,
            row_name: row.titleRu,
            current_unit: row.unit,
            expected_unit: expectedUnit,
            canonical_unit: normalizeCanonicalProfessionalBoqUnit(expectedUnit),
            quantity_formula: row.quantityFormula,
            norm_source_id: row.normSourceId,
            norm_version: row.normVersion,
            reason,
            fix_strategy: fixStrategyFor(reason),
            source_file_expected: sourceFileFor(reason),
          };
        });
    });
  });

  const outDir = input.writeArtifacts ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const ledgerPath = outDir ? path.join(outDir, "wrong-units-ledger.jsonl") : null;
  const summaryPath = outDir ? path.join(outDir, "wrong-units-summary.json") : null;
  const summary: Wave2BWrongUnitSummary = {
    source_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    upstream_sync: git(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    truth_summary_path: truthSummaryPath,
    truth_ledger_path: truthLedgerPath,
    wrong_unit_blocker_extract_created: true,
    wrong_unit_rows_loaded: ledger.length,
    base_catalog_wrong_unit_templates_loaded: new Set(ledger.map((row) => row.template_id)).size,
    every_wrong_unit_has_template_id: ledger.every((row) => Boolean(row.template_id)),
    every_wrong_unit_has_fix_strategy: ledger.every((row) => Boolean(row.fix_strategy)),
    no_wrong_unit_silently_ignored: ledger.length === truthLedger.reduce((sum, row) => sum + Number(row.wrong_unit_rows_count ?? 0), 0),
    by_family: countBy(ledger.map((row) => row.family)),
    by_current_unit: countBy(ledger.map((row) => row.current_unit)),
    by_expected_unit: countBy(ledger.map((row) => row.expected_unit)),
    by_row_type: countBy(ledger.map((row) => row.row_type)),
    by_calculator: countBy(ledger.map((row) => row.calculator_id)),
    by_norm_pack: countBy(ledger.map((row) => row.norm_pack_id)),
    by_source_file: countBy(ledger.map((row) => row.source_file_expected)),
    ledger_artifact: ledgerPath,
    summary_artifact: summaryPath,
  };

  if (outDir) mkdirSync(outDir, { recursive: true });
  if (ledgerPath) writeFileSync(ledgerPath, `${ledger.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  if (summaryPath) writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { ledger, summary, outDir, ledgerPath, summaryPath };
}

export function runWave2BWrongUnitRemediationSummary(input: {
  truthSummaryPathBefore?: string;
  truthLedgerPathBefore?: string;
  writeArtifacts?: boolean;
} = {}): Wave2BWrongUnitRemediationResult {
  const truthSummaryPathBefore = input.truthSummaryPathBefore ?? DEFAULT_TRUTH_SUMMARY;
  const truthLedgerPathBefore = input.truthLedgerPathBefore ?? DEFAULT_TRUTH_LEDGER;
  if (!existsSync(truthSummaryPathBefore) || !existsSync(truthLedgerPathBefore)) {
    throw new Error(`WAVE2B_TRUTH_AUDIT_ARTIFACTS_MISSING:${truthSummaryPathBefore}:${truthLedgerPathBefore}`);
  }
  const beforeLedger = parseJsonl(truthLedgerPathBefore);
  const beforeWrongRows = beforeLedger.reduce((sum, row) => sum + Number(row.wrong_unit_rows_count ?? 0), 0);
  const beforeWrongTemplates = beforeLedger.filter((row) => Number(row.wrong_unit_rows_count ?? 0) > 0).length;
  const baseTemplateIds = new Set((baseManifestJson as { templates: BaseTemplate[] }).templates.map((template) => template.template_id));
  const truth = runProfessionalBoqTruthAudit10000();
  const baseWrongTemplatesAfter = truth.ledger.filter((row) =>
    baseTemplateIds.has(row.template_id) && row.wrong_unit_rows_count > 0
  ).length;
  const targetedTestsPassed = envBoolean("WAVE2B_TARGETED_TESTS_PASSED");
  const focusedProfessionalTestsPassed = envBoolean("WAVE2B_FOCUSED_PROFESSIONAL_TESTS_PASSED");
  const typecheckPassed = envBoolean("WAVE2B_TYPECHECK_PASSED");
  const lintPassed = envBoolean("WAVE2B_LINT_PASSED");
  const diffCheckPassed = envBoolean("WAVE2B_DIFF_CHECK_PASSED");
  const noTestWeakeningPassed = envBoolean("WAVE2B_NO_TEST_WEAKENING_PASSED");
  const webPublicSmokePassed = envBoolean("WAVE2B_WEB_PUBLIC_SMOKE_PASSED");
  const ciOfficeMarketPassed = envBoolean("WAVE2B_CI_OFFICE_MARKET_PASSED");
  const secretScanPassed = envBoolean("WAVE2B_SECRET_SCAN_PASSED");
  const wave2BRemediated =
    beforeWrongRows === 2854 &&
    beforeWrongTemplates === 1642 &&
    truth.summary.wrong_unit_rows_count === 0 &&
    truth.summary.unknown_unit_rows_count === 0 &&
    baseWrongTemplatesAfter === 0 &&
    truth.summary.base_templates_ready_professional_boq_count === 10000 &&
    truth.summary.base_templates_blocked_count === 0 &&
    (
      truth.summary.expanded_templates_blocked_not_ready_professional === 1610 ||
      truth.summary.expanded_templates_ready_professional_boq_count === 1610
    ) &&
    truth.summary.full_10000_professional_boq_green_claimed === false;
  const gatesPassed =
    targetedTestsPassed &&
    focusedProfessionalTestsPassed &&
    typecheckPassed &&
    lintPassed &&
    diffCheckPassed &&
    noTestWeakeningPassed &&
    webPublicSmokePassed &&
    ciOfficeMarketPassed &&
    secretScanPassed;
  const outDir = input.writeArtifacts ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const summaryPath = outDir ? path.join(outDir, "summary.json") : null;
  const blockingReasons = [
    wave2BRemediated ? "" : "wave2b_wrong_units_not_remediated",
    targetedTestsPassed ? "" : "targeted_tests_not_passed",
    focusedProfessionalTestsPassed ? "" : "focused_professional_tests_not_passed",
    typecheckPassed ? "" : "typecheck_not_passed",
    lintPassed ? "" : "lint_not_passed",
    diffCheckPassed ? "" : "diff_check_not_passed",
    noTestWeakeningPassed ? "" : "no_test_weakening_check_not_passed",
    webPublicSmokePassed ? "" : "web_public_smoke_not_passed",
    ciOfficeMarketPassed ? "" : "ci_office_market_not_passed",
    secretScanPassed ? "" : "secret_scan_not_passed",
  ].filter(Boolean);
  const summary: Wave2BWrongUnitRemediationSummary = {
    final_status: wave2BRemediated && gatesPassed
      ? GREEN_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATED_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_WAVE2B_BASE_CATALOG_WRONG_UNITS_REMEDIATION_INCOMPLETE_NO_GREEN,
    source_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    upstream_sync: git(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    truth_summary_path_before: truthSummaryPathBefore,
    truth_ledger_path_before: truthLedgerPathBefore,
    wrong_unit_rows_before: beforeWrongRows,
    base_catalog_wrong_unit_templates_before: beforeWrongTemplates,
    wrong_unit_rows_after: truth.summary.wrong_unit_rows_count,
    unknown_unit_rows_after: truth.summary.unknown_unit_rows_count,
    base_catalog_wrong_unit_templates_after: baseWrongTemplatesAfter,
    material_rows_forced_to_m2_after: truth.summary.wrong_unit_rows_count === 0 ? 0 : -1,
    base_templates_ready_professional_boq_count: truth.summary.base_templates_ready_professional_boq_count,
    base_templates_blocked_count: truth.summary.base_templates_blocked_count,
    expanded_templates_ready_professional_boq_count: truth.summary.expanded_templates_ready_professional_boq_count,
    expanded_templates_blocked_not_ready_professional: truth.summary.expanded_templates_blocked_not_ready_professional,
    full_10000_professional_boq_green_claimed: false,
    targeted_tests_passed: targetedTestsPassed,
    focused_professional_tests_passed: focusedProfessionalTestsPassed,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    diff_check_passed: diffCheckPassed,
    no_test_weakening_passed: noTestWeakeningPassed,
    web_public_smoke_passed: webPublicSmokePassed,
    ci_office_market_passed: ciOfficeMarketPassed,
    secret_scan_passed: secretScanPassed,
    render_staging_started: false,
    owner_go_no_go_started: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    full_jest_started: false,
    fake_green_claimed: false,
    blocking_reasons: blockingReasons,
    runtime_summary_path: summaryPath,
  };

  if (outDir) mkdirSync(outDir, { recursive: true });
  if (summaryPath) writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { summary, outDir, summaryPath };
}

if (require.main === module) {
  if (hasFlag("final-summary")) {
    const result = runWave2BWrongUnitRemediationSummary({
      truthSummaryPathBefore: argValue("summary", DEFAULT_TRUTH_SUMMARY),
      truthLedgerPathBefore: argValue("ledger", DEFAULT_TRUTH_LEDGER),
      writeArtifacts: hasFlag("write-artifacts"),
    });
    console.log(JSON.stringify({
      final_status: result.summary.final_status,
      source_sha: result.summary.source_sha,
      branch: result.summary.branch,
      upstream_sync: result.summary.upstream_sync,
      wrong_unit_rows_before: result.summary.wrong_unit_rows_before,
      wrong_unit_rows_after: result.summary.wrong_unit_rows_after,
      base_catalog_wrong_unit_templates_before: result.summary.base_catalog_wrong_unit_templates_before,
      base_catalog_wrong_unit_templates_after: result.summary.base_catalog_wrong_unit_templates_after,
      expanded_templates_blocked_not_ready_professional: result.summary.expanded_templates_blocked_not_ready_professional,
      full_10000_professional_boq_green_claimed: result.summary.full_10000_professional_boq_green_claimed,
      artifact: result.summaryPath,
      blocking_reasons: result.summary.blocking_reasons,
    }, null, 2));
  } else {
    const result = runWave2BWrongUnitExtract({
      truthSummaryPath: argValue("summary", DEFAULT_TRUTH_SUMMARY),
      truthLedgerPath: argValue("ledger", DEFAULT_TRUTH_LEDGER),
      writeArtifacts: hasFlag("write-artifacts"),
    });
    console.log(JSON.stringify({
      wrong_unit_rows_loaded: result.summary.wrong_unit_rows_loaded,
      base_catalog_wrong_unit_templates_loaded: result.summary.base_catalog_wrong_unit_templates_loaded,
      every_wrong_unit_has_template_id: result.summary.every_wrong_unit_has_template_id,
      every_wrong_unit_has_fix_strategy: result.summary.every_wrong_unit_has_fix_strategy,
      no_wrong_unit_silently_ignored: result.summary.no_wrong_unit_silently_ignored,
      by_family: result.summary.by_family,
      by_current_unit: result.summary.by_current_unit,
      by_expected_unit: result.summary.by_expected_unit,
      ledger_artifact: result.ledgerPath,
      summary_artifact: result.summaryPath,
    }, null, 2));
  }
}
