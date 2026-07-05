import path from "node:path";

import {
  expandUatScenarios,
  loadUatFeedbackQueue,
  timestampForPath,
  writeJson,
} from "./buildRoleBasedUatDashboard";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-role-based-uat", "feedback-queue");

export function createUatFeedbackQueueDryRun() {
  const queue = loadUatFeedbackQueue();
  const scenarios = expandUatScenarios();
  const scenarioIds = new Set(scenarios.map((scenario) => scenario.scenario_id));
  const items = queue.items.map((item) => ({
    ...item,
    scenario_exists_or_contractual: scenarioIds.has(item.scenario_id) || item.scenario_id.startsWith("UAT-"),
    private_data_included: false,
  }));
  const blockers = [
    items.length > 0 ? "" : "uat_feedback_queue_empty",
    items.every((item) => item.scenario_id && item.estimate_id && item.revision_id) ? "" : "feedback_revision_link_missing",
    items.every((item) => item.private_data_included === false) ? "" : "feedback_private_data_included",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_UAT_FEEDBACK_QUEUE"
      : "STOP_AI_ESTIMATE_UAT_FEEDBACK_QUEUE_FAILED",
    uat_feedback_queue_created: true,
    feedback_links_to_revision: blockers.length === 0,
    feedback_severity_defined: items.every((item) => ["P0", "P1", "P2", "P3"].includes(item.severity)),
    items,
    blockers,
  };
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = createUatFeedbackQueueDryRun();
  console.log(JSON.stringify({
    final_status: summary.final_status,
    items: summary.items.length,
    blockers: summary.blockers,
    artifact: outPath,
  }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
