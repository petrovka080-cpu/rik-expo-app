import {
  estimateFiles,
  matchingFiles,
  read,
  stableArchitectureChecks,
} from "./aiEstimateArchitectureAuditUtils";

export const GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES =
  "GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES" as const;
export const STOP_AI_ESTIMATE_NO_DUPLICATE_ENGINES_FAILED =
  "STOP_AI_ESTIMATE_NO_DUPLICATE_ENGINES_FAILED" as const;

const DUPLICATE_ENGINE_MARKERS = /SecondEstimateEngine|OldEstimateEngine|LegacyEstimateEngine|new EstimateEngine|fallbackEstimateEngine|routeLocalEstimateEngine/i;
const DUPLICATE_BUILDER_MARKERS = /duplicatePdfBuilder|duplicateBuyerPackageBuilder|routeLocalRevisionBuilder|screenLocalFormulaEvaluator/i;

export function auditAiEstimateDuplicateEngines() {
  const files = estimateFiles();
  const duplicateEngineFiles = matchingFiles(files, DUPLICATE_ENGINE_MARKERS);
  const duplicateBuilderFiles = matchingFiles(files, DUPLICATE_BUILDER_MARKERS);
  const parserDefinitions = files
    .map((file) => ({ file, text: read(file) }))
    .filter((item) => /export function parse[A-Z].*Estimate|export function parseUserParamPatch/.test(item.text))
    .map((item) => item.file);
  const duplicateParserCount = parserDefinitions.filter((file) => !file.endsWith("parseUserParamPatch.ts")).length > 0 ? 1 : 0;
  const duplicateCount = duplicateEngineFiles.length + duplicateBuilderFiles.length + duplicateParserCount;
  const checks = {
    duplicate_engine_audit_created: true,
    duplicate_estimate_engines_count: duplicateCount === 0,
    duplicate_parameter_parsers_count: duplicateParserCount === 0,
    duplicate_pdf_builders_count: duplicateBuilderFiles.length === 0,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blockingReasons.length === 0
      ? GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES
      : STOP_AI_ESTIMATE_NO_DUPLICATE_ENGINES_FAILED,
    ...checks,
    duplicate_estimate_engines_count: duplicateCount,
    duplicate_parameter_parsers_count: duplicateParserCount,
    duplicate_pdf_builders_count: duplicateBuilderFiles.length,
    violation_files: [...duplicateEngineFiles, ...duplicateBuilderFiles],
    ...stableArchitectureChecks(blockingReasons),
  };
}

if (require.main === module) {
  const result = auditAiEstimateDuplicateEngines();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== GREEN_AI_ESTIMATE_NO_DUPLICATE_ENGINES) process.exitCode = 1;
}
