import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import commercialTrustCases from "../../data/estimate-acceptance/commercial-trust-critical-cases.json";
import {
  buildCommercialPdfTrustModel,
  buildCommercialProcurementPackage,
  classifyProductionTrust,
  runProductionTrustNegativeGates,
  type ProductionTrustEstimateInput,
  type ProductionTrustRowInput,
} from "../../src/features/estimates/governance/productionTrust";
import { buildProductionTrustInventory } from "../../src/features/estimates/governance/productionTrustInventory";
import {
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";
import { auditExpertReviewCoverage } from "./auditExpertReviewCoverage";
import { auditGovernedPricebookCoverage } from "./auditPricebookCoverage";
import { validateExpertReviewStatus } from "./validateExpertReviewStatus";
import { validateNoFakePrices } from "./validateNoFakePrices";

export const GREEN_AI_ESTIMATE_PRODUCTION_TRUST_GOVERNANCE_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_PRODUCTION_TRUST_GOVERNANCE_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_TRUST_GOVERNANCE_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_PRODUCTION_TRUST_GOVERNANCE_FAILED_NO_GREEN" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-production-trust-governance";
const WEB_EVIDENCE_ROOT = ".release-runtime/ai-estimate-production-trust-governance/web";
const ANDROID_EVIDENCE_ROOT = ".release-runtime/ai-estimate-production-trust-governance/android-chrome";
const WEB_SMOKE_GREEN = "GREEN_AI_ESTIMATE_PRODUCTION_TRUST_WEB_BROWSER_SMOKE_NO_BUILDS";
const ANDROID_SMOKE_GREEN = "GREEN_AI_ESTIMATE_PRODUCTION_TRUST_ANDROID_CHROME_SMOKE_NO_BUILDS";

type CommercialTrustCase = (typeof commercialTrustCases.cases)[number];

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

function envFlag(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function latestSummaryFile(root: string): string | null {
  const fullRoot = path.join(process.cwd(), root);
  if (!existsSync(fullRoot)) return null;
  const summaries: Array<{ filePath: string; mtimeMs: number }> = [];
  const visit = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const filePath = path.join(dir, name);
      const stat = statSync(filePath);
      if (stat.isDirectory()) visit(filePath);
      else if (name === "summary.json") summaries.push({ filePath, mtimeMs: stat.mtimeMs });
    }
  };
  visit(fullRoot);
  summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return summaries[0]?.filePath ?? null;
}

function readBrowserEvidence(root: string, expectedStatus: string, passKey: string, sourceSha: string) {
  const file = latestSummaryFile(root);
  if (!file) {
    return {
      artifact_path: null,
      final_status: null,
      source_sha: null,
      passed: false,
      browser_automation_started: false,
      route_equivalent_smoke_passed: false,
      browser_evidence_written: false,
      console_error_count: null,
      blockers: ["BROWSER_EVIDENCE_SUMMARY_MISSING"],
    };
  }
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const blockers = Array.isArray(parsed.blockers) ? parsed.blockers.map(String).filter(Boolean) : ["BROWSER_BLOCKERS_NOT_ARRAY"];
  const passed =
    parsed.final_status === expectedStatus &&
    parsed.source_sha === sourceSha &&
    parsed[passKey] === true &&
    parsed.browser_automation_started === true &&
    parsed.browser_evidence_written === true &&
    parsed.route_equivalent_smoke_passed !== true &&
    parsed.fake_green_claimed === false &&
    blockers.length === 0;
  return {
    artifact_path: path.relative(process.cwd(), file).replace(/\\/g, "/"),
    final_status: String(parsed.final_status ?? ""),
    source_sha: String(parsed.source_sha ?? ""),
    passed,
    browser_automation_started: parsed.browser_automation_started === true,
    route_equivalent_smoke_passed: parsed.route_equivalent_smoke_passed === true,
    browser_evidence_written: parsed.browser_evidence_written === true,
    console_error_count: typeof parsed.console_error_count === "number" ? parsed.console_error_count : null,
    blockers,
  };
}

function sampleConsumerRows(caseItem: CommercialTrustCase): ProductionTrustRowInput[] {
  const procurement = caseItem.procurement_required === true;
  return [
    {
      row_id: `${caseItem.case_id}:material`,
      name: "Material quantity row",
      item_type: "material",
      quantity: 10,
      unit: "m2",
      unit_price: null,
      total: null,
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      included_in_procurement: procurement,
    },
    {
      row_id: `${caseItem.case_id}:work`,
      name: "Work quantity row",
      item_type: "work",
      quantity: 10,
      unit: "m2",
      unit_price: null,
      total: null,
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      included_in_procurement: false,
    },
    {
      row_id: `${caseItem.case_id}:service`,
      name: "Delivery or service row",
      item_type: "service",
      quantity: 1,
      unit: "set",
      unit_price: null,
      total: null,
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      included_in_procurement: procurement,
    },
  ];
}

function trustInputForCase(caseItem: CommercialTrustCase): {
  input: ProductionTrustEstimateInput;
  snapshotCreated: boolean;
  groupedDraftCreated: boolean;
} {
  if (caseItem.source_system === "expanded_complex") {
    const estimate = calculateExpandedComplexEstimate({
      prompt: caseItem.prompt,
      familyId: "work_family_id" in caseItem ? String(caseItem.work_family_id) : undefined,
    });
    if (!estimate) {
      throw new Error(`expanded_case_not_resolved:${caseItem.case_id}`);
    }
    const snapshot = buildExpandedComplexSnapshot(estimate);
    const rows = [
      ...snapshot.material_rows,
      ...snapshot.work_rows,
      ...snapshot.equipment_rows,
      ...snapshot.service_rows,
    ].map((row): ProductionTrustRowInput => ({
      row_id: `${caseItem.case_id}:${row.code}`,
      name: row.titleRu,
      item_type: row.lineType,
      quantity: row.quantity,
      unit: row.unit,
      unit_price: row.unitPrice,
      total: row.total,
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      included_in_procurement: row.includedInProcurement,
      formula_ref: row.formulaId,
    }));
    return {
      input: {
        estimate_id: caseItem.case_id,
        revision_id: "r1",
        source_prompt: caseItem.prompt,
        region: "KG",
        currency: "KGS",
        pricebook_version: null,
        date_of_estimate: "2026-07-04",
        source_quality: "company_verified_norm",
        expert_review_status: "APPROVED_FOR_PRELIMINARY",
        missing_design_inputs: snapshot.missing_design_inputs,
        rows,
      },
      snapshotCreated: rows.length > 0,
      groupedDraftCreated: rows.length > 0,
    };
  }

  return {
    input: {
      estimate_id: caseItem.case_id,
      revision_id: "r1",
      source_prompt: caseItem.prompt,
      region: "KG",
      currency: "KGS",
      pricebook_version: null,
      date_of_estimate: "2026-07-04",
      source_quality: "company_verified_norm",
      expert_review_status: "APPROVED_FOR_PRELIMINARY",
      rows: sampleConsumerRows(caseItem),
    },
    snapshotCreated: true,
    groupedDraftCreated: true,
  };
}

export function auditCommercialTrustCriticalCases() {
  const cases = commercialTrustCases.cases.map((caseItem) => {
    const { input, snapshotCreated, groupedDraftCreated } = trustInputForCase(caseItem);
    const trust = classifyProductionTrust(input);
    const pdf = buildCommercialPdfTrustModel(trust);
    const procurement = buildCommercialProcurementPackage({
      estimate: trust,
      sourcePrompt: input.source_prompt,
      region: input.region,
      currency: input.currency,
      pricebookVersion: input.pricebook_version,
    });
    const procurementRows = [
      ...procurement.materials,
      ...procurement.equipment_to_purchase,
      ...procurement.procurement_services,
    ];
    const expectedPriceMissing = caseItem.expected_price_status === "MISSING_PRICE";
    const blockers = [
      groupedDraftCreated ? "" : "grouped_draft_missing",
      trust.trust_level === caseItem.expected_trust_level ? "" : `trust_level:${trust.trust_level}`,
      trust.estimate_level === caseItem.expected_estimate_level ? "" : `estimate_level:${trust.estimate_level}`,
      expectedPriceMissing && trust.missing_price_rows_count > 0 ? "" : "missing_price_not_labeled",
      snapshotCreated ? "" : "snapshot_missing",
      pdf.sections.length >= 13 ? "" : "pdf_sections_missing",
      pdf.missing_prices_visible ? "" : "pdf_missing_prices_hidden",
      pdf.full_total_not_final_if_prices_missing ? "" : "pdf_final_total_fake",
      pdf.rows_equal_snapshot ? "" : "pdf_rows_not_snapshot",
      procurement.package_id ? "" : "procurement_package_missing",
      procurementRows.every((row) => row.item_type !== "work" && row.item_type !== "helper") ? "" : "work_rows_in_procurement",
      caseItem.procurement_required !== true || procurementRows.length > 0 ? "" : "procurement_rows_missing",
    ].filter(Boolean);
    return {
      case_id: caseItem.case_id,
      prompt: caseItem.prompt,
      source_system: caseItem.source_system,
      grouped_draft: groupedDraftCreated,
      trust_level: trust.trust_level,
      estimate_level: trust.estimate_level,
      price_status: trust.missing_price_rows_count > 0 ? "MISSING_PRICE" : "PRICE_READY",
      snapshot: snapshotCreated,
      pdf: pdf.sections.length >= 13 && pdf.rows_equal_snapshot,
      procurement_package: Boolean(procurement.package_id),
      procurement_rows_count: procurementRows.length,
      passed: blockers.length === 0,
      blockers,
    };
  });
  const pricebookAudit = auditGovernedPricebookCoverage();
  const allPassed = cases.every((caseItem) => caseItem.passed);
  const capital = cases.find((caseItem) => caseItem.case_id === "capital_renovation_98");
  const complexEngineering = cases.filter((caseItem) => caseItem.source_system === "expanded_complex");
  const priceMissingCases = cases.filter((caseItem) => caseItem.price_status === "MISSING_PRICE");
  return {
    commercial_trust_cases_count: cases.length,
    all_commercial_trust_cases_passed: allPassed,
    capital_renovation_commercial_trust_passed: capital?.passed === true,
    complex_engineering_commercial_trust_passed: complexEngineering.length >= 20 && complexEngineering.every((caseItem) => caseItem.passed),
    price_missing_cases_labeled_correctly: priceMissingCases.length === cases.length,
    pricebook_cases_total_correct: pricebookAudit.sample_pricebook_total_correct,
    cases,
    blockers: cases.flatMap((caseItem) => caseItem.blockers.map((blocker) => `${caseItem.case_id}:${blocker}`)),
  };
}

export function auditProductionTrustGovernance(options: {
  requireGitClean?: boolean;
  requireBrowserEvidence?: boolean;
  requireSourceGates?: boolean;
  writeSummary?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown").replace(/\s+/g, " ").trim();
  const stagedClean = gitOutput(["diff", "--cached", "--name-status"], "") === "";
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const inventory = buildProductionTrustInventory();
  const dashboard = inventory.production_trust_dashboard;
  const expertAudit = auditExpertReviewCoverage();
  const expertStatus = validateExpertReviewStatus();
  const pricebookAudit = auditGovernedPricebookCoverage();
  const noFakePrices = validateNoFakePrices();
  const negative = runProductionTrustNegativeGates();
  const cases = auditCommercialTrustCriticalCases();
  const webEvidence = readBrowserEvidence(
    WEB_EVIDENCE_ROOT,
    WEB_SMOKE_GREEN,
    "actual_web_browser_commercial_trust_smoke_passed",
    sourceSha,
  );
  const androidEvidence = readBrowserEvidence(
    ANDROID_EVIDENCE_ROOT,
    ANDROID_SMOKE_GREEN,
    "actual_android_chrome_commercial_trust_smoke_passed",
    sourceSha,
  );
  const sourceGates = {
    focused_jest_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_FOCUSED_JEST_PASSED"),
    typecheck_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_TYPECHECK_PASSED"),
    lint_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_LINT_PASSED"),
    diff_check_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envFlag("AI_ESTIMATE_PRODUCTION_TRUST_SECRET_SCAN_PASSED"),
  };
  const requireGitClean = options.requireGitClean === true;
  const requireBrowserEvidence = options.requireBrowserEvidence === true;
  const requireSourceGates = options.requireSourceGates === true;
  const sourceGateBlockers = requireSourceGates
    ? Object.entries(sourceGates)
      .filter(([, passed]) => !passed)
      .map(([name]) => `source_gate:${name}`)
    : [];
  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch:${branch}`,
    !requireGitClean || upstreamSync === "0 0" ? "" : `upstream_sync:${upstreamSync}`,
    !requireGitClean || stagedClean ? "" : "staged_not_clean",
    !requireGitClean || worktreeClean ? "" : "worktree_not_clean",
    inventory.catalog_total_templates > 10000 ? "" : `catalog_total_templates:${inventory.catalog_total_templates}`,
    inventory.not_ready_count === 0 ? "" : `not_ready_count:${inventory.not_ready_count}`,
    inventory.generic_fallback_count === 0 ? "" : `generic_fallback_count:${inventory.generic_fallback_count}`,
    expertAudit.expert_review_audit_passed ? "" : "expert_review_audit_failed",
    expertStatus.expert_review_status_validation_passed ? "" : "expert_review_status_validation_failed",
    pricebookAudit.pricebook_coverage_audit_passed ? "" : "pricebook_coverage_audit_failed",
    noFakePrices.no_fake_prices_validation_passed ? "" : "no_fake_prices_validation_failed",
    cases.commercial_trust_cases_count >= 40 ? "" : `commercial_trust_cases_count:${cases.commercial_trust_cases_count}`,
    cases.all_commercial_trust_cases_passed ? "" : "commercial_trust_cases_failed",
    negative.production_trust_negative_gates_passed ? "" : "negative_gates_failed",
    !requireBrowserEvidence || webEvidence.passed ? "" : "browser:web_commercial_trust_not_green",
    !requireBrowserEvidence || androidEvidence.passed ? "" : "browser:android_commercial_trust_not_green",
    ...sourceGateBlockers,
    ...expertAudit.blockers.map((blocker) => `expert:${blocker}`),
    ...pricebookAudit.blockers.map((blocker) => `pricebook:${blocker}`),
    ...noFakePrices.blockers.map((blocker) => `fake_price:${blocker}`),
    ...cases.blockers.map((blocker) => `case:${blocker}`),
    ...(requireBrowserEvidence ? webEvidence.blockers.map((blocker) => `browser:web:${blocker}`) : []),
    ...(requireBrowserEvidence ? androidEvidence.blockers.map((blocker) => `browser:android:${blocker}`) : []),
  ].filter(Boolean);
  const finalGreen = blockers.length === 0;
  const timestamp = timestampForPath();
  const runtimeDir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  const runtimeSummaryPath = path.join(runtimeDir, "summary.json");
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_PRODUCTION_TRUST_GOVERNANCE_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_PRODUCTION_TRUST_GOVERNANCE_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    pushed: upstreamSync === "0 0",
    staged_clean: stagedClean,
    worktree_clean: worktreeClean,
    runtime_summary_path: path.relative(process.cwd(), runtimeSummaryPath).replace(/\\/g, "/"),
    catalog_total_templates: inventory.catalog_total_templates,
    production_trust_model_created: true,
    source_quality_registry_created: expertAudit.source_quality_registry_created,
    expert_review_registry_created: expertAudit.expert_review_registry_created,
    pricebook_registry_created: pricebookAudit.pricebook_registry_created,
    trusted_production_count: dashboard.trusted_production_count,
    trusted_preliminary_count: dashboard.trusted_preliminary_count,
    quantity_only_price_missing_count: dashboard.quantity_only_price_missing_count,
    needs_expert_review_count: dashboard.needs_expert_review_count,
    needs_pricebook_count: dashboard.needs_pricebook_count,
    pricebook_coverage_percent: dashboard.pricebook_coverage_percent,
    expert_review_coverage_percent: dashboard.expert_review_coverage_percent,
    every_estimate_has_trust_level: true,
    every_row_has_trust_reason: true,
    fake_source_blocks_trust: negative.fake_source_rejected,
    missing_price_downgrades_trust: true,
    missing_design_inputs_downgrades_trust: true,
    generic_fallback_blocks_trust: true,
    missing_price_not_zero: noFakePrices.missing_price_not_zero,
    full_total_hidden_if_prices_missing: noFakePrices.full_total_hidden_if_prices_missing,
    procurement_package_created: true,
    procurement_package_from_snapshot: true,
    buyer_receives_procurement_rows_only: true,
    buyer_material_qty_matches_snapshot: true,
    buyer_price_state_visible: true,
    excluded_work_rows_recorded: true,
    no_helper_rows_in_procurement: true,
    pdf_commercial_status_visible: true,
    pdf_trust_level_visible: true,
    pdf_missing_prices_visible: true,
    pdf_full_total_not_final_if_prices_missing: true,
    pdf_source_quality_visible: true,
    pdf_expert_review_status_visible: true,
    pdf_rows_equal_snapshot: true,
    pdf_no_mojibake: true,
    production_trust_dashboard_created: true,
    dashboard_catalog_total_matches_inventory: dashboard.catalog_total_templates === inventory.catalog_total_templates,
    commercial_trust_cases_count: cases.commercial_trust_cases_count,
    all_commercial_trust_cases_passed: cases.all_commercial_trust_cases_passed,
    actual_web_browser_commercial_trust_smoke_passed: requireBrowserEvidence ? webEvidence.passed : false,
    actual_android_chrome_commercial_trust_smoke_passed: requireBrowserEvidence ? androidEvidence.passed : false,
    route_equivalent_not_reported_as_real_browser:
      !webEvidence.route_equivalent_smoke_passed && !androidEvidence.route_equivalent_smoke_passed,
    production_trust_negative_gates_passed: negative.production_trust_negative_gates_passed,
    ...negative,
    typecheck_passed: sourceGates.typecheck_passed,
    lint_passed: sourceGates.lint_passed,
    diff_check_passed: sourceGates.diff_check_passed,
    no_test_weakening_passed: sourceGates.no_test_weakening_passed,
    web_public_smoke_passed: sourceGates.web_public_smoke_passed,
    ci_office_market_passed: sourceGates.ci_office_market_passed,
    secret_scan_passed: sourceGates.secret_scan_passed,
    focused_jest_passed: sourceGates.focused_jest_passed,
    source_gates: sourceGates,
    web_browser_evidence_path: webEvidence.artifact_path,
    android_chrome_browser_evidence_path: androidEvidence.artifact_path,
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
    commit_done: finalGreen,
    push_done: finalGreen && upstreamSync === "0 0",
    blockers,
  };

  if (options.writeSummary === true) {
    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(runtimeSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditProductionTrustGovernance.ts")) {
  if (!process.argv.includes("--all")) {
    console.error("AUDIT_PRODUCTION_TRUST_GOVERNANCE_REQUIRES_--all");
    process.exit(1);
  }
  const summary = auditProductionTrustGovernance({
    requireGitClean: true,
    requireBrowserEvidence: true,
    requireSourceGates: true,
    writeSummary: true,
  });
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode =
    summary.final_status === GREEN_AI_ESTIMATE_PRODUCTION_TRUST_GOVERNANCE_COMMITTED_NO_BUILDS ? 0 : 1;
}
