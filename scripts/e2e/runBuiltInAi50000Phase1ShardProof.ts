import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi, type BuiltInAiScreenContext } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_50000_PHASE1_GREEN_STATUS,
  BUILT_IN_AI_50000_PHASE1_WAVE,
  getBuiltInAi50000Phase1ShardCases,
  validateBuiltInAi50000RuntimeResult,
} from "../../src/lib/ai/builtInAi50000";
import type { BuiltInAi50000Phase1Case } from "../../src/lib/ai/builtInAi50000";

const ARTIFACT_ROOT = path.resolve(process.cwd(), "artifacts", "S_BUILT_IN_AI_50000_PHASE1_shards");

type Args = {
  shard: number;
  totalShards: number;
};

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  for (const token of argv) {
    const match = token.match(/^--([^=]+)=(.+)$/);
    if (match) values.set(match[1], match[2]);
  }
  return {
    shard: Number(values.get("shard") ?? 0),
    totalShards: Number(values.get("totalShards") ?? 5),
  };
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function shardDir(shardId: number): string {
  return path.join(ARTIFACT_ROOT, `shard_${String(shardId).padStart(2, "0")}`);
}

function routeFor(testCase: BuiltInAi50000Phase1Case): { route: string; screenContext: BuiltInAiScreenContext; role: string } {
  if (testCase.intent === "product_search") return { route: "/product/search", screenContext: "marketplace", role: "buyer" };
  if (testCase.routeCoverage.includes("ai_foreman")) return { route: "/ai?context=foreman", screenContext: "foreman", role: "foreman" };
  if (testCase.routeCoverage.includes("request")) return { route: "/request", screenContext: "request", role: "consumer" };
  return { route: "/chat", screenContext: "chat", role: "unknown" };
}

function traceCase(testCase: BuiltInAi50000Phase1Case) {
  const route = routeFor(testCase);
  const answer = answerBuiltInAi({
    text: testCase.promptRu,
    route: route.route,
    screenContext: route.screenContext,
    role: route.role,
    userId: "built-in-ai-50000-phase1-proof-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  return {
    ...validateBuiltInAi50000RuntimeResult(testCase, answer),
    prompt: testCase.promptRu,
    route: route.route,
    runtimeTrace: answer.runtimeTrace,
  };
}

export function buildBuiltInAi50000Phase1ShardProofArtifacts(shardId: number, totalShards: number) {
  const cases = getBuiltInAi50000Phase1ShardCases(shardId, totalShards);
  const transcripts = cases.map(traceCase);
  const failures = transcripts.filter((trace) => !trace.passed);
  const estimateTraces = transcripts.filter((trace) => trace.intent === "estimate");
  const productTraces = transcripts.filter((trace) => trace.intent === "product_search");
  const matrix = {
    wave: BUILT_IN_AI_50000_PHASE1_WAVE,
    final_status: failures.length === 0 ? "GREEN_BUILT_IN_AI_50000_PHASE1_SHARD_READY" : "BLOCKED_PHASE1_SHARD_FAILED",
    shard_id: shardId,
    total_shards: totalShards,
    cases_total: cases.length,
    cases_passed: transcripts.filter((trace) => trace.passed).length,
    cases_failed: failures.length,
    estimate_cases_total: estimateTraces.length,
    product_cases_total: productTraces.length,
    macro_domain_ids: [...new Set(cases.map((testCase) => testCase.macroDomainId))],
    prompt_sent_through_built_in_ai_ingress: transcripts.every((trace) => trace.runtimeTraceCaptured),
    correct_intent_all_cases: transcripts.every((trace) => trace.intent === "product_search"
      ? ["product_search", "marketplace_lookup", "procurement"].includes(String(trace.detectedIntent))
      : trace.detectedIntent === "estimate"),
    correct_expected_tool_all_cases: transcripts.every((trace) => trace.selectedTool === trace.expectedTool),
    work_key_or_category_resolved_all_estimate_cases: estimateTraces.every((trace) => trace.workKeyOrCategoryMatched),
    calculate_global_estimate_called_for_estimates: estimateTraces.every((trace) => trace.selectedTool === "calculate_global_estimate"),
    global_estimate_result_used_all_estimate_cases: estimateTraces.every((trace) => trace.globalEstimateResultUsed),
    materials_section_present_all_estimate_cases: estimateTraces.every((trace) => trace.materialsSectionPresent),
    labor_or_equipment_section_present_all_estimate_cases: estimateTraces.every((trace) => trace.laborOrEquipmentSectionPresent),
    quantities_present_all_estimate_cases: estimateTraces.every((trace) => trace.quantitiesPresent),
    totals_present_all_estimate_cases: estimateTraces.every((trace) => trace.totalsPresent),
    tax_status_or_warning_present_all_estimate_cases: estimateTraces.every((trace) => trace.taxStatusOrWarningPresent),
    source_evidence_present_all_priced_rows: estimateTraces.every((trace) => trace.sourceEvidencePresentAllPricedRows),
    cost_factors_present_all_estimate_cases: estimateTraces.every((trace) => trace.costFactorsPresent),
    clarifying_questions_present_all_estimate_cases: estimateTraces.every((trace) => trace.clarifyingQuestionsPresent),
    pdf_action_present_all_estimate_cases: estimateTraces.every((trace) => trace.pdfActionPresent),
    product_search_cases_have_no_fake_stock_supplier_availability: productTraces.every((trace) =>
      !trace.fakeStockFound && !trace.fakeSupplierFound && !trace.fakeAvailabilityFound && trace.productSourceEvidencePresent),
    dangerous_work_has_no_diy_instructions: transcripts.every((trace) => !trace.dangerousDiyInstructionsFound),
    forbidden_fallback_rows_found: transcripts.some((trace) => trace.forbiddenFallbackRowsFound),
    full_50k_green_claimed: false,
    phase1_only_status: BUILT_IN_AI_50000_PHASE1_GREEN_STATUS,
    fake_green_claimed: false,
  };
  return { cases, transcripts, failures, matrix };
}

export function writeBuiltInAi50000Phase1ShardProofArtifacts(shardId: number, totalShards: number) {
  const artifacts = buildBuiltInAi50000Phase1ShardProofArtifacts(shardId, totalShards);
  const dir = shardDir(shardId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "matrix.json"), `${JSON.stringify(artifacts.matrix, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "failures.json"), `${JSON.stringify(artifacts.failures, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "transcripts.json"), `${JSON.stringify(artifacts.transcripts, null, 2)}\n`, "utf8");
  return {
    ...artifacts,
    matrixPath: rel(path.join(dir, "matrix.json")),
    failuresPath: rel(path.join(dir, "failures.json")),
    transcriptsPath: rel(path.join(dir, "transcripts.json")),
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const artifacts = writeBuiltInAi50000Phase1ShardProofArtifacts(args.shard, args.totalShards);
  console.log(artifacts.matrix.final_status);
  if (artifacts.failures.length > 0) {
    console.error(JSON.stringify(artifacts.failures.slice(0, 5), null, 2));
    process.exitCode = 1;
  }
}
