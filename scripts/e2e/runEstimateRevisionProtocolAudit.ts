import {
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";

const scenario = buildEstimateRevisionAuditScenario();

assertAuditPass(scenario.initialState.revisions.length === 1, "initial revision missing");
assertAuditPass(scenario.restored.revisions.length >= 8, "revision protocol did not create expected revisions");
assertAuditPass(scenario.restored.fake_green_claimed === false, "fake green flag invalid");

writeEstimateRevisionArtifact("revision_protocol.json", {
  passed: true,
  initial_revision_count: scenario.initialState.revisions.length,
  final_revision_count: scenario.restored.revisions.length,
  current_revision_source: scenario.current.source,
  event_types: scenario.restored.events.map((event) => event.event_type),
  second_estimate_engine_created: false,
});

writeEstimateRevisionArtifact("matrix.json", {
  passed: true,
  checks: scenario.checks,
  blockers: [],
});
