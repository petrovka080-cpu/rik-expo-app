import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantDeepLinksRequired(trace: AiContractTrace) {
  const passed = !trace.sourcePlanning.appDataRequired || trace.sources.openLinkCount > 0;
  return createAiInvariantCheck(
    "DEEPLINKS_FOR_INTERNAL_OBJECTS",
    passed,
    passed ? undefined : "Internal objects are missing openLinks/deepLinks.",
  );
}
