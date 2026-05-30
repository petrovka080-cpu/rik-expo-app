import { runReal10000WebEvidenceFreshnessAudit } from "./real10000P1EvidenceRefreshCore";

const result = runReal10000WebEvidenceFreshnessAudit();
console.info(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
