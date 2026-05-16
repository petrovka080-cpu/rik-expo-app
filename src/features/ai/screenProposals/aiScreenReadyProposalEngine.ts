import { resolveAiScreenIdForAssistantContext } from "../context/aiScreenContext";
import type { AssistantContext } from "../assistant.types";
import { listAiScreenReadyProposalRegistry } from "./aiScreenReadyProposalRegistry";
import { enforceAiReadyProposalPolicy } from "./aiScreenReadyProposalPolicy";
import type { AiReadyProposal } from "./aiScreenReadyProposalTypes";

export type AiScreenReadyProposalEngineRequest = {
  screenId?: string;
  context?: AssistantContext;
  limit?: number;
};

const SCREEN_ALIASES: Record<string, string[]> = {
  "accountant.main": ["accountant.payment"],
  "reports.modal": ["documents.main"],
  "office.hub": ["documents.main"],
  "chat.main": ["documents.main"],
  "documents.surface": ["documents.main"],
};

export function getAiScreenReadyProposals(
  request: AiScreenReadyProposalEngineRequest,
): AiReadyProposal[] {
  const screenId = request.screenId
    || (request.context ? resolveAiScreenIdForAssistantContext(request.context) : "chat.main");
  const candidateIds = [screenId, ...(SCREEN_ALIASES[screenId] ?? [])];
  const limit = Math.max(1, Math.min(Number(request.limit ?? 5), 8));
  return listAiScreenReadyProposalRegistry()
    .filter((proposal) => candidateIds.includes(proposal.screenId))
    .map(enforceAiReadyProposalPolicy)
    .slice(0, limit);
}
