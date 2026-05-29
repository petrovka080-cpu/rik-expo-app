import { writeProductionCanaryRollbackAudit } from "../e2e/aiEstimateProductionCanaryCore";

const audit = writeProductionCanaryRollbackAudit();
if (!audit.rollback_ready) {
  throw new Error("NO_GO_ROLLBACK_MISSING");
}
