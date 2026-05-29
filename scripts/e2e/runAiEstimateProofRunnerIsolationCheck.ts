import fs from "node:fs";
import path from "node:path";

import { assertProofRunnerIsolation } from "../../src/lib/ai/cost";

const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_AI_ESTIMATE_PERFORMANCE");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runAiEstimateProofRunnerIsolationCheck() {
  const report = assertProofRunnerIsolation({
    fixtureMode: true,
    stagingDataApproved: false,
    productionSupabaseWrite: false,
    productionSourceRefresh: false,
    productionCatalogMutation: false,
    productionPdfStorageUpload: false,
    liveSupplierStockCalls: false,
    userSessionMutation: false,
  });
  writeJson("proof_runner_isolation.json", report);
  if (!report.proof_runner_isolation_ready) {
    throw new Error(`PROOF_RUNNER_ISOLATION_FAILED:${report.failures.join(";")}`);
  }
  return report;
}

if (require.main === module) {
  runAiEstimateProofRunnerIsolationCheck();
}
