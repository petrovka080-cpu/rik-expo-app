import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantSourceRefsRequired(trace: AiContractTrace) {
  const internalFacts = trace.numericFacts.length > 0 || trace.sourcePlanning.appDataRequired;
  const numericFactsHaveRefs = trace.numericFacts.every((fact) => fact.sourceRefIds.length > 0);
  const passed = !internalFacts || (trace.sources.sourceRefIds.length > 0 && numericFactsHaveRefs);
  return createAiInvariantCheck(
    "SOURCE_REFS_FOR_INTERNAL_FACTS",
    passed,
    passed ? undefined : "Internal facts or numeric facts are missing sourceRefs.",
  );
}
