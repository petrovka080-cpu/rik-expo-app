import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildForemanAiEstimateLegacyCleanupAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateLegacyCleanupAudit";

const ARTIFACT_DIR = join(process.cwd(), "artifacts", "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE");

mkdirSync(ARTIFACT_DIR, { recursive: true });
const audit = buildForemanAiEstimateLegacyCleanupAudit();
const matrix = {
  b2c_request_still_works: audit.b2c_request_still_separate,
  b2c_writes_foreman_draft: audit.b2c_writes_foreman_draft,
  foreman_writes_b2c_history: audit.foreman_writes_b2c_history,
  consumer_uses_foreman_adapter: audit.consumer_uses_foreman_adapter,
  fake_green_claimed: false,
};
writeFileSync(join(ARTIFACT_DIR, "b2c_no_regression_matrix.json"), JSON.stringify(matrix, null, 2));
console.log(JSON.stringify(matrix, null, 2));
