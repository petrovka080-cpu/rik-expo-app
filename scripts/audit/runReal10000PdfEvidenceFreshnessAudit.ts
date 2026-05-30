import { runReal10000PdfEvidenceFreshnessAudit } from "./real10000P1EvidenceRefreshCore";

const result = runReal10000PdfEvidenceFreshnessAudit();
console.info(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
