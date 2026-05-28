import type {
  GlobalEstimateSectionType,
  GlobalUnitInput,
} from "../globalEstimate";
import type {
  WorldConstructionDomain,
  WorldConstructionDomainDefinition,
  WorldConstructionMaterialSystem,
  WorldConstructionMethod,
  WorldConstructionObjectScope,
  WorldConstructionOperation,
  WorldConstructionPrimitive,
} from "../worldConstructionOntology";

export type ConstructionPrimitiveDomainNode = WorldConstructionDomainDefinition & {
  formulaCandidates: string[];
};

export type ConstructionPrimitiveObjectNode = {
  object: WorldConstructionObjectScope;
  domains: WorldConstructionDomain[];
  operations: WorldConstructionOperation[];
  defaultUnits: GlobalUnitInput["normalizedUnit"][];
};

export type ConstructionPrimitiveOperationNode = {
  operation: WorldConstructionOperation;
  domains: WorldConstructionDomain[];
  requiredBoqGroups: GlobalEstimateSectionType[];
};

export type ConstructionPrimitiveMethodNode = {
  method: WorldConstructionMethod;
  domains: WorldConstructionDomain[];
  unitPolicy: GlobalUnitInput["normalizedUnit"][];
  formulaPolicy: string[];
};

export type ConstructionPrimitiveMaterialSystemNode = WorldConstructionMaterialSystem & {
  domains: WorldConstructionDomain[];
};

export type ConstructionPrimitiveGraph = {
  domains: ConstructionPrimitiveDomainNode[];
  objects: ConstructionPrimitiveObjectNode[];
  operations: ConstructionPrimitiveOperationNode[];
  methods: ConstructionPrimitiveMethodNode[];
  materialSystems: ConstructionPrimitiveMaterialSystemNode[];
};

export type ConstructionPrimitiveGraphValidation = {
  passed: boolean;
  failures: string[];
  domainsTotal: number;
  domainsWithObjectsOperationsMethods: number;
};

export type ConstructionPrimitiveGraphRuntimeFrame = {
  semanticFrame: WorldConstructionPrimitive;
  primitiveGraphRequired: true;
  constructionWorkPlanRequired: true;
  parametricBoqRecipeCompilerRequired: true;
};
