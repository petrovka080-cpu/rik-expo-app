import type { AiCommandCenterCardView } from "./AiCommandCenterTypes";

export const AI_COMMAND_CENTER_MAX_CARDS = 20;
export const AI_COMMAND_CENTER_DEFAULT_CARD_LIMIT = 20;

export const AI_COMMAND_CENTER_RUNTIME_BUDGET = Object.freeze({
  contractId: "ai_command_center_runtime_budget_v1",
  maxCards: AI_COMMAND_CENTER_MAX_CARDS,
  defaultCardLimit: AI_COMMAND_CENTER_DEFAULT_CARD_LIMIT,
  paginationRequired: true,
  maxVisibleSections: 7,
  mutationCount: 0,
  directMutationAllowed: false,
  duplicateCardsAllowed: false,
  emptyStateMustBeReal: true,
  fakeCardsAllowed: false,
} as const);

export type AiCommandCenterPageInput = {
  limit?: number;
  cursor?: string | null;
};

export type AiCommandCenterNormalizedPage = {
  limit: number;
  cursor: string | null;
};

export type AiCommandCenterRuntimeBudgetDecision = {
  allowed: boolean;
  limit: number;
  cursor: string | null;
  maxCards: typeof AI_COMMAND_CENTER_MAX_CARDS;
  paginationRequired: true;
  reason: string;
};

export function normalizeAiCommandCenterPage(
  page: AiCommandCenterPageInput | null | undefined,
): AiCommandCenterNormalizedPage {
  const rawLimit = Number(page?.limit ?? AI_COMMAND_CENTER_DEFAULT_CARD_LIMIT);
  const wholeLimit = Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : AI_COMMAND_CENTER_DEFAULT_CARD_LIMIT;
  const limit = Math.max(1, Math.min(AI_COMMAND_CENTER_MAX_CARDS, wholeLimit));
  const cursor = typeof page?.cursor === "string" && page.cursor.trim().length > 0 ? page.cursor.trim() : null;

  return { limit, cursor };
}

export function decideAiCommandCenterRuntimeBudget(
  page: AiCommandCenterPageInput | null | undefined,
): AiCommandCenterRuntimeBudgetDecision {
  const normalized = normalizeAiCommandCenterPage(page);
  return {
    allowed: normalized.limit <= AI_COMMAND_CENTER_MAX_CARDS,
    limit: normalized.limit,
    cursor: normalized.cursor,
    maxCards: AI_COMMAND_CENTER_MAX_CARDS,
    paginationRequired: true,
    reason: "Command Center task stream is bounded by card limit and cursor pagination.",
  };
}

export function enforceAiCommandCenterCardBudget(
  cards: readonly AiCommandCenterCardView[],
): AiCommandCenterCardView[] {
  const seen = new Set<string>();
  const deduped: AiCommandCenterCardView[] = [];

  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    deduped.push(card);
    if (deduped.length >= AI_COMMAND_CENTER_MAX_CARDS) break;
  }

  return deduped;
}
