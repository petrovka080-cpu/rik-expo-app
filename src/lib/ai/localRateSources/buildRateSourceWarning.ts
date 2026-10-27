import type { LocalRateSourcePolicy } from "./localRateSourceTypes";

export function buildRateSourceWarning(policy: LocalRateSourcePolicy): string | null {
  if (policy.warning) return policy.warning;
  if (policy.sourceId) return null;
  return "Ставка не имеет source evidence; цену нужно скрыть или пометить warning.";
}
