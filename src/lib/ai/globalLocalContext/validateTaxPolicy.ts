import type { LocalTaxPolicy } from "./taxPolicyTypes";

export function validateTaxPolicy(policy: LocalTaxPolicy): { valid: boolean; failures: string[] } {
  const failures: string[] = [];
  if (policy.status === "TAX_INCLUDED_WITH_SOURCE" && (!policy.sourceId || !policy.sourceDate)) {
    failures.push("TAX_SOURCE_AND_DATE_REQUIRED");
  }
  if (policy.status !== "TAX_INCLUDED_WITH_SOURCE" && !policy.warning) {
    failures.push("TAX_WARNING_REQUIRED");
  }
  return { valid: failures.length === 0, failures };
}
