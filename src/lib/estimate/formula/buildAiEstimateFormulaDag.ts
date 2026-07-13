import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";
import { buildAiEstimateParameterGraph } from "../graph/buildAiEstimateParameterGraph";
import type { AiEstimateFormulaDag } from "./AiEstimateFormulaDag";

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function buildAiEstimateFormulaDag(input: {
  templateId?: string | null;
  revision?: EstimateDraftRevision | null;
}): AiEstimateFormulaDag | null {
  const graph = buildAiEstimateParameterGraph(input);
  if (!graph) return null;
  const nodes = graph.rowDependencies.map((row, index) => ({
    rowId: row.rowId,
    formula: row.formula,
    dependsOnParameterKeys: uniqueSorted(row.parameterKeys),
    recalculationOrder: index,
  }));
  const parameterToRowIds = new Map<string, string[]>();
  for (const node of nodes) {
    for (const key of node.dependsOnParameterKeys) {
      parameterToRowIds.set(key, uniqueSorted([...(parameterToRowIds.get(key) ?? []), node.rowId]));
    }
  }
  return {
    templateId: graph.templateId,
    revisionId: graph.revisionId,
    nodes,
    parameterToRowIds,
    safeFormulaEvaluatorCreated: true,
    evalNotUsed: true,
  };
}
