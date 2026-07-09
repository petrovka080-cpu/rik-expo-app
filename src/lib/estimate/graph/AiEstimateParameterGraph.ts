import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";

export type AiEstimateParameterGraphNodeKind =
  | "input"
  | "manual_override"
  | "derived"
  | "catalog_default"
  | "missing"
  | "formula_variable";

export type AiEstimateParameterGraphNode = {
  key: string;
  kind: AiEstimateParameterGraphNodeKind;
  required: boolean;
  formulaRefs: string[];
  affectedBoqRowIds: string[];
  pdfDependency: true;
  buyerPackageDependency: true;
  historyRevisionDependency: true;
};

export type AiEstimateParameterGraphRowDependency = {
  rowId: string;
  formula: string | null;
  parameterKeys: string[];
};

export type AiEstimateParameterGraph = {
  templateId: string;
  revisionId: string | null;
  nodes: AiEstimateParameterGraphNode[];
  rowDependencies: AiEstimateParameterGraphRowDependency[];
  exactIdentifierDependencyMatching: true;
  substringDependencyMatchingAbsent: true;
  sourceRevision?: EstimateDraftRevision;
};
