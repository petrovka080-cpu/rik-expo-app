import { runReal10000OutputQualitySampleAudit } from "./real10000EstimateAuditCore";

if (require.main === module) {
  const result = runReal10000OutputQualitySampleAudit();
  console.info(JSON.stringify({ phase: result.phase, passed: result.passed, holes: result.holes.length }, null, 2));
  if (!result.passed) process.exit(1);
}
