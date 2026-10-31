/** Explicit Node/server adapter for existing synchronous fixtures and tools.
 * The client never imports this file and has no parser/runtime fallback. */
import {buildCanonicalBaselinePlan as buildClientPlan,buildCanonicalBaselineInputs as buildClientInputs}
  from "../../../features/consumerRepair/consumerCanonicalBaselineCompile";
import {deriveCanonicalCatalogPromptExtractionV1} from "./canonicalConcretePlacementPromptServerR1";
export function buildCanonicalBaselinePlan(input:Omit<Parameters<typeof buildClientPlan>[0],"promptExtraction">){
  return buildClientPlan({...input,promptExtraction:deriveCanonicalCatalogPromptExtractionV1(input.catalog,input.prompt)});
}
export function buildCanonicalBaselineInputs(input:Omit<Parameters<typeof buildClientInputs>[0],"promptExtraction">){
  return buildClientInputs({...input,promptExtraction:deriveCanonicalCatalogPromptExtractionV1(input.catalog,input.prompt)});
}
