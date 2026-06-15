import {
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";

const scenario = buildEstimateRevisionAuditScenario();

assertAuditPass(scenario.checks.pdf_bound_to_exact_revision, "PDF binding is not exact");
assertAuditPass(scenario.checks.request_bound_to_exact_revision, "request binding is not exact");
assertAuditPass(scenario.checks.history_bound_to_exact_revision, "history binding is not exact");

writeEstimateRevisionArtifact("pdf_revision_binding.json", {
  passed: true,
  binding: scenario.pdf.binding,
});

writeEstimateRevisionArtifact("request_history_revision_binding.json", {
  passed: true,
  request_binding: scenario.request.binding,
  history_binding: scenario.history.binding,
});
