import { hydrateAiScreenWorkflowContext } from "../screenWorkflows/aiScreenWorkflowHydrator";
import type {
  AiScreenMagicHydratedContext,
  AiScreenMagicHydrationRequest,
} from "./aiScreenMagicTypes";

export function hydrateAiScreenMagicContext(
  request: AiScreenMagicHydrationRequest,
): AiScreenMagicHydratedContext {
  const hydrated = hydrateAiScreenWorkflowContext(request);
  return {
    screenId: hydrated.workflowScreenId,
    evidenceLabels: [...hydrated.evidenceLabels],
    missingDataLabels: hydrated.hasRealHydratedEvidence
      ? []
      : ["hydrated screen data is missing; AI cannot invent business facts"],
    hasRealHydratedEvidence: hydrated.hasRealHydratedEvidence,
    scopedFactsSummary: hydrated.scopedFactsSummary ?? null,
  };
}
