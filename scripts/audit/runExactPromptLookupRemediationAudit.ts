import { runExactPromptLookupRemediationAudit } from "./real10000AuditP0RemediationCore";

const result = runExactPromptLookupRemediationAudit();
console.info(JSON.stringify(result, null, 2));
if (result.passed !== true) process.exit(1);
