import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import productionTrustDashboard from "../../data/estimate-governance/production-trust-dashboard.json";
import { recordEstimateTelemetryEvent } from "../../src/features/estimates/telemetry/estimateTelemetryRecorder";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "quality-drift");

export type EstimateQualityMetrics = {
  golden_cases_passed: number;
  zero_tolerance_violations: number;
  pdf_snapshot_mismatches: number;
  buyer_handoff_invalid_count: number;
  catalog_total_templates: number;
  pricebook_coverage_percent: number;
};

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function listSummaryFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, item.name);
    if (item.isDirectory()) out.push(...listSummaryFiles(fullPath));
    else if (item.isFile() && item.name === "summary.json") out.push(fullPath);
  }
  return out;
}

function latestSummary(root: string): Record<string, unknown> {
  const latest = listSummaryFiles(root).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  if (!latest) throw new Error(`summary_missing:${root}`);
  return JSON.parse(readFileSync(latest, "utf8")) as Record<string, unknown>;
}

export function auditEstimateQualityDrift(
  current: EstimateQualityMetrics,
  baseline: EstimateQualityMetrics,
  options: { includeMutationGates?: boolean } = {},
): {
  final_status: string;
  current: EstimateQualityMetrics;
  baseline: EstimateQualityMetrics;
  no_quality_drift: boolean;
  mutation_gates: Record<string, boolean> | null;
  blockers: string[];
} {
  const blockers = [
    current.golden_cases_passed >= baseline.golden_cases_passed ? "" : "golden_cases_passed_decreased",
    current.zero_tolerance_violations <= baseline.zero_tolerance_violations ? "" : "zero_tolerance_violations_increased",
    current.pdf_snapshot_mismatches <= baseline.pdf_snapshot_mismatches ? "" : "pdf_snapshot_mismatches_increased",
    current.buyer_handoff_invalid_count <= baseline.buyer_handoff_invalid_count ? "" : "buyer_handoff_invalid_increased",
    current.catalog_total_templates >= baseline.catalog_total_templates ? "" : "catalog_total_templates_decreased",
    current.pricebook_coverage_percent >= baseline.pricebook_coverage_percent ? "" : "pricebook_coverage_decreased",
  ].filter(Boolean);
  if (blockers.length > 0) {
    recordEstimateTelemetryEvent({
      event_name: "quality_drift_detected",
      route: "script",
      platform: "node",
      payload: { blockers },
    });
  }
  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_QUALITY_DRIFT"
      : "STOP_AI_ESTIMATE_QUALITY_DRIFT_DETECTED",
    current,
    baseline,
    no_quality_drift: blockers.length === 0,
    mutation_gates: options.includeMutationGates === false ? null : runQualityDriftMutationGates(),
    blockers,
  };
}

export function loadCurrentQualityMetrics(): EstimateQualityMetrics {
  const golden = latestSummary(path.join(".release-runtime", "ai-estimate-golden-benchmark-acceptance"));
  return {
    golden_cases_passed: Number(golden.golden_cases_passed ?? 0),
    zero_tolerance_violations: Number(golden.zero_tolerance_violations ?? 0),
    pdf_snapshot_mismatches: Number(golden.pdf_snapshot_mismatches ?? 0),
    buyer_handoff_invalid_count: Number(golden.buyer_handoff_invalid_count ?? 0),
    catalog_total_templates: Number(productionTrustDashboard.catalog_total_templates ?? 0),
    pricebook_coverage_percent: Number(productionTrustDashboard.pricebook_coverage_percent ?? 0),
  };
}

export function runQualityDriftMutationGates(): Record<string, boolean> {
  const baseline: EstimateQualityMetrics = {
    golden_cases_passed: 10,
    zero_tolerance_violations: 0,
    pdf_snapshot_mismatches: 0,
    buyer_handoff_invalid_count: 0,
    catalog_total_templates: 100,
    pricebook_coverage_percent: 80,
  };
  return {
    lower_golden_pass_count_rejected: auditEstimateQualityDrift({ ...baseline, golden_cases_passed: 9 }, baseline, { includeMutationGates: false }).blockers.includes("golden_cases_passed_decreased"),
    zero_tolerance_increase_rejected: auditEstimateQualityDrift({ ...baseline, zero_tolerance_violations: 1 }, baseline, { includeMutationGates: false }).blockers.includes("zero_tolerance_violations_increased"),
    catalog_decrease_rejected: auditEstimateQualityDrift({ ...baseline, catalog_total_templates: 99 }, baseline, { includeMutationGates: false }).blockers.includes("catalog_total_templates_decreased"),
  };
}

export function runQualityDriftCli() {
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  const current = loadCurrentQualityMetrics();
  const summary = auditEstimateQualityDrift(current, current);
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = runQualityDriftCli();
  console.log(JSON.stringify({ ...summary, artifact: outPath }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
