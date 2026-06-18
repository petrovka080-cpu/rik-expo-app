import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  FOREMAN_AI_ESTIMATE_ACCEPTANCE_SAMPLES,
  buildForemanAiEstimateSampleMapping,
} from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";
import {
  summarizeForemanAiEstimatePayloadParity,
  verifyForemanAiEstimatePayloadParity,
} from "../../src/lib/foremanAiEstimate/foremanAiEstimatePayloadParity";

const ARTIFACT_DIR = join(process.cwd(), "artifacts", "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE");

mkdirSync(ARTIFACT_DIR, { recursive: true });
const reports = FOREMAN_AI_ESTIMATE_ACCEPTANCE_SAMPLES.map((sample) =>
  verifyForemanAiEstimatePayloadParity(buildForemanAiEstimateSampleMapping(sample)),
);
const summary = summarizeForemanAiEstimatePayloadParity(reports);
writeFileSync(join(ARTIFACT_DIR, "payload_parity_matrix.json"), JSON.stringify({
  ...summary,
  reports,
}, null, 2));
console.log(JSON.stringify(summary, null, 2));
