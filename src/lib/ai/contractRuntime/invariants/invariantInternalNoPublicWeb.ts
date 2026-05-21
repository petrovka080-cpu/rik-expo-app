import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantInternalNoPublicWeb(trace: AiContractTrace) {
  const publicWebUsed = trace.sources.externalSources.some((source) => source.origin === "public_web");
  const passed = !trace.sourcePlanning.appDataRequired || !publicWebUsed;
  return createAiInvariantCheck(
    "NO_PUBLIC_WEB_FOR_INTERNAL_QUESTIONS",
    passed,
    passed ? undefined : "Internal app-data question used public web.",
  );
}
