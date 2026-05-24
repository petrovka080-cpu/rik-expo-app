import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi, type BuiltInAiScreenContext } from "../../src/lib/ai/builtInAi";
import {
  BUILT_IN_AI_50000_PHASE2_WAVE,
  getBuiltInAi50000FullShardCases,
  validateBuiltInAi50000RuntimeResult,
} from "../../src/lib/ai/builtInAi50000";
import type {
  BuiltInAi50000Case,
  BuiltInAi50000Phase2ShardCaseResult,
  BuiltInAi50000Phase2ShardMatrix,
} from "../../src/lib/ai/builtInAi50000";

const ARTIFACT_ROOT = path.resolve(process.cwd(), "artifacts", "S_BUILT_IN_AI_50000_PHASE2_shards");

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
    totalShards: Number(values.get("totalShards") ?? 50),
  };
}

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function shardDir(shardId: number): string {
  return path.join(ARTIFACT_ROOT, `shard_${String(shardId).padStart(2, "0")}`);
}

function routeFor(testCase: BuiltInAi50000Case): { route: string; screenContext: BuiltInAiScreenContext; role: string } {
  if (testCase.intent === "product_search") return { route: "/product/search", screenContext: "marketplace", role: "buyer" };
  if (testCase.routeCoverage.includes("ai_foreman")) return { route: "/ai?context=foreman", screenContext: "foreman", role: "foreman" };
  if (testCase.routeCoverage.includes("request")) return { route: "/request", screenContext: "request", role: "consumer" };
  return { route: "/chat", screenContext: "chat", role: "unknown" };
}

function traceCase(testCase: BuiltInAi50000Case): BuiltInAi50000Phase2ShardCaseResult {
  const route = routeFor(testCase);
  const answer = answerBuiltInAi({
    text: testCase.promptRu,
    route: route.route,
    screenContext: route.screenContext,
    role: route.role,
    userId: "built-in-ai-50000-phase2-proof-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const result = validateBuiltInAi50000RuntimeResult(testCase, answer);
  return {
    id: testCase.id,
    shardId: testCase.shardId,
    domainId: testCase.domainId,
    macroDomainId: testCase.macroDomainId,
    intent: testCase.intent,
    expectedTool: testCase.expectedTool,
    selectedTool: result.selectedTool,
    passed: result.passed,
    failureCodes: result.failureCodes,
  };
}

export function buildBuiltInAi50000Phase2ShardProofArtifacts(shardId: number, totalShards: number) {
  const cases = getBuiltInAi50000FullShardCases(shardId, totalShards);
  const results = cases.map(traceCase);
  const failures = results.filter((trace) => !trace.passed);
  const estimateResults = results.filter((trace) => trace.intent === "estimate");
  const productResults = results.filter((trace) => trace.intent === "product_search");
  const matrix: BuiltInAi50000Phase2ShardMatrix = {
    wave: BUILT_IN_AI_50000_PHASE2_WAVE,
    final_status: failures.length === 0 ? "GREEN_BUILT_IN_AI_50000_PHASE2_SHARD_READY" : "BLOCKED_SHARD_FAILED",
    shard_id: shardId,
    total_shards: totalShards,
    cases_total: cases.length,
    cases_passed: results.filter((trace) => trace.passed).length,
    cases_failed: failures.length,
    estimate_cases_total: estimateResults.length,
    product_cases_total: productResults.length,
    domain_ids: [...new Set(cases.map((testCase) => testCase.domainId))],
    macro_domain_ids: [...new Set(cases.map((testCase) => testCase.macroDomainId))],
    prompt_sent_through_built_in_ai_ingress: results.every((trace) => trace.selectedTool != null),
    correct_intent_all_cases: results.every((trace) => trace.failureCodes.every((code) => !code.includes("INTENT_MISMATCH"))),
    correct_expected_tool_all_cases: results.every((trace) => trace.selectedTool === trace.expectedTool),
    calculate_global_estimate_called_for_estimates: estimateResults.every((trace) => trace.selectedTool === "calculate_global_estimate"),
    global_estimate_result_used_all_estimate_cases: estimateResults.every((trace) => !trace.failureCodes.includes("GLOBAL_ESTIMATE_RESULT_MISSING")),
    source_evidence_present_all_priced_rows: estimateResults.every((trace) => !trace.failureCodes.includes("SOURCE_EVIDENCE_MISSING")),
    tax_status_or_warning_present_all_estimate_cases: estimateResults.every((trace) => !trace.failureCodes.includes("TAX_STATUS_MISSING")),
    pdf_action_present_all_estimate_cases: estimateResults.every((trace) => !trace.failureCodes.includes("PDF_ACTION_MISSING")),
    product_search_cases_have_no_fake_stock_supplier_availability: productResults.every((trace) =>
      !trace.failureCodes.includes("FAKE_STOCK_FOUND") &&
      !trace.failureCodes.includes("FAKE_AVAILABILITY_FOUND") &&
      !trace.failureCodes.includes("PRODUCT_SOURCE_EVIDENCE_MISSING")),
    dangerous_work_has_no_diy_instructions: results.every((trace) => !trace.failureCodes.includes("DANGEROUS_DIY_INSTRUCTIONS_FOUND")),
    forbidden_fallback_rows_found: results.some((trace) => trace.failureCodes.includes("FORBIDDEN_FALLBACK_ROW_FOUND")),
    single_shard_green_claimed: false,
    fake_green_claimed: false,
  };
  return { cases, results, failures, matrix };
}

export function writeBuiltInAi50000Phase2ShardProofArtifacts(shardId: number, totalShards: number) {
  const artifacts = buildBuiltInAi50000Phase2ShardProofArtifacts(shardId, totalShards);
  const dir = shardDir(shardId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "matrix.json"), `${JSON.stringify(artifacts.matrix, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "failures.json"), `${JSON.stringify(artifacts.failures, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(dir, "cases.json"), `${JSON.stringify(artifacts.results)}\n`, "utf8");
  return {
    ...artifacts,
    matrixPath: rel(path.join(dir, "matrix.json")),
    failuresPath: rel(path.join(dir, "failures.json")),
    casesPath: rel(path.join(dir, "cases.json")),
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const artifacts = writeBuiltInAi50000Phase2ShardProofArtifacts(args.shard, args.totalShards);
  console.log(artifacts.matrix.final_status);
  if (artifacts.failures.length > 0) {
    console.error(JSON.stringify(artifacts.failures.slice(0, 5), null, 2));
    process.exitCode = 1;
  }
}
