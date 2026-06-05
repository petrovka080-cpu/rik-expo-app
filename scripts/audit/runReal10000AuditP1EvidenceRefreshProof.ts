import { runReal10000AuditP1EvidenceRefreshProof } from "./real10000P1EvidenceRefreshCore";

if (require.main === module) {
  const result = runReal10000AuditP1EvidenceRefreshProof();
  console.info(JSON.stringify(result, null, 2));
  if (!result.passed) process.exit(1);
}

export { runReal10000AuditP1EvidenceRefreshProof };
