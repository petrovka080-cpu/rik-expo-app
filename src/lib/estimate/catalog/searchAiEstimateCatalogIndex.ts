import type { AiEstimateCatalogIndex, AiEstimateCatalogSearchHit } from "./AiEstimateCatalogIndex";
import { buildAiEstimateCatalogIndex } from "./buildAiEstimateCatalogIndex";
import { normalizeAiEstimateCatalogSearchTokens } from "./normalizeAiEstimateCatalogSearchTokens";

export { normalizeAiEstimateCatalogSearchTokens };

function scoreEntry(input: {
  queryTokens: readonly string[];
  entryTokens: readonly string[];
  matchedTokens: readonly string[];
}): number {
  const matched = input.matchedTokens.length;
  const exactBoost = input.queryTokens.filter((token) => input.entryTokens.includes(token)).length * 3;
  const coverage = matched / Math.max(input.queryTokens.length, 1);
  return Math.round((matched * 10 + exactBoost + coverage * 10) * 1000) / 1000;
}

export function searchAiEstimateCatalogIndex(input: {
  query: string;
  topK?: number;
  index?: AiEstimateCatalogIndex;
}): AiEstimateCatalogSearchHit[] {
  const index = input.index ?? buildAiEstimateCatalogIndex();
  const topK = Math.max(1, Math.min(input.topK ?? 10, 50));
  const queryTokens = normalizeAiEstimateCatalogSearchTokens(input.query);
  if (queryTokens.length === 0) {
    return index.entries.slice(0, topK).map((entry) => ({ entry, score: 0, matchedTokens: [] }));
  }
  const candidateIds = new Set<string>();
  for (const token of queryTokens) {
    for (const templateId of index.tokenToTemplateIds.get(token) ?? []) candidateIds.add(templateId);
  }
  const hits: AiEstimateCatalogSearchHit[] = [];
  for (const templateId of candidateIds) {
    const entry = index.byTemplateId.get(templateId);
    if (!entry) continue;
    const matchedTokens = queryTokens.filter((token) => entry.normalizedSearchTokens.includes(token));
    if (matchedTokens.length === 0) continue;
    hits.push({
      entry,
      score: scoreEntry({ queryTokens, entryTokens: entry.normalizedSearchTokens, matchedTokens }),
      matchedTokens,
    });
  }
  return hits
    .sort((a, b) => b.score - a.score || a.entry.templateId.localeCompare(b.entry.templateId))
    .slice(0, topK);
}
