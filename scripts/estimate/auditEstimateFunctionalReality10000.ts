import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildEstimate10000ReadinessManifest,
  buildNormSourceInventory,
  type Estimate10000ReadinessManifest,
} from "./buildEstimate10000ReadinessManifest";
import { auditEstimatePdfReality } from "./auditEstimatePdfReality";
import { classifyEstimateRowsReality } from "./classifyEstimateRowReality";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
  type WorkSpecificityResult,
} from "./validateEstimateWorkSpecificity";
import { runCertifyAllEstimateNormBindings } from "./certifyAllEstimateNormBindings";

export const STOP_AI_ESTIMATE_GREEN_REVOKED_FUNCTIONAL_PDF_AUDIT_FAILED_NO_MARKETPLACE =
  "STOP_AI_ESTIMATE_GREEN_REVOKED_FUNCTIONAL_PDF_AUDIT_FAILED_NO_MARKETPLACE" as const;
export const STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN" as const;
export const GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-functional-reality-audit";
const PREVIOUS_WAVE2A_COMMIT = "e44e869ebb796ac5c4b3d310b8608e67144dcb0f";

export type EstimateFunctionalRealitySummary = {
  final_status:
    | typeof STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN
    | typeof GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  green_revoked: boolean;
  previous_wave2a_commit: typeof PREVIOUS_WAVE2A_COMMIT;
  broken_cases_reproduced: boolean;
  pdf_extraction_done: boolean;
  ui_rows_captured: boolean;
  pdf_rows_captured: boolean;
  estimate_snapshot_captured: boolean;
  diamond_drilling_professional: boolean;
  profile_sheet_fence_professional: boolean;
  mansard_roof_professional: boolean;
  apartment_54_missing_params_visible: boolean;
  apartment_54_not_auto_applied_from_area_only: boolean;
  readiness_manifest_created: boolean;
  norm_source_inventory_created: boolean;
  manifest_total_templates: number;
  ready_professional_count: number;
  quantity_only_price_missing_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  generic_norm_rows_count: number;
  templates_only_generic_norms_count: number;
  full_10000_real_norm_green_claimed: boolean;
  actual_web_browser_smoke_passed: false;
  actual_android_chrome_browser_smoke_passed: false;
  browser_automation_started: false;
  fake_green_claimed: false;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  blockers: string[];
  runtime_summary_path?: string;
};

function gitOutput(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function publicCase(item: WorkSpecificityResult) {
  return {
    case_id: item.case_id,
    prompt: item.prompt,
    work_type: item.work_type,
    selected_template_id: item.selected_template_id,
    selected_template_version: item.selected_template_version,
    selected_work_key: item.selected_work_key,
    extracted_parameters: item.extracted_parameters,
    missing_parameters: item.missing_parameters,
    rows_generated_despite_missing_params: item.rows_generated_despite_missing_params,
    row_count: item.row_count,
    source_backed_row_count: item.source_backed_row_count,
    generic_family_default_row_count: item.generic_family_default_row_count,
    blind_quantity_copy_count: item.blind_quantity_copy_count,
    professional: item.professional,
    blocking_reasons: item.blocking_reasons,
  };
}

function writeRuntimeArtifacts(input: {
  cases: WorkSpecificityResult[];
  manifest: Estimate10000ReadinessManifest;
  summary: EstimateFunctionalRealitySummary;
}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  mkdirSync(dir, { recursive: true });
  const pdfAudits = input.cases.map((item) => ({
    case_id: item.case_id,
    ...auditEstimatePdfReality(item),
  }));
  const rowClassifications = input.cases.map((item) => ({
    case_id: item.case_id,
    ...classifyEstimateRowsReality(item.compiled?.rows ?? []),
  }));
  const normInventory = buildNormSourceInventory();
  writeFileSync(path.join(dir, "broken-cases.json"), `${JSON.stringify(input.cases.map(publicCase), null, 2)}\n`, "utf8");
  writeFileSync(path.join(dir, "pdf-extraction.json"), `${JSON.stringify(pdfAudits, null, 2)}\n`, "utf8");
  writeFileSync(path.join(dir, "row-classification.json"), `${JSON.stringify(rowClassifications, null, 2)}\n`, "utf8");
  writeFileSync(path.join(dir, "norm-source-inventory.json"), `${JSON.stringify(normInventory, null, 2)}\n`, "utf8");
  const summaryPath = path.join(dir, "summary.json");
  writeFileSync(summaryPath, `${JSON.stringify({ ...input.summary, runtime_summary_path: summaryPath }, null, 2)}\n`, "utf8");
  return summaryPath;
}

export function runEstimateFunctionalRealityAudit(options: { writeSummary?: boolean } = {}): EstimateFunctionalRealitySummary {
  const cases = FUNCTIONAL_REALITY_CASES.map(evaluateWorkSpecificityCase);
  const manifest = buildEstimate10000ReadinessManifest();
  const certification = runCertifyAllEstimateNormBindings({ writeSummary: false });
  const caseById = new Map(cases.map((item) => [item.case_id, item]));
  const diamondCases = cases.filter((item) => item.work_type === "diamond_concrete_drilling");
  const fenceCases = cases.filter((item) => item.work_type === "profile_sheet_fence");
  const mansardCases = cases.filter((item) => item.work_type === "mansard_roof");
  const apartment = caseById.get("apartment_54");
  const pdfAudits = cases.map(auditEstimatePdfReality);
  const blockers = [
    ...cases.flatMap((item) => item.blocking_reasons.map((reason) => `${item.case_id}:${reason}`)),
    ...pdfAudits.flatMap((item) => item.blocking_reasons.map((reason) => `pdf:${reason}`)),
    manifest.not_ready_count > 0 ? `not_ready_templates:${manifest.not_ready_count}` : "",
    manifest.generic_fallback_count > 0 ? `generic_fallback_templates:${manifest.generic_fallback_count}` : "",
    certification.generic_norm_rows_count > 0 ? `generic_norm_rows:${certification.generic_norm_rows_count}` : "",
    certification.templates_only_generic_norms_count > 0
      ? `templates_only_generic_norms:${certification.templates_only_generic_norms_count}`
      : "",
  ].filter(Boolean);
  const brokenCasesReproduced = cases.every((item) => item.row_count > 0 || item.missing_parameters.length > 0);
  const pdfExtractionDone = pdfAudits.every((item) => item.extracted_text.length > 0);
  const uiRowsCaptured = cases.every((item) => item.row_count > 0 || item.missing_parameters.length > 0);
  const pdfRowsCaptured = pdfAudits.every((item, index) =>
    item.parsed_rows.length > 0 || Boolean(cases[index]?.missing_parameters.length)
  );
  const estimateSnapshotCaptured = cases.every((item) => Boolean(item.selected_template_id) || item.missing_parameters.length > 0);
  const diamondDrillingProfessional = diamondCases.every((item) => item.professional);
  const profileSheetFenceProfessional = fenceCases.every((item) => item.professional);
  const mansardRoofProfessional = mansardCases.every((item) => item.professional);
  const full10000Ready =
    manifest.full_10000_real_norm_green_claimed &&
    manifest.manifest_total_templates === 10000 &&
    manifest.ready_professional_count === 10000 &&
    manifest.not_ready_count === 0 &&
    manifest.generic_fallback_count === 0 &&
    certification.generic_norm_rows_count === 0 &&
    certification.templates_only_generic_norms_count === 0;
  const auditGreen =
    blockers.length === 0 &&
    brokenCasesReproduced &&
    pdfExtractionDone &&
    uiRowsCaptured &&
    pdfRowsCaptured &&
    estimateSnapshotCaptured &&
    diamondDrillingProfessional &&
    profileSheetFenceProfessional &&
    mansardRoofProfessional &&
    full10000Ready;
  const summary: EstimateFunctionalRealitySummary = {
    final_status: auditGreen
      ? GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]),
    green_revoked: !auditGreen,
    previous_wave2a_commit: PREVIOUS_WAVE2A_COMMIT,
    broken_cases_reproduced: brokenCasesReproduced,
    pdf_extraction_done: pdfExtractionDone,
    ui_rows_captured: uiRowsCaptured,
    pdf_rows_captured: pdfRowsCaptured,
    estimate_snapshot_captured: estimateSnapshotCaptured,
    diamond_drilling_professional: diamondDrillingProfessional,
    profile_sheet_fence_professional: profileSheetFenceProfessional,
    mansard_roof_professional: mansardRoofProfessional,
    apartment_54_missing_params_visible: Boolean(apartment && apartment.missing_parameters.length > 0),
    apartment_54_not_auto_applied_from_area_only: Boolean(apartment && !apartment.rows_generated_despite_missing_params),
    readiness_manifest_created: manifest.manifest_total_templates === 10000,
    norm_source_inventory_created: buildNormSourceInventory().length > 0,
    manifest_total_templates: manifest.manifest_total_templates,
    ready_professional_count: manifest.ready_professional_count,
    quantity_only_price_missing_count: manifest.quantity_only_price_missing_count,
    not_ready_count: manifest.not_ready_count,
    generic_fallback_count: manifest.generic_fallback_count,
    generic_norm_rows_count: certification.generic_norm_rows_count,
    templates_only_generic_norms_count: certification.templates_only_generic_norms_count,
    full_10000_real_norm_green_claimed: full10000Ready,
    actual_web_browser_smoke_passed: false,
    actual_android_chrome_browser_smoke_passed: false,
    browser_automation_started: false,
    fake_green_claimed: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    blockers,
  };

  if (options.writeSummary !== false) {
    summary.runtime_summary_path = writeRuntimeArtifacts({ cases, manifest, summary });
  }
  return summary;
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_ESTIMATE_FUNCTIONAL_REALITY_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimateFunctionalReality10000.ts")) {
  try {
    requireAllFlag();
    const summary = runEstimateFunctionalRealityAudit();
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = summary.final_status === GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
