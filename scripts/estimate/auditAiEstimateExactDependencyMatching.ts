import { validateAiEstimateParameterGraph } from "../../src/lib/estimate/graph/validateAiEstimateParameterGraph";

export const GREEN_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING =
  "GREEN_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING" as const;
export const STOP_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING_FAILED =
  "STOP_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING_FAILED" as const;

function exactIdentifierReference(text: string, key: string): boolean {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}($|[^a-zA-Z0-9_])`).test(text);
}

export function auditAiEstimateExactDependencyMatching() {
  const graph = validateAiEstimateParameterGraph();
  const checks = {
    exact_dependency_matching_audit_created: true,
    graph_exact_identifier_dependency_matching: graph.exactIdentifierDependencyMatching,
    graph_substring_dependency_matching_absent: graph.substringDependencyMatchingAbsent,
    area_m2_not_matched_inside_road_area_m2: !exactIdentifierReference("road_area_m2 * 1.05", "area_m2"),
    area_not_matched_inside_aeration: !exactIdentifierReference("aeration_rate + ventilation_area_m2", "area"),
    ceiling_word_not_ceiling_height_without_phrase: !exactIdentifierReference("ceiling panel", "ceiling_height_m"),
    kv_meters_not_voltage: !/\bvoltage_kv\b/.test("area_m2 from kv meters"),
    generic_area_not_used_for_specialized_area:
      graph.genericAreaM2NotUsedForRoadFacadeRoofWhenSpecializedKeyExists,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blockingReasons.length === 0
      ? GREEN_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING
      : STOP_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING_FAILED,
    ...checks,
    blockingReasons,
  };
}

if (require.main === module) {
  const result = auditAiEstimateExactDependencyMatching();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== GREEN_AI_ESTIMATE_EXACT_DEPENDENCY_MATCHING) process.exitCode = 1;
}
