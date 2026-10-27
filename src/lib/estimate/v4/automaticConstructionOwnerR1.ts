import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult} from "../backendPlatform/canonicalEstimateCompileCore";
import {estimateDeterministicHash} from "../estimateDeterministicHash";
import type {AutomaticOwnerDefinition} from "./automaticConstructionDefinitionR1";
export {buildAutomaticConstructionOwnerR1, unresolvedApplicationNormTruthR1} from "./automaticConstructionDefinitionR1";
export type {AutomaticParameterKind, AutomaticInclusionCondition, AutomaticParameterSpec, AutomaticRowSpec, AutomaticOwnerDefinition} from "./automaticConstructionDefinitionR1";

export async function compileAutomaticConstructionOwnerR1(input: Readonly<{
  compilerVersion: string;
  catalogId: string;
  primaryMeasureParameterId: string;
  definition: AutomaticOwnerDefinition;
  submittedParameters: Record<string, unknown>;
  /** Server-owned source/readback facts; never copied from a consumer payload. */
  confirmedParameters?: Record<string, unknown>;
}>): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: input.compilerVersion,
    catalogId: input.catalogId,
    primaryMeasureParameterId: input.primaryMeasureParameterId,
    parameterDefinitions: [...input.definition.parameters],
    formulaDefinitions: [...input.definition.formulas],
    resourceDefinitions: [...input.definition.resources],
    submittedParameters: input.submittedParameters,
    confirmedParameters: { ...input.definition.runtimeInput, ...input.confirmedParameters },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: input.definition.resources.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
