import { hydrateAiScreenNativeAssistantContext } from "../screenNative/aiScreenNativeAssistantHydrator";
import { resolveDefaultAiScreenWorkflowScreenId } from "./aiScreenWorkflowRegistry";
import type { AiScreenWorkflowHydrationRequest } from "./aiScreenWorkflowTypes";

export type AiScreenWorkflowHydratedContext = ReturnType<typeof hydrateAiScreenNativeAssistantContext> & {
  workflowScreenId: string;
  hasRealHydratedEvidence: boolean;
};

export function hydrateAiScreenWorkflowContext(
  request: AiScreenWorkflowHydrationRequest,
): AiScreenWorkflowHydratedContext {
  const native = hydrateAiScreenNativeAssistantContext({
    ...request,
    screenId: request.screenId || resolveDefaultAiScreenWorkflowScreenId(request.context),
  });
  const workflowScreenId = native.screenId === "agent.documents.knowledge" ? "documents.main" : native.screenId;
  const hasRealHydratedEvidence = native.evidenceLabels.length > 0 || Boolean(native.scopedFactsSummary);

  return {
    ...native,
    workflowScreenId,
    hasRealHydratedEvidence,
  };
}
