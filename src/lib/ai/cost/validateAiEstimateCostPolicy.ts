import { AI_ESTIMATE_COST_LIMITS, evaluateAiEstimateCostGuard } from "./aiEstimateCostGuard";

export function validateAiEstimateCostPolicy(): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const [key, value] of Object.entries(AI_ESTIMATE_COST_LIMITS)) {
    if (!Number.isFinite(value) || value <= 0) failures.push(`invalid_limit:${key}`);
  }

  const decisions = evaluateAiEstimateCostGuard(AI_ESTIMATE_COST_LIMITS);
  if (decisions.some((decision) => decision.action !== "allow")) {
    failures.push("limits_self_block_at_policy_boundary");
  }

  return { passed: failures.length === 0, failures };
}
