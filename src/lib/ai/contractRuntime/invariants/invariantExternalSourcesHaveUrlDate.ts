import type { AiContractTrace } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantExternalSourcesHaveUrlDate(trace: AiContractTrace) {
  const missingProvenance = trace.sources.externalSources.filter((source) =>
    source.origin === "public_web" && (!source.url || !source.checkedAt),
  );
  return createAiInvariantCheck(
    "EXTERNAL_SOURCES_HAVE_URL_AND_CHECKED_AT",
    missingProvenance.length === 0,
    missingProvenance.length === 0 ? undefined : "External public sources are missing URL or checkedAt.",
  );
}
