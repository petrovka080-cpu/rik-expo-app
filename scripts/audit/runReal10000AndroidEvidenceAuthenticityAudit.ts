import { runReal10000AndroidEvidenceAuthenticityAudit } from "./real10000P1EvidenceRefreshCore";

const result = runReal10000AndroidEvidenceAuthenticityAudit();
console.info(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
