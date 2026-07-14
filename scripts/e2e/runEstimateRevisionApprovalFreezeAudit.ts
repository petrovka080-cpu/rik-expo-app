import {
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";
import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";

const scenario = buildEstimateRevisionAuditScenario();
const approved = getCurrentEstimateRevision(scenario.approved);
const freeze = scenario.approved.approval_freezes[0];

assertAuditPass(Boolean(freeze), "approval freeze missing");
assertAuditPass(freeze.approved_full_snapshot_hash === approved.full_snapshot_hash, "approval freeze hash mismatch");

writeEstimateRevisionArtifact("approval_freeze_results.json", {
  passed: true,
  approved_revision_id: approved.revision_id,
  approved_status: approved.status,
  freeze,
});
