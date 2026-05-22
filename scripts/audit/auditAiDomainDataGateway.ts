import { writeAiDomainGatewayContextBudgetArtifacts } from "../e2e/aiDomainGatewayContextBudget.shared";

async function main() {
  const report = await writeAiDomainGatewayContextBudgetArtifacts();

  console.log(JSON.stringify({
    wave: "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_CLOSEOUT",
    slice: "provider_matrix",
    artifact: "artifacts/S_AI_DOMAIN_GATEWAY_provider_matrix.json",
    role_providers_registered: report.providerMatrix.role_providers_registered,
    role_allowlists_complete: report.providerMatrix.role_allowlists_complete,
    consumer_office_context_found: report.matrix.consumer_office_context_found,
    accountant_foreman_context_mix_found: report.matrix.accountant_foreman_context_mix_found,
  }, null, 2));
}

void main();
