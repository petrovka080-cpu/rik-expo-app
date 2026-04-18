export type BuyerProposalNoPreloadPlan = {
  ids: string[];
  need: string[];
  waitIds: string[];
  toFetch: string[];
};

const normalizeProposalCacheIds = (values: readonly string[]): string[] =>
  Array.from(new Set((values || []).map(String).map((value) => value.trim()).filter(Boolean)));

export function planBuyerProposalNoPreload(params: {
  proposalIdsRaw: readonly string[];
  existingById: Record<string, string>;
  timestampById: Record<string, number>;
  inflightById: Record<string, unknown>;
  now: number;
  ttlMs: number;
}): BuyerProposalNoPreloadPlan {
  const ids = normalizeProposalCacheIds(params.proposalIdsRaw);
  const need = ids.filter((id) => {
    const have = params.existingById?.[id];
    const ts = params.timestampById?.[id] ?? 0;
    if (have && params.now - ts < params.ttlMs) return false;
    return true;
  });

  const waitIds: string[] = [];
  const toFetch: string[] = [];
  for (const id of need) {
    if (params.inflightById?.[id]) waitIds.push(id);
    else toFetch.push(id);
  }

  return {
    ids,
    need,
    waitIds,
    toFetch,
  };
}
