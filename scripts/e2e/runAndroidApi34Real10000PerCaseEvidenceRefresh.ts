import { runAndroidApi34Real10000PerCaseEvidenceRefresh } from "../audit/real10000P1EvidenceRefreshCore";

const result = runAndroidApi34Real10000PerCaseEvidenceRefresh();
console.info(JSON.stringify(result, null, 2));
if (!result.passed) process.exit(1);
