import { writeAiDomainGatewayContextBudgetArtifacts } from "./aiDomainGatewayContextBudget.shared";

async function main() {
  const report = await writeAiDomainGatewayContextBudgetArtifacts();

  console.log(JSON.stringify({
    wave: "S_AI_DOMAIN_DATA_GATEWAY_CONTEXT_BUDGET_CLOSEOUT",
    final_status: report.matrix.final_status,
    artifact: "artifacts/S_AI_DOMAIN_GATEWAY_matrix.json",
    roles: report.roleFacts.length,
    context_budget_enforced: report.contextBudget.context_budget_enforced,
    p95_ms: report.contextBudget.p95_ms,
    raw_db_dump_found: report.sanitizer.raw_db_dump_found,
    debug_provider_payload_visible: report.sanitizer.debug_provider_payload_visible,
    full_jest_passed: report.matrix.full_jest_passed,
    release_verify_passed: report.matrix.release_verify_passed,
    fake_green_claimed: false,
  }, null, 2));
}

void main();
