export type ReferenceParameterV4 = {
  parameterId: string;
  labelRu: string;
  quantityType: "length" | "area" | "volume" | "mass" | "count" | "ratio" | "density" | "productivity";
  unit: string;
  requiredLevel: "P0" | "P1" | "P2";
  minimum: number;
  maximum: number;
  defaultValue: number | null;
  defaultSource: string | null;
  formulaConsumers: readonly string[];
  validationRules: readonly string[];
};

export type ReferenceFormulaNodeV4 = {
  formulaNodeId: string;
  operation: "IDENTITY" | "MULTIPLY" | "DIVIDE" | "CEIL_DIVIDE" | "ADD";
  inputs: readonly string[];
  output: string;
  outputUnit: string;
  coefficient: number;
  coefficientSource: "ENGINEERING_FORMULA" | "USER_INPUT";
  applicability: string;
  roundingPolicy: "NONE" | "CEIL_INTEGER" | "ROUND_6";
};

export type ReferenceBoqRowV4 = {
  rowDefinitionId: string;
  semanticOwner: string;
  category: "preparation" | "materials" | "labor" | "equipment" | "transport" | "disposal" | "services" | "quality_control" | "documentation";
  professionalNameRu: string;
  unit: string;
  formulaNodeId: string;
  sourceId: string;
  sourceClaimId?: string;
  semanticKey?: string;
  inclusionReason: string;
  priceState: "PRICE_REQUIRED";
};
