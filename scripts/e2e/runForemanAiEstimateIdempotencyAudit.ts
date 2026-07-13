import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildForemanAiEstimateRoleChainAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";

const ARTIFACT_DIR = join(process.cwd(), "artifacts", "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE");

mkdirSync(ARTIFACT_DIR, { recursive: true });
const audit = buildForemanAiEstimateRoleChainAudit().idempotency;
writeFileSync(join(ARTIFACT_DIR, "idempotency_matrix.json"), JSON.stringify(audit, null, 2));
console.log(JSON.stringify(audit, null, 2));
