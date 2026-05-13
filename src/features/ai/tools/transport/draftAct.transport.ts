import type { AiToolTransportContract } from "./aiToolTransportTypes";

export const DRAFT_ACT_TRANSPORT_CONTRACT = Object.freeze({
  toolName: "draft_act",
  boundary: "draft_only_local_transport",
  routeScope: "ai.tool.draft_act",
  boundedRequest: true,
  dtoOnly: true,
  redactionRequired: true,
  uiImportAllowed: false,
  modelProviderImportAllowed: false,
  supabaseImportAllowedInTool: false,
  mutationAllowedFromTool: false,
  idempotencyRequired: false,
} as const satisfies AiToolTransportContract);

export function markDraftActTransportBoundary<T extends { mutation_count: 0 }>(output: T): T {
  return output;
}
