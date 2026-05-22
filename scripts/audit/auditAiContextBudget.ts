import { writeAiDomainGatewayContextBudgetArtifacts } from "../e2e/aiDomainGatewayContextBudget.shared";

async function main() {
  const report = await writeAiDomainGatewayContextBudgetArtifacts();

  console.log(JSON.stringify({
    wave: "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_CLOSEOUT",
    slice: "context_budget",
    artifact: "artifacts/S_AI_DOMAIN_GATEWAY_context_budget.json",
    context_budget_enforced: report.contextBudget.context_budget_enforced,
    ai_context_p95_lte_1000ms: report.contextBudget.ai_context_p95_lte_1000ms,
    p95_ms: report.contextBudget.p95_ms,
  }, null, 2));
}

void main();
