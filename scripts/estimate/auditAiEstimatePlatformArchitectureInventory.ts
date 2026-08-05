import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY =
  "GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY" as const;
export const STOP_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "architecture-inventory");

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walkFiles(fullPath);
    return stats.isFile()
      && /\.(ts|tsx)$/.test(entry)
      && !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry)
      ? [fullPath.replace(/\\/g, "/")]
      : [];
  });
}

function countMatches(files: readonly string[], pattern: RegExp): string[] {
  return files.filter((file) => pattern.test(readFileSync(file, "utf8")));
}

export function auditAiEstimatePlatformArchitectureInventory(input: { writeSummary?: boolean } = {}) {
  const estimateFiles = walkFiles("src/lib/estimate");
  const featureFiles = [
    ...walkFiles("src/features/requests"),
    ...walkFiles("src/features/consumerRepair"),
    ...walkFiles("src/lib/consumerRequests"),
    ...walkFiles("src/lib/foreman"),
    ...walkFiles("src/features/pdf"),
    ...walkFiles("src/features/procurement"),
  ];
  const e2eFiles = walkFiles("scripts/e2e");
  const runtimeFiles = estimateFiles.filter((file) => file.includes("/runtime/"));
  const catalogFiles = estimateFiles.filter((file) => file.includes("/catalog/"));
  const graphFiles = estimateFiles.filter((file) => file.includes("/graph/"));
  const formulaFiles = estimateFiles.filter((file) => file.includes("/formula/"));
  const revisionFiles = estimateFiles.filter((file) => file.includes("/revision/"));
  const artifactFiles = estimateFiles.filter((file) => file.includes("/artifacts/"));
  const storageFiles = estimateFiles.filter((file) => file.includes("/storage/"));
  const lowLevelUiImports = countMatches(featureFiles, /from ["'].*estimate\/(?:formula|graph|buildAiEstimateParameterCards|createEstimateDraftRevision|buildEstimateFromInlineWorkPrompt|applyAiEstimateParameterOverrides|recalculateEstimateDraftRevision)/);
  const duplicateRuntimePaths = countMatches(estimateFiles, /SecondEstimateEngine|CalcModal|OldEstimatePicker|old picker/i);
  const directStorageCalls = countMatches(estimateFiles, /\b(?:localStorage|sessionStorage)\b/).filter((file) => !file.includes("/storage/"));
  const summary = {
    final_status: GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    architecture_inventory_created: true,
    estimate_entrypoints_mapped: runtimeFiles.length >= 4,
    draft_revision_paths_mapped: revisionFiles.length >= 4,
    boq_compile_paths_mapped: formulaFiles.length >= 3 && graphFiles.length >= 3,
    pdf_buyer_paths_mapped: artifactFiles.length >= 4,
    history_storage_paths_mapped: storageFiles.length >= 4,
    web_android_harnesses_mapped: e2eFiles.some((file) => file.endsWith("aiEstimateE2eHarness.shared.ts")),
    direct_storage_calls_mapped: directStorageCalls.length === 0,
    duplicate_runtime_paths_mapped: duplicateRuntimePaths.length === 0,
    second_engine_risk_list_created: true,
    runtime_files: runtimeFiles,
    catalog_files: catalogFiles,
    graph_files: graphFiles,
    formula_files: formulaFiles,
    revision_files: revisionFiles,
    artifact_files: artifactFiles,
    storage_files: storageFiles,
    low_level_ui_imports: lowLevelUiImports,
    duplicate_runtime_paths: duplicateRuntimePaths,
    direct_storage_calls_outside_storage_adapter: directStorageCalls,
    blockers: [] as string[],
  };
  const blockers = [
    summary.estimate_entrypoints_mapped ? "" : "estimate_entrypoints_unmapped",
    summary.draft_revision_paths_mapped ? "" : "draft_revision_paths_unmapped",
    summary.boq_compile_paths_mapped ? "" : "boq_compile_paths_unmapped",
    summary.pdf_buyer_paths_mapped ? "" : "pdf_buyer_paths_unmapped",
    summary.history_storage_paths_mapped ? "" : "history_storage_paths_unmapped",
    summary.web_android_harnesses_mapped ? "" : "web_android_harnesses_unmapped",
    summary.direct_storage_calls_mapped ? "" : "direct_storage_calls_unmapped",
    lowLevelUiImports.length === 0 ? "" : `low_level_ui_imports:${lowLevelUiImports.length}`,
    duplicateRuntimePaths.length === 0 ? "" : `duplicate_runtime_paths:${duplicateRuntimePaths.length}`,
  ].filter(Boolean);
  const finalSummary = {
    ...summary,
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY
      : STOP_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY_FAILED,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, finalSummary);
  return { summary: finalSummary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimatePlatformArchitectureInventory({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_ARCHITECTURE_INVENTORY) process.exitCode = 1;
}
