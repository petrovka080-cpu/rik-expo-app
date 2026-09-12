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
  legacy_real_quantity_engine_unreachable: boolean;
  legacy_real_quantity_engine_barrel_exported: boolean;
  legacy_real_quantity_engine_product_importers: string[];
  scanned_files_count: number;
  violations: string[];
  passed: boolean;
};

export type LegacyRealQuantityEngineReachabilityAudit = {
  legacy_real_quantity_engine_unreachable: boolean;
  legacy_real_quantity_engine_barrel_exported: boolean;
  legacy_real_quantity_engine_product_importers: string[];
  violations: string[];
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

const LEGACY_REAL_QUANTITY_ENGINE_PATH =
  "src/lib/ai/professionalEstimateCalculator/realMaterialQuantityEngine.ts";
const PROFESSIONAL_ESTIMATE_CALCULATOR_BARREL_PATH =
  "src/lib/ai/professionalEstimateCalculator/index.ts";
const LEGACY_REAL_QUANTITY_SYMBOL_PATTERN =
  /\b(?:parseRealMaterialQuantityIntent|createRealMaterialQuantityPreview|confirmRealMaterialQuantityEstimate|runRealQuantityStarterMatrix|buildRealMaterialQuantityEngineSummary|GREEN_PROFESSIONAL_AI_ESTIMATE_REAL_MATERIAL_QUANTITY_ENGINE|GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS)\b/u;

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
    legacy_real_quantity_engine_unreachable: true,
    legacy_real_quantity_engine_barrel_exported: false,
    legacy_real_quantity_engine_product_importers: [],
    scanned_files_count: files.length,
    violations,
    passed: violations.length === 0,
  };
}

export function scanLegacyRealQuantityEngineReachability(
  files: readonly EstimateEngineSourceFile[],
): LegacyRealQuantityEngineReachabilityAudit {
  const normalizedFiles = files.map((file) => ({
    filePath: normalizePath(file.filePath),
    source: file.source,
  }));
  const barrelExported = normalizedFiles.some((file) =>
    file.filePath.endsWith(PROFESSIONAL_ESTIMATE_CALCULATOR_BARREL_PATH) &&
    /export\s+(?:\*|\{[^}]*\})\s+from\s+["']\.\/realMaterialQuantityEngine["']/u.test(file.source)
  );
  const productImporters = normalizedFiles
    .filter((file) => !file.filePath.endsWith(LEGACY_REAL_QUANTITY_ENGINE_PATH))
    .filter((file) => !(barrelExported && file.filePath.endsWith(PROFESSIONAL_ESTIMATE_CALCULATOR_BARREL_PATH)))
    .filter((file) =>
      /["'][^"']*realMaterialQuantityEngine["']/u.test(file.source) ||
      LEGACY_REAL_QUANTITY_SYMBOL_PATTERN.test(file.source)
    )
    .map((file) => file.filePath)
    .sort();
  const violations = [
    barrelExported
      ? `${PROFESSIONAL_ESTIMATE_CALCULATOR_BARREL_PATH}:legacy_real_quantity_engine_barrel_export`
      : "",
    ...productImporters.map((filePath) => `${filePath}:legacy_real_quantity_engine_product_reachable`),
  ].filter(Boolean);

  return {
    legacy_real_quantity_engine_unreachable: violations.length === 0,
    legacy_real_quantity_engine_barrel_exported: barrelExported,
    legacy_real_quantity_engine_product_importers: productImporters,
    violations,
  };
}

export function auditNoSecondEstimateEngine(roots: readonly string[] = DEFAULT_SCAN_ROOTS) {
  const baseAudit = scanNoSecondEstimateEngine(loadEstimateEngineSourceFiles(roots));
  const legacyReachability = scanLegacyRealQuantityEngineReachability(
    loadEstimateEngineSourceFiles(["app", "src", "supabase"]),
  );
  const violations = [...baseAudit.violations, ...legacyReachability.violations];
  const audit: NoSecondEstimateEngineAudit = {
    ...baseAudit,
    no_second_estimate_engine_passed:
      baseAudit.no_second_estimate_engine_passed && legacyReachability.legacy_real_quantity_engine_unreachable,
    second_estimate_engine_detected:
      baseAudit.second_estimate_engine_detected || !legacyReachability.legacy_real_quantity_engine_unreachable,
    ...legacyReachability,
    violations,
    passed: violations.length === 0,
  };
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
