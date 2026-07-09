import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal", "no-second-estimate-engine");

export type EstimateEngineSourceFile = {
  filePath: string;
  source: string;
};

export type NoSecondEstimateEngineAudit = {
  no_second_estimate_engine_passed: boolean;
  no_screen_local_calculation_passed: boolean;
  no_duplicate_pdf_engine_passed: boolean;
  no_duplicate_buyer_handoff_engine_passed: boolean;
  second_estimate_engine_detected: boolean;
  screen_local_calculation_detected: boolean;
  duplicate_pdf_estimate_logic_detected: boolean;
  duplicate_buyer_handoff_logic_detected: boolean;
  scanned_files_count: number;
  violations: string[];
  passed: boolean;
};

const DEFAULT_SCAN_ROOTS = [
  "src/features/consumerRepair",
  "src/features/requests",
  "src/screens/foreman",
  "src/lib/foreman",
  "src/features/pdf",
  "src/features/procurement",
] as const;

const ALLOWED_ENGINE_FILES = [
  "src/lib/ai/",
  "src/lib/estimate/",
  "src/features/estimates/",
  "src/features/pdf/renderPdfFromDraftRevision.ts",
  "src/features/procurement/createBuyerHandoffFromDraftRevision.ts",
  "src/lib/foreman/",
] as const;

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function collectFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const stats = statSync(root);
  if (stats.isFile()) return [root];
  return readdirSync(root).flatMap((entry) => {
    const fullPath = path.join(root, entry);
    const childStats = statSync(fullPath);
    if (childStats.isDirectory()) return collectFiles(fullPath);
    if (!/\.(ts|tsx)$/.test(entry)) return [];
    if (/(\.test|\.contract|\.styles)\.(ts|tsx)$/.test(entry)) return [];
    return [fullPath];
  });
}

export function loadEstimateEngineSourceFiles(roots: readonly string[] = DEFAULT_SCAN_ROOTS): EstimateEngineSourceFile[] {
  return roots
    .flatMap((root) => collectFiles(root))
    .map((filePath) => ({
      filePath: normalizePath(filePath),
      source: readFileSync(filePath, "utf8"),
    }));
}

function isAllowedEngineFile(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return ALLOWED_ENGINE_FILES.some((allowed) => normalized.startsWith(allowed) || normalized === allowed);
}

function isUiFile(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return normalized.includes("/components/") || normalized.includes("/screens/") || normalized.endsWith(".tsx");
}

export function scanNoSecondEstimateEngine(files: readonly EstimateEngineSourceFile[]): NoSecondEstimateEngineAudit {
  const violations: string[] = [];
  for (const file of files) {
    const normalized = normalizePath(file.filePath);
    const source = file.source;
    if (
      !isAllowedEngineFile(normalized) &&
      /\b(calculateEstimateInScreen|screenLocalEstimateEngine|localEstimateEngine|class\s+\w*EstimateEngine|function\s+calculate\w*Estimate)\b/.test(source)
    ) {
      violations.push(`${normalized}:second_estimate_engine`);
    }
    if (
      isUiFile(normalized) &&
      /\b(calculateGlobalConstructionEstimateSync|buildEstimateFromInlineWorkPrompt|createEstimateDraftRevision|renderPdfFromDraftRevision|createBuyerHandoffFromDraftRevision)\b/.test(source)
    ) {
      violations.push(`${normalized}:screen_local_calculation`);
    }
    if (
      !normalized.endsWith("src/features/pdf/renderPdfFromDraftRevision.ts") &&
      /\b(function|const)\s+\w*(render|create)\w*Pdf\w*(Estimate|Revision|Artifact)\b/.test(source)
    ) {
      violations.push(`${normalized}:duplicate_pdf_estimate_logic`);
    }
    if (
      !normalized.endsWith("src/features/procurement/createBuyerHandoffFromDraftRevision.ts") &&
      /\b(function|const)\s+\w*(create|build)\w*BuyerHandoff\w*(Estimate|DraftRevision|Artifact)\b/.test(source)
    ) {
      violations.push(`${normalized}:duplicate_buyer_handoff_logic`);
    }
    if (isUiFile(normalized) && /\b(manualMarkdownEstimate|screenLocalPdfRows|hardcodedBoqRows|oldCalcModalEstimatePath|oldWorkTypePickerEstimatePath)\b/.test(source)) {
      violations.push(`${normalized}:screen_local_forbidden_marker`);
    }
  }
  const second = violations.some((item) => item.endsWith(":second_estimate_engine"));
  const screenLocal = violations.some((item) => item.endsWith(":screen_local_calculation") || item.endsWith(":screen_local_forbidden_marker"));
  const duplicatePdf = violations.some((item) => item.endsWith(":duplicate_pdf_estimate_logic"));
  const duplicateBuyer = violations.some((item) => item.endsWith(":duplicate_buyer_handoff_logic"));
  return {
    no_second_estimate_engine_passed: !second,
    no_screen_local_calculation_passed: !screenLocal,
    no_duplicate_pdf_engine_passed: !duplicatePdf,
    no_duplicate_buyer_handoff_engine_passed: !duplicateBuyer,
    second_estimate_engine_detected: second,
    screen_local_calculation_detected: screenLocal,
    duplicate_pdf_estimate_logic_detected: duplicatePdf,
    duplicate_buyer_handoff_logic_detected: duplicateBuyer,
    scanned_files_count: files.length,
    violations,
    passed: violations.length === 0,
  };
}

export function auditNoSecondEstimateEngine(roots: readonly string[] = DEFAULT_SCAN_ROOTS) {
  const audit = scanNoSecondEstimateEngine(loadEstimateEngineSourceFiles(roots));
  const summary = {
    final_status: audit.passed
      ? "GREEN_AI_ESTIMATE_NO_SECOND_ENGINE"
      : "STOP_AI_ESTIMATE_NO_SECOND_ENGINE_FAILED",
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...audit,
    fake_green_claimed: false,
  };
  return writeRuntimeJson(ROOT, summary);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditNoSecondEstimateEngine.ts")) {
  const result = auditNoSecondEstimateEngine();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    violations: result.artifact.violations,
  }, null, 2));
  if (!result.artifact.passed) process.exitCode = 1;
}
