import type { AiEstimateParameterGraph } from "./AiEstimateParameterGraph";

export type AiEstimateParameterDependencyExplanation = {
  parameterKey: string;
  affectedBoqRowIds: string[];
  formulaRefs: string[];
  pdfDependency: boolean;
  buyerPackageDependency: boolean;
  historyRevisionDependency: boolean;
};

export function explainAiEstimateParameterDependency(input: {
  graph: AiEstimateParameterGraph;
  parameterKey: string;
}): AiEstimateParameterDependencyExplanation | null {
  const node = input.graph.nodes.find((candidate) => candidate.key === input.parameterKey);
  if (!node) return null;
  return {
    parameterKey: node.key,
    affectedBoqRowIds: node.affectedBoqRowIds,
    formulaRefs: node.formulaRefs,
    pdfDependency: node.pdfDependency,
    buyerPackageDependency: node.buyerPackageDependency,
    historyRevisionDependency: node.historyRevisionDependency,
  };
}
