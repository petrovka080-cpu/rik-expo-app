import fs from "node:fs";
import path from "node:path";

import { runReal10000AuditP1EvidenceRefreshProof } from "../../scripts/audit/real10000P1EvidenceRefreshCore";

export function runP1EvidenceRefreshForTest() {
  return runReal10000AuditP1EvidenceRefreshProof();
}

export function readAuditArtifact<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "artifacts", "S_REAL_10000_AUDIT", name), "utf8")) as T;
}
