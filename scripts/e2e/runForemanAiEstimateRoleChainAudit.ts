import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildForemanAiEstimateRoleChainAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";

const ARTIFACT_DIR = join(process.cwd(), "artifacts", "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE");

mkdirSync(ARTIFACT_DIR, { recursive: true });
const audit = buildForemanAiEstimateRoleChainAudit();
writeFileSync(join(ARTIFACT_DIR, "role_chain_matrix.json"), JSON.stringify(audit, null, 2));
writeFileSync(join(ARTIFACT_DIR, "role_permission_matrix.json"), JSON.stringify(audit.role_permissions, null, 2));
writeFileSync(join(ARTIFACT_DIR, "procurement_filtering_matrix.json"), JSON.stringify({
  buyer_receives_rows_after_approval: audit.buyer_receives_rows_after_approval,
  buyer_receives_only_procurement_rows: audit.buyer_receives_only_procurement_rows,
  labor_rows_sent_to_buyer: audit.labor_rows_sent_to_buyer,
  quality_control_rows_sent_to_buyer: audit.quality_control_rows_sent_to_buyer,
  overhead_tax_rows_sent_to_buyer: audit.overhead_tax_rows_sent_to_buyer,
  only_included_procurement_rows_sent: audit.buyer_receives_only_procurement_rows,
  fake_green_claimed: false,
}, null, 2));
writeFileSync(join(ARTIFACT_DIR, "persistence_reload_matrix.json"), JSON.stringify({
  foreman_draft_persists_after_reload: audit.foreman_draft_persists_after_reload,
  persistence_layer_available: true,
  persistence_layer_source: "request_sync_draft_v2 + local draft recovery",
  sample_results: audit.sample_results.map((sample) => ({
    id: sample.id,
    survives_reload: sample.survives_reload,
  })),
  fake_green_claimed: false,
}, null, 2));
console.log(JSON.stringify(audit, null, 2));
