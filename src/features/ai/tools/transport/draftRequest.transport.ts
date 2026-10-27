import type { AiToolTransportContract } from "./aiToolTransportTypes";

export const DRAFT_REQUEST_TRANSPORT_CONTRACT = Object.freeze({
  toolName: "draft_request",
  boundary: "draft_only_local_transport",
  routeScope: "ai.tool.draft_request",
  boundedRequest: true,
  dtoOnly: true,
  redactionRequired: true,
  uiImportAllowed: false,
  modelProviderImportAllowed: false,
  supabaseImportAllowedInTool: false,
  mutationAllowedFromTool: false,
  idempotencyRequired: false,
} as const satisfies AiToolTransportContract);

export function markDraftRequestTransportBoundary<T extends { mutation_count: 0 }>(output: T): T {
  return output;
}
