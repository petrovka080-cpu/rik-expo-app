import {
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";

const scenario = buildEstimateRevisionAuditScenario();

assertAuditPass(scenario.conflict?.status === "REVISION_CONFLICT", "revision conflict missing");
assertAuditPass(scenario.conflict?.silent_overwrite === false, "silent overwrite not blocked");

writeEstimateRevisionArtifact("conflict_detection_results.json", {
  passed: true,
  conflict: scenario.conflict,
});
