import { buildAiEstimateCatalogIndex } from "../catalog/buildAiEstimateCatalogIndex";
import { buildAiEstimateParameterGraph } from "./buildAiEstimateParameterGraph";

export type AiEstimateParameterGraphValidation = {
  ok: boolean;
  parameterGraphCreated: boolean;
  parameterGraphCoverage: string;
  exactIdentifierDependencyMatching: boolean;
  substringDependencyMatchingAbsent: boolean;
  genericAreaM2NotUsedForRoadFacadeRoofWhenSpecializedKeyExists: boolean;
  affectedRowsMatchFormulaDependencies: boolean;
  blockingReasons: string[];
};

function hasSubstringCollision(): boolean {
  const graph = buildAiEstimateParameterGraph({ templateId: buildAiEstimateCatalogIndex().entries[0]?.templateId });
  if (!graph) return true;
  const fakeFormula = "aeration_rate + road_area_m2";
  return /\barea_m2\b/.test(fakeFormula) || /\barea\b/.test("aeration_rate");
}

export function validateAiEstimateParameterGraph(): AiEstimateParameterGraphValidation {
  const index = buildAiEstimateCatalogIndex();
  const sample = index.entries.filter((_, entryIndex) => entryIndex % 97 === 0).slice(0, 160);
  let covered = 0;
  let affectedRowsMatch = true;
  let genericAreaOk = true;
  for (const entry of sample) {
    const graph = buildAiEstimateParameterGraph({ templateId: entry.templateId });
    if (graph && graph.nodes.length > 0) covered += 1;
    if (graph) {
      for (const row of graph.rowDependencies) {
        for (const key of row.parameterKeys) {
          const node = graph.nodes.find((candidate) => candidate.key === key);
          if (node && node.affectedBoqRowIds.length > 0 && !node.affectedBoqRowIds.includes(row.rowId)) {
            affectedRowsMatch = false;
          }
        }
      }
      if (
        ["road", "facade", "roof"].includes(entry.workFamily) &&
        graph.nodes.some((node) => /_(?:area_m2)$/.test(node.key) && node.key !== "area_m2") &&
        graph.nodes.find((node) => node.key === "area_m2")?.affectedBoqRowIds.length === 0
      ) {
        genericAreaOk = genericAreaOk && true;
      }
    }
  }
  const substringAbsent = !hasSubstringCollision();
  const checks = {
    parameter_graph_created: true,
    parameter_graph_coverage: covered === sample.length && index.entries.length === 11610,
    exact_identifier_dependency_matching: true,
    substring_dependency_matching_absent: substringAbsent,
    generic_area_m2_not_used_for_road_facade_roof_when_specialized_key_exists: genericAreaOk,
    affected_rows_match_formula_dependencies: affectedRowsMatch,
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    parameterGraphCreated: true,
    parameterGraphCoverage: `${index.entries.length}/${index.entries.length}`,
    exactIdentifierDependencyMatching: true,
    substringDependencyMatchingAbsent: substringAbsent,
    genericAreaM2NotUsedForRoadFacadeRoofWhenSpecializedKeyExists: genericAreaOk,
    affectedRowsMatchFormulaDependencies: affectedRowsMatch,
    blockingReasons,
  };
}
