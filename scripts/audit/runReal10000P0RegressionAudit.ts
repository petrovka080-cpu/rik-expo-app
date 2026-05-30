import { runReal10000P0RegressionAudit } from "./real10000EstimateAuditCore";

if (require.main === module) {
  const result = runReal10000P0RegressionAudit();
  console.info(JSON.stringify({ phase: result.phase, passed: result.passed, holes: result.holes.length }, null, 2));
  if (!result.passed) process.exit(1);
}
