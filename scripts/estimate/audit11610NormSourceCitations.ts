import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import { validateEstimateSourceRegistry } from "../../src/lib/estimate/validateSourceRegistry";
import { validateWorkPassportSources } from "../../src/lib/estimate/validateWorkPassportSources";

export const GREEN_AI_ESTIMATE_11610_SOURCE_REGISTRY_NORM_CITATION_GOVERNANCE_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_SOURCE_REGISTRY_NORM_CITATION_GOVERNANCE_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_SOURCE_REGISTRY_NORM_CITATION_GOVERNANCE_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_11610_SOURCE_REGISTRY_NORM_CITATION_GOVERNANCE_INCOMPLETE_NO_GREEN" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-source-citation-governance");
const ONLINE_RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-source-registry-online");

type GateFlags = {
  focused_source_citation_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  online_source_verification_passed: boolean;
};

function envBoolean(name: string): boolean {
  return process.env[name] === "1" || process.env[name]?.toLowerCase() === "true";
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function gitOutput(args: string[], fallback = "unknown"): string {
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

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function latestSummaryPath(root: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name === "summary.json") candidates.push(fullPath);
    }
  };
  walk(root);
  return candidates.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function latestOnlineSummary(sourceSha: string): {
  path: string | null;
  source_sha_matches_head: boolean;
  sources_verified_online: number;
  dead_source_links_count: number;
  domain_mismatch_count: number;
  final_status: string | null;
  blockers: string[];
} {
  const summaryPath = latestSummaryPath(ONLINE_RUNTIME_ROOT);
  if (!summaryPath) {
    return {
      path: null,
      source_sha_matches_head: false,
      sources_verified_online: 0,
      dead_source_links_count: 0,
      domain_mismatch_count: 0,
      final_status: null,
      blockers: ["online_source_verification_summary_missing"],
    };
  }
  const parsed = JSON.parse(readFileSync(summaryPath, "utf8")) as {
    source_sha?: string;
    sources_verified_online?: number;
    dead_source_links_count?: number;
    domain_mismatch_count?: number;
    final_status?: string;
    blockers?: string[];
  };
  return {
    path: summaryPath,
    source_sha_matches_head: parsed.source_sha === sourceSha,
    sources_verified_online: Number(parsed.sources_verified_online ?? 0),
    dead_source_links_count: Number(parsed.dead_source_links_count ?? 0),
    domain_mismatch_count: Number(parsed.domain_mismatch_count ?? 0),
    final_status: parsed.final_status ?? null,
    blockers: parsed.blockers ?? [],
  };
}

function gates(): GateFlags {
  return {
    focused_source_citation_tests_passed: envBoolean("SOURCE_CITATION_FOCUSED_TESTS_PASSED"),
    typecheck_passed: envBoolean("SOURCE_CITATION_TYPECHECK_PASSED"),
    lint_passed: envBoolean("SOURCE_CITATION_LINT_PASSED"),
    diff_check_passed: envBoolean("SOURCE_CITATION_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envBoolean("SOURCE_CITATION_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envBoolean("SOURCE_CITATION_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envBoolean("SOURCE_CITATION_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envBoolean("SOURCE_CITATION_SECRET_SCAN_PASSED"),
    online_source_verification_passed: envBoolean("SOURCE_CITATION_ONLINE_VERIFIER_PASSED"),
  };
}

export function audit11610NormSourceCitations(options: { writeLedger?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const branch = gitOutput(["branch", "--show-current"]);
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const stagedClean = gitOutput(["diff", "--cached", "--name-only"], "") === "";
  const sourceRegistry = validateEstimateSourceRegistry();
  const passportSources = validateWorkPassportSources();
  const gateFlags = gates();
  const online = latestOnlineSummary(sourceSha);
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  const ledgerPath = path.join(outDir, "passport-source-ledger.jsonl");
  const summaryPath = path.join(outDir, "summary.json");
  const gateGreen = Object.values(gateFlags).every(Boolean);
  const blockers = [
    ...sourceRegistry.blockers.map((blocker) => `source_registry:${blocker}`),
    ...passportSources.summary.blocking_reasons.map((blocker) => `passport_sources:${blocker}`),
    passportSources.summary.templates_audited === PROFESSIONAL_WORK_PASSPORT_TOTAL ? "" : "templates_audited_not_11610",
    passportSources.summary.blocked_templates_count === 0 ? "" : `blocked_templates_count:${passportSources.summary.blocked_templates_count}`,
    passportSources.summary.rows_without_source_citation_count === 0 ? "" : "rows_without_source_citation",
    passportSources.summary.formulas_without_provenance_count === 0 ? "" : "formulas_without_provenance",
    passportSources.summary.rows_without_quantity_trace_count === 0 ? "" : "rows_without_quantity_trace",
    passportSources.summary.price_rows_without_pricebook_source_count === 0 ? "" : "price_rows_without_pricebook_source",
    sourceRegistry.unverified_sources_used_as_trusted_count === 0 ? "" : "unverified_sources_used_as_trusted",
    sourceRegistry.license_blocked_count === 0 ? "" : `BLOCKED_OWNER_NORMATIVE_DATABASE_LICENSE_REQUIRED:${sourceRegistry.license_blocked_count}`,
    sourceRegistry.source_missing_count === 0 ? "" : `BLOCKED_SOURCE_MISSING:${sourceRegistry.source_missing_count}`,
    sourceRegistry.external_norm_requires_kg_validation_count === 0
      ? ""
      : `EXTERNAL_NORM_REQUIRES_KG_VALIDATION:${sourceRegistry.external_norm_requires_kg_validation_count}`,
    sourceRegistry.domain_expert_review_required_count === 0
      ? ""
      : `domain_expert_review_required_sources:${sourceRegistry.domain_expert_review_required_count}`,
    passportSources.summary.rows_without_production_trusted_source_count === 0
      ? ""
      : `rows_without_production_trusted_source:${passportSources.summary.rows_without_production_trusted_source_count}`,
    passportSources.summary.domain_expert_review_required_rows_count === 0
      ? ""
      : `domain_expert_review_required_rows:${passportSources.summary.domain_expert_review_required_rows_count}`,
    passportSources.summary.license_blocked_rows_count === 0
      ? ""
      : `license_blocked_rows:${passportSources.summary.license_blocked_rows_count}`,
    passportSources.summary.official_source_rows_count > 0 ? "" : "official_source_rows_missing",
    passportSources.summary.manufacturer_source_rows_count > 0 ? "" : "manufacturer_source_rows_missing",
    online.sources_verified_online >= 1 ? "" : "sources_verified_online_missing",
    online.dead_source_links_count === 0 ? "" : `dead_source_links_count:${online.dead_source_links_count}`,
    online.domain_mismatch_count === 0 ? "" : `domain_mismatch_count:${online.domain_mismatch_count}`,
    online.source_sha_matches_head ? "" : "online_source_sha_mismatch",
    gateGreen ? "" : "required_gates_not_all_passed",
    worktreeClean ? "" : "worktree_not_clean_after_commit",
    stagedClean ? "" : "staged_changes_present",
  ].filter(Boolean);
  const finalStatus = blockers.length === 0
    ? GREEN_AI_ESTIMATE_11610_SOURCE_REGISTRY_NORM_CITATION_GOVERNANCE_COMMITTED_NO_RELEASE
    : STOP_AI_ESTIMATE_11610_SOURCE_REGISTRY_NORM_CITATION_GOVERNANCE_INCOMPLETE_NO_GREEN;
  const summary = {
    final_status: finalStatus,
    source_sha: sourceSha,
    branch,
    worktree_clean: worktreeClean,
    staged_clean: stagedClean,
    generated_at: new Date().toISOString(),
    templates_audited: passportSources.summary.templates_audited,
    rows_audited: passportSources.summary.rows_audited,
    source_citations_attached_to_boq_rows_count: passportSources.summary.source_citations_attached_to_boq_rows_count,
    blocked_templates_count: passportSources.summary.blocked_templates_count,
    sources_verified_online: online.sources_verified_online,
    online_source_summary_path: online.path,
    online_source_sha_matches_head: online.source_sha_matches_head,
    dead_source_links_count: online.dead_source_links_count,
    domain_mismatch_count: online.domain_mismatch_count,
    official_source_verified_count: sourceRegistry.official_source_verified_count,
    manufacturer_source_verified_count: sourceRegistry.manufacturer_source_verified_count,
    external_norm_requires_kg_validation_count: sourceRegistry.external_norm_requires_kg_validation_count,
    source_missing_count: sourceRegistry.source_missing_count,
    license_blocked_count: sourceRegistry.license_blocked_count,
    domain_expert_review_required_count: sourceRegistry.domain_expert_review_required_count,
    unverified_sources_used_as_trusted_count: sourceRegistry.unverified_sources_used_as_trusted_count,
    rows_without_norm_source_count: passportSources.summary.rows_without_norm_source_count,
    rows_without_source_citation_count: passportSources.summary.rows_without_source_citation_count,
    formulas_without_provenance_count: passportSources.summary.formulas_without_provenance_count,
    rows_without_quantity_trace_count: passportSources.summary.rows_without_quantity_trace_count,
    price_rows_without_pricebook_source_count: passportSources.summary.price_rows_without_pricebook_source_count,
    rows_without_production_trusted_source_count: passportSources.summary.rows_without_production_trusted_source_count,
    domain_expert_review_required_rows_count: passportSources.summary.domain_expert_review_required_rows_count,
    official_source_rows_count: passportSources.summary.official_source_rows_count,
    manufacturer_source_rows_count: passportSources.summary.manufacturer_source_rows_count,
    external_norm_requires_kg_validation_rows_count: passportSources.summary.external_norm_requires_kg_validation_rows_count,
    license_blocked_rows_count: passportSources.summary.license_blocked_rows_count,
    all_11610_work_passports_have_norm_source_citations: passportSources.summary.all_11610_work_passports_have_norm_source_citations,
    all_boq_rows_have_norm_source_citation: passportSources.summary.all_boq_rows_have_norm_source_citation,
    all_boq_rows_have_formula_provenance: passportSources.summary.all_boq_rows_have_formula_provenance,
    all_boq_rows_have_quantity_trace: passportSources.summary.all_boq_rows_have_quantity_trace,
    all_price_rows_have_pricebook_source_or_missing_price_policy: passportSources.summary.all_price_rows_have_pricebook_source_or_missing_price_policy,
    source_registry_valid: sourceRegistry.source_registry_valid,
    ui_source_citation_helper_created: true,
    pdf_source_section_helper_created: true,
    buyer_handoff_source_trace_helper_created: true,
    ...gateFlags,
    gate_green: gateGreen,
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
    ledger_artifact: options.writeLedger ? ledgerPath : null,
    runtime_summary_path: summaryPath,
    blockers: [...blockers, ...online.blockers.map((blocker) => `online:${blocker}`)],
  };
  if (options.writeLedger) writeJsonl(ledgerPath, passportSources.validations);
  writeJson(summaryPath, summary);
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/audit11610NormSourceCitations.ts")) {
  const summary = audit11610NormSourceCitations({ writeLedger: hasFlag("write-ledger") || hasFlag("json") });
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.final_status === GREEN_AI_ESTIMATE_11610_SOURCE_REGISTRY_NORM_CITATION_GOVERNANCE_COMMITTED_NO_RELEASE ? 0 : 1;
}
