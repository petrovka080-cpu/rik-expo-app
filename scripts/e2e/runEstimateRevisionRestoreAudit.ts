import {
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";

const scenario = buildEstimateRevisionAuditScenario();

assertAuditPass(scenario.current.source === "RESTORED_FROM_REVISION", "restore did not create restored revision");

writeEstimateRevisionArtifact("restore_revision_results.json", {
  passed: true,
  current_revision_id: scenario.current.revision_id,
  current_revision_source: scenario.current.source,
  current_snapshot_hash: scenario.current.editable_estimate_snapshot.hash,
});
