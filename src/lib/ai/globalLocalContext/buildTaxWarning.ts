import type { LocalTaxPolicy } from "./taxPolicyTypes";

export function buildTaxWarning(policy: LocalTaxPolicy): string | null {
  if (policy.warning) return policy.warning;
  if (policy.status === "TAX_INCLUDED_WITH_SOURCE" && policy.sourceId) return null;
  return "Налоговый статус требует источника или явного warning.";
}
