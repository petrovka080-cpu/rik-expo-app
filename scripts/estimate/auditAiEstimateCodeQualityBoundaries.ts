import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES =
  "GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES" as const;
export const STOP_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES_FAILED =
  "STOP_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "code-quality-boundaries");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walk(fullPath);
    return stats.isFile() && /\.(ts|tsx)$/.test(entry) ? [fullPath.replace(/\\/g, "/")] : [];
  });
}

function source(files: readonly string[]): string {
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

function count(files: readonly string[], pattern: RegExp): number {
  return files.filter((file) => pattern.test(readFileSync(file, "utf8"))).length;
}

function circularImportsCount(files: readonly string[]): number {
  const imports = new Map<string, string[]>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const deps = [...text.matchAll(/from ["'](\.[^"']+)["']/g)]
      .map((match) => path.normalize(path.join(path.dirname(file), match[1])).replace(/\\/g, "/"));
    imports.set(file.replace(/\.tsx?$/, ""), deps.map((dep) => dep.replace(/\.tsx?$/, "")));
  }
  let cycles = 0;
  for (const [file, deps] of imports) {
    for (const dep of deps) {
      if (imports.get(dep)?.includes(file)) cycles += 1;
    }
  }
  return cycles;
}

export function auditAiEstimateCodeQualityBoundaries(input: { writeSummary?: boolean } = {}) {
  const estimateFiles = walk("src/lib/estimate");
  const uiFiles = [
    ...walk("src/features/requests"),
    ...walk("src/features/consumerRepair"),
    ...walk("src/lib/consumerRequests"),
    ...walk("src/lib/foreman"),
  ];
  const visibleUiSurfaceFiles = [
    ...walk("src/features/requests"),
    ...walk("src/features/consumerRepair"),
  ].filter((file) =>
    file.endsWith(".tsx")
      || /(?:Screen|Panel|Card|Row|Chips|View)\.ts$/.test(file),
  );
  const e2eFiles = walk("scripts/e2e").filter((file) => /AiEstimate|aiEstimate/.test(file));
  const allSource = source([...estimateFiles, ...uiFiles, ...e2eFiles]);
  const circular = circularImportsCount(estimateFiles);
  const uiLowLevel = count(uiFiles, /from ["'].*estimate\/(?:formula|graph|createEstimateDraftRevision|buildEstimateFromInlineWorkPrompt|buildAiEstimateParameterCards|applyAiEstimateParameterOverrides|recalculateEstimateDraftRevision)/);
  const duplicateEngines = (allSource.match(/SecondEstimateEngine|CalcModal revival|OldEstimatePicker|new EstimateEngine/g) ?? []).length;
  const duplicateParsers = count(estimateFiles, /parseInlineWorkEstimatePrompt/g) > 1 ? 1 : 0;
  const directStorage = count(estimateFiles.filter((file) => !file.includes("/storage/")), /\b(?:localStorage|sessionStorage)\b/);
  const e2eHarnessDuplication = e2eFiles.some((file) => file.endsWith("aiEstimateE2eHarness.shared.ts")) ? 0 : 1;
  const rawInternalIdsVisible = count(visibleUiSurfaceFiles, /PRICE_MISSING|sourceParameters|formula_id|template_id|round_to/);
  const checks = {
    estimate_platform_boundary_audit_created: true,
    circular_imports_count: circular === 0,
    ui_low_level_estimate_imports_count: uiLowLevel === 0,
    duplicate_estimate_engines_count: duplicateEngines === 0,
    duplicate_parameter_parsers_count: duplicateParsers === 0,
    direct_storage_access_violations_count: directStorage === 0,
    e2e_harness_duplication_violations_count: e2eHarnessDuplication === 0,
    raw_internal_ids_visible_count: rawInternalIdsVisible === 0,
  };
  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES
      : STOP_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    estimate_platform_boundary_audit_created: true,
    circular_imports_count: circular,
    ui_low_level_estimate_imports_count: uiLowLevel,
    duplicate_estimate_engines_count: duplicateEngines,
    duplicate_parameter_parsers_count: duplicateParsers,
    direct_storage_access_violations_count: directStorage,
    e2e_harness_duplication_violations_count: e2eHarnessDuplication,
    raw_internal_ids_visible_count: rawInternalIdsVisible,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateCodeQualityBoundaries({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_CODE_QUALITY_BOUNDARIES) process.exitCode = 1;
}
