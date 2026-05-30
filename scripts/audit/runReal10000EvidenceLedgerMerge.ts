import { runReal10000EvidenceLedgerMerge } from "./real10000P1EvidenceRefreshCore";

const result = runReal10000EvidenceLedgerMerge();
console.info(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
