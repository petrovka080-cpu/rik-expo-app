import {
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";

const scenario = buildEstimateRevisionAuditScenario();

assertAuditPass(scenario.checks.audit_trail_complete, "revision audit trail incomplete");
assertAuditPass(scenario.checks.internal_keys_visible === 0, "revision internal keys visible");
assertAuditPass(scenario.checks.mojibake_found === false, "revision labels mojibake found");

writeEstimateRevisionArtifact("android_api34_results.json", {
  passed: true,
  smoke_kind: "platform_agnostic_static_revision_protocol_smoke",
  android_api34_runtime_executed: false,
  android_api34_runtime_reason: "No emulator launch is performed by this focused revision protocol script; release Android canonical replay remains the runtime gate.",
  revision_protocol_passed: true,
  ui_internal_keys_visible: scenario.checks.internal_keys_visible,
  ui_mojibake_found: scenario.checks.mojibake_found,
});
