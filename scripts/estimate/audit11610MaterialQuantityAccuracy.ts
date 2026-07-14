import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import { professionalBoqRowsFromPassport } from "../../src/lib/estimate/validateProfessionalBoqMaterialCompleteness";
import { validateProfessionalMaterialQuantityAccuracy } from "../../src/lib/estimate/validateProfessionalMaterialQuantityAccuracy";
import { validateProfessionalMaterialQuantityNorms } from "../../src/lib/estimate/validateProfessionalMaterialQuantityNorms";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
  runMaterialQuantityRuntimeCases,
  writeMaterialQuantitySampleOutputs,
} from "./materialQuantityCriticalCases";

export const GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_SOURCE_READY =
  "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_SOURCE_READY" as const;
export const GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_INCOMPLETE_NO_GREEN" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-material-quantity-accuracy");
const WEB_ROOT = path.join(RUNTIME_ROOT, "web");
const ANDROID_ROOT = path.join(RUNTIME_ROOT, "android-chrome");
const PARITY_ROOT = path.join(RUNTIME_ROOT, "web-android-parity");
const WEB_GREEN = "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE";
const ANDROID_GREEN = "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_ANDROID_SMOKE";
const PARITY_GREEN = "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_ANDROID_PARITY";

type RuntimeArtifact = {
  final_status?: string;
  source_sha?: string;
  actual_web_browser_material_quantity_accuracy_smoke_passed?: boolean;
  actual_android_emulator_material_quantity_accuracy_smoke_passed?: boolean;
  material_quantity_accuracy_web_smoke_passed?: boolean;
  material_quantity_accuracy_android_smoke_passed?: boolean;
  material_quantity_accuracy_web_android_parity_passed?: boolean;
  web_material_quantity_accuracy_cases_passed?: string;
  android_material_quantity_accuracy_cases_passed?: string;
  same_material_quantity_accuracy_corpus_used_for_web_android?: boolean;
  web_android_material_quantity_result_parity?: boolean;
  web_android_material_quantity_trace_parity?: boolean;
  web_material_quantity_panel_missing_count?: number;
  android_material_quantity_panel_missing_count?: number;
  web_material_quantity_validation_failed_count?: number;
  android_material_quantity_validation_failed_count?: number;
  web_raw_dump_ui_count?: number;
  android_raw_dump_ui_count?: number;
  fake_green_claimed?: boolean;
};

export type MaterialQuantityTemplateAuditRow = {
  template_id: string;
  family: string;
  procurement_rows_count: number;
  material_quantity_lines_count: number;
  formula_backed_lines_count: number;
  source_backed_lines_count: number;
  rounding_backed_lines_count: number;
  waste_backed_lines_count: number;
  dynamic_param_backed_lines_count: number;
  blocked_rows_count: number;
  status: "READY_MATERIAL_QUANTITY_ACCURATE" | "BLOCKED_MATERIAL_QUANTITY_ACCURACY";
  blocking_reasons: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function latestSummary(root: string): string | null {
  if (!existsSync(root)) return null;
  const summaries: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      else if (stat.isFile() && entry === "summary.json") summaries.push(fullPath);
    }
  };
  visit(root);
  return summaries.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readRuntimeArtifact(root: string): { path: string | null; artifact: RuntimeArtifact | null } {
  const artifactPath = latestSummary(root);
  if (!artifactPath) return { path: null, artifact: null };
  return {
    path: artifactPath,
    artifact: JSON.parse(readFileSync(artifactPath, "utf8")) as RuntimeArtifact,
  };
}

function auditTemplate(templateId: string): MaterialQuantityTemplateAuditRow {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) {
    return {
      template_id: templateId,
      family: "missing",
      procurement_rows_count: 0,
      material_quantity_lines_count: 0,
      formula_backed_lines_count: 0,
      source_backed_lines_count: 0,
      rounding_backed_lines_count: 0,
      waste_backed_lines_count: 0,
      dynamic_param_backed_lines_count: 0,
      blocked_rows_count: 1,
      status: "BLOCKED_MATERIAL_QUANTITY_ACCURACY",
      blocking_reasons: ["passport_missing"],
    };
  }
  const rows = professionalBoqRowsFromPassport(passport);
  const validation = validateProfessionalMaterialQuantityAccuracy({
    templateId: passport.templateId,
    family: passport.familyId,
    rows,
  });
  return {
    template_id: templateId,
    family: passport.familyId,
    procurement_rows_count: validation.procurementRowsCount,
    material_quantity_lines_count: validation.materialQuantityLinesCount,
    formula_backed_lines_count: validation.formulaBackedLinesCount,
    source_backed_lines_count: validation.sourceBackedLinesCount,
    rounding_backed_lines_count: validation.roundingBackedLinesCount,
    waste_backed_lines_count: validation.wasteBackedLinesCount,
    dynamic_param_backed_lines_count: validation.dynamicParamBackedLinesCount,
    blocked_rows_count: validation.blockedRows.length,
    status: validation.passed ? "READY_MATERIAL_QUANTITY_ACCURATE" : "BLOCKED_MATERIAL_QUANTITY_ACCURACY",
    blocking_reasons: validation.blockingReasons,
  };
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

export function audit11610MaterialQuantityAccuracy(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
  writeSamples?: boolean;
  requireRuntimeEvidence?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const normValidation = validateProfessionalMaterialQuantityNorms();
  const validations: MaterialQuantityTemplateAuditRow[] = [];
  for (const [index, templateId] of listProfessionalWorkPassportTemplateIds().entries()) {
    validations.push(auditTemplate(templateId));
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();
  const runtimeCases = runMaterialQuantityRuntimeCases();
  const runtimeRequired = input.requireRuntimeEvidence ?? true;
  const web = readRuntimeArtifact(WEB_ROOT);
  const android = readRuntimeArtifact(ANDROID_ROOT);
  const parity = readRuntimeArtifact(PARITY_ROOT);
  const webGreen = web.artifact?.source_sha === sourceSha &&
    web.artifact.final_status === WEB_GREEN &&
    web.artifact.actual_web_browser_material_quantity_accuracy_smoke_passed === true &&
    web.artifact.material_quantity_accuracy_web_smoke_passed === true &&
    web.artifact.web_material_quantity_accuracy_cases_passed === "100/100" &&
    web.artifact.web_material_quantity_panel_missing_count === 0 &&
    web.artifact.web_material_quantity_validation_failed_count === 0 &&
    web.artifact.web_raw_dump_ui_count === 0 &&
    web.artifact.fake_green_claimed === false;
  const androidGreen = android.artifact?.source_sha === sourceSha &&
    android.artifact.final_status === ANDROID_GREEN &&
    android.artifact.actual_android_emulator_material_quantity_accuracy_smoke_passed === true &&
    android.artifact.material_quantity_accuracy_android_smoke_passed === true &&
    android.artifact.android_material_quantity_accuracy_cases_passed === "100/100" &&
    android.artifact.android_material_quantity_panel_missing_count === 0 &&
    android.artifact.android_material_quantity_validation_failed_count === 0 &&
    android.artifact.android_raw_dump_ui_count === 0 &&
    android.artifact.fake_green_claimed === false;
  const parityGreen = parity.artifact?.source_sha === sourceSha &&
    parity.artifact.final_status === PARITY_GREEN &&
    parity.artifact.material_quantity_accuracy_web_android_parity_passed === true &&
    parity.artifact.same_material_quantity_accuracy_corpus_used_for_web_android === true &&
    parity.artifact.web_android_material_quantity_result_parity === true &&
    parity.artifact.web_android_material_quantity_trace_parity === true &&
    parity.artifact.fake_green_claimed === false;
  const runtimeGreen = !runtimeRequired || (webGreen && androidGreen && parityGreen);
  const outDir = input.writeLedger || input.writeSummary
    ? path.join(RUNTIME_ROOT, timestampForPath())
    : null;
  if (outDir) mkdirSync(outDir, { recursive: true });
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "material-quantity-accuracy-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  if (ledgerPath) writeJsonl(ledgerPath, validations);
  const samples = outDir && (input.writeSamples ?? input.writeSummary ?? false)
    ? writeMaterialQuantitySampleOutputs(path.join(outDir, "sample-outputs"))
    : null;
  const blocked = validations.filter((row) => row.status !== "READY_MATERIAL_QUANTITY_ACCURATE");
  const sourceGreen =
    normValidation.passed &&
    validations.length === PROFESSIONAL_WORK_PASSPORT_TOTAL &&
    blocked.length === 0 &&
    validations.reduce((sum, row) => sum + row.procurement_rows_count, 0) > 0 &&
    runtimeCases.length === MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED &&
    runtimeCases.every((row) => row.passed);
  const fullGreen = sourceGreen && runtimeRequired && runtimeGreen;
  const summary = {
    final_status: fullGreen
      ? GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_WEB_ANDROID_COMMITTED_NO_RELEASE
      : sourceGreen && !runtimeRequired
        ? GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_SOURCE_READY
        : STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_INCOMPLETE_NO_GREEN,
    source_audit_status: sourceGreen
      ? GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_SOURCE_READY
      : STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_INCOMPLETE_NO_GREEN,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    templates_audited: validations.length,
    templates_material_quantity_accurate: validations.filter((row) => row.status === "READY_MATERIAL_QUANTITY_ACCURATE").length,
    blocked_templates_count: blocked.length,
    material_quantity_norms_count: normValidation.normsCount,
    material_quantity_norm_registry_valid: normValidation.passed,
    material_rows_audited: validations.reduce((sum, row) => sum + row.procurement_rows_count, 0),
    formula_backed_lines_count: validations.reduce((sum, row) => sum + row.formula_backed_lines_count, 0),
    source_backed_lines_count: validations.reduce((sum, row) => sum + row.source_backed_lines_count, 0),
    rounding_backed_lines_count: validations.reduce((sum, row) => sum + row.rounding_backed_lines_count, 0),
    waste_backed_lines_count: validations.reduce((sum, row) => sum + row.waste_backed_lines_count, 0),
    dynamic_param_backed_lines_count: validations.reduce((sum, row) => sum + row.dynamic_param_backed_lines_count, 0),
    blocked_rows_count: validations.reduce((sum, row) => sum + row.blocked_rows_count, 0),
    critical_cases_total: runtimeCases.length,
    critical_cases_passed: runtimeCases.filter((row) => row.passed).length,
    runtime_material_quantity_validation_failed_count: runtimeCases.filter((row) => !row.passed).length,
    web_artifact: web.path,
    android_artifact: android.path,
    parity_artifact: parity.path,
    actual_web_browser_material_quantity_accuracy_smoke_passed: webGreen,
    actual_android_emulator_material_quantity_accuracy_smoke_passed: androidGreen,
    material_quantity_accuracy_web_android_parity_passed: parityGreen,
    runtime_required: runtimeRequired,
    fake_green_claimed: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    samples,
    blocking_reasons: [
      ...normValidation.blockers,
      ...blocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.template_id}:${reason}`)).slice(0, 200),
      ...runtimeCases.filter((row) => !row.passed).flatMap((row) => row.blocking_reasons.map((reason) => `${row.case_id}:${reason}`)).slice(0, 100),
      runtimeGreen ? "" : "runtime_web_android_material_quantity_evidence_missing_or_not_green",
    ].filter(Boolean),
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, ledgerPath, summaryPath, validations };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/audit11610MaterialQuantityAccuracy.ts")) {
  const result = audit11610MaterialQuantityAccuracy({
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
    writeSummary: hasFlag("write-summary") || hasFlag("all"),
    writeSamples: hasFlag("write-samples") || hasFlag("all"),
    requireRuntimeEvidence: !hasFlag("no-runtime-evidence"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    templates_audited: result.summary.templates_audited,
    templates_material_quantity_accurate: result.summary.templates_material_quantity_accurate,
    blocked_templates_count: result.summary.blocked_templates_count,
    material_rows_audited: result.summary.material_rows_audited,
    critical_cases_passed: `${result.summary.critical_cases_passed}/${result.summary.critical_cases_total}`,
    actual_web_browser_material_quantity_accuracy_smoke_passed: result.summary.actual_web_browser_material_quantity_accuracy_smoke_passed,
    actual_android_emulator_material_quantity_accuracy_smoke_passed: result.summary.actual_android_emulator_material_quantity_accuracy_smoke_passed,
    material_quantity_accuracy_web_android_parity_passed: result.summary.material_quantity_accuracy_web_android_parity_passed,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    summary: result.summaryPath,
  }, null, 2));
  if (result.summary.final_status === STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_NORMS_11610_INCOMPLETE_NO_GREEN) {
    process.exitCode = 1;
  }
}
