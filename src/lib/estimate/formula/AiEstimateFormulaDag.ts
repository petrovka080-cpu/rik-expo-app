export type AiEstimateFormulaDagNode = {
  rowId: string;
  formula: string | null;
  dependsOnParameterKeys: string[];
  recalculationOrder: number;
};

export type AiEstimateFormulaDag = {
  templateId: string;
  revisionId: string | null;
  nodes: AiEstimateFormulaDagNode[];
  parameterToRowIds: Map<string, string[]>;
  safeFormulaEvaluatorCreated: true;
  evalNotUsed: true;
};

export type AiEstimateFormulaDagEvaluation = {
  rowId: string;
  beforeQuantity: number;
  afterQuantity: number;
  changed: boolean;
  dependencyKeys: string[];
};

export type AiEstimateIncrementalFormulaResult = {
  affectedRows: AiEstimateFormulaDagEvaluation[];
  unaffectedRowIds: string[];
};
