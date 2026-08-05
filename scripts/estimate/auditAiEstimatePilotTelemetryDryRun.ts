import path from "node:path";

import { redactTelemetryValue } from "../../src/features/estimates/telemetry/estimateTelemetryRecorder";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import {
  CONTROLLED_PILOT_DRY_RUN_ROOT,
  loadControlledPilotDryRunScenarios,
  stableControlledPilotDryRunHash,
} from "./runControlledPilotDryRunScenarios";

export const CONTROLLED_PILOT_TELEMETRY_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "telemetry");

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN_FAILED" as const;

export const CONTROLLED_PILOT_TELEMETRY_EVENT_NAMES = [
  "ai_estimate_created",
  "ai_estimate_approved",
  "ai_estimate_pdf_opened",
  "ai_estimate_buyer_handoff_created",
  "ai_estimate_history_reloaded",
  "ai_estimate_foreman_materials_opened",
  "ai_estimate_foreman_subcontracts_opened",
  "ai_estimate_kill_switch_triggered",
  "ai_estimate_rollback_triggered",
] as const;

type ControlledPilotTelemetryEventName = typeof CONTROLLED_PILOT_TELEMETRY_EVENT_NAMES[number];

type ControlledPilotTelemetryEvent = {
  event_name: ControlledPilotTelemetryEventName;
  source_sha: string;
  role: "consumer" | "foreman" | "director" | "buyer" | "operator";
  flow_id: string;
  prompt_hash: string | null;
  payload: Record<string, unknown>;
};

function event(input: Omit<ControlledPilotTelemetryEvent, "payload"> & { payload?: Record<string, unknown> }): ControlledPilotTelemetryEvent {
  return {
    ...input,
    payload: redactTelemetryValue(input.payload ?? {}) as Record<string, unknown>,
  };
}

export function buildControlledPilotTelemetryEvents(sourceSha: string): ControlledPilotTelemetryEvent[] {
  const scenarios = loadControlledPilotDryRunScenarios().scenarios;
  const firstConsumer = scenarios.find((scenario) => scenario.flow === "consumer_request_estimate") ?? scenarios[0];
  const firstMaterials = scenarios.find((scenario) => scenario.flow === "foreman_materials_estimate") ?? firstConsumer;
  const firstSubcontracts = scenarios.find((scenario) => scenario.flow === "foreman_subcontracts_estimate") ?? firstConsumer;
  const promptHash = firstConsumer ? stableControlledPilotDryRunHash(firstConsumer.prompt) : null;
  return [
    event({
      event_name: "ai_estimate_created",
      source_sha: sourceSha,
      role: "consumer",
      flow_id: "consumer_request_estimate",
      prompt_hash: promptHash,
      payload: { case_id: firstConsumer?.case_id, phone: "+996700000000", prompt_hash: promptHash },
    }),
    event({
      event_name: "ai_estimate_approved",
      source_sha: sourceSha,
      role: "consumer",
      flow_id: "consumer_request_estimate",
      prompt_hash: promptHash,
      payload: { approved_history_snapshot: true },
    }),
    event({
      event_name: "ai_estimate_pdf_opened",
      source_sha: sourceSha,
      role: "consumer",
      flow_id: "pdf_open",
      prompt_hash: promptHash,
      payload: { pdf_artifact_id: "pdf-redacted", email: "owner@example.com" },
    }),
    event({
      event_name: "ai_estimate_buyer_handoff_created",
      source_sha: sourceSha,
      role: "buyer",
      flow_id: "buyer_procurement_handoff",
      prompt_hash: promptHash,
      payload: { procurement_rows_only: true },
    }),
    event({
      event_name: "ai_estimate_history_reloaded",
      source_sha: sourceSha,
      role: "consumer",
      flow_id: "approved_history_reload",
      prompt_hash: promptHash,
      payload: { approved_history_count: 1 },
    }),
    event({
      event_name: "ai_estimate_foreman_materials_opened",
      source_sha: sourceSha,
      role: "foreman",
      flow_id: "foreman_materials_estimate",
      prompt_hash: firstMaterials ? stableControlledPilotDryRunHash(firstMaterials.prompt) : null,
      payload: { case_id: firstMaterials?.case_id },
    }),
    event({
      event_name: "ai_estimate_foreman_subcontracts_opened",
      source_sha: sourceSha,
      role: "foreman",
      flow_id: "foreman_subcontracts_estimate",
      prompt_hash: firstSubcontracts ? stableControlledPilotDryRunHash(firstSubcontracts.prompt) : null,
      payload: { case_id: firstSubcontracts?.case_id },
    }),
    event({
      event_name: "ai_estimate_kill_switch_triggered",
      source_sha: sourceSha,
      role: "operator",
      flow_id: "kill_switch",
      prompt_hash: null,
      payload: { token: "sk-test-token-is-redacted", ai_estimate_disabled: true },
    }),
    event({
      event_name: "ai_estimate_rollback_triggered",
      source_sha: sourceSha,
      role: "operator",
      flow_id: "rollback",
      prompt_hash: null,
      payload: { pilot_disabled: true },
    }),
  ];
}

function telemetryBlockers(events: readonly ControlledPilotTelemetryEvent[]): string[] {
  const scenarios = loadControlledPilotDryRunScenarios().scenarios;
  const fullPrompts = scenarios.map((scenario) => scenario.prompt);
  const serialized = JSON.stringify(events.map((eventItem) => ({
    ...eventItem,
    source_sha: "[source-sha]",
    prompt_hash: eventItem.prompt_hash === null ? null : "[prompt-hash]",
  })));
  return [
    CONTROLLED_PILOT_TELEMETRY_EVENT_NAMES.every((name) => events.some((eventItem) => eventItem.event_name === name))
      ? ""
      : "telemetry_event_missing",
    events.every((eventItem) => eventItem.source_sha.trim().length > 0) ? "" : "telemetry_missing_source_sha",
    events.every((eventItem) => eventItem.role.trim().length > 0) ? "" : "telemetry_missing_role",
    events.every((eventItem) => eventItem.flow_id.trim().length > 0) ? "" : "telemetry_missing_flow_id",
    fullPrompts.some((prompt) => serialized.includes(prompt)) ? "telemetry_contains_full_prompt_unredacted" : "",
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized) ? "telemetry_contains_email" : "",
    /\+?\d[\d\s().-]{7,}\d/.test(serialized) ? "telemetry_contains_phone" : "",
    /sk-test-token|sk-[A-Za-z0-9_-]{8,}/.test(serialized) ? "telemetry_contains_token" : "",
  ].filter(Boolean);
}

export function auditAiEstimatePilotTelemetryDryRun(
  options: { writeRuntime?: boolean; sourceSha?: string } = {},
) {
  const sourceSha = options.sourceSha ?? currentSourceSha();
  const events = buildControlledPilotTelemetryEvents(sourceSha);
  const blockers = telemetryBlockers(events);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN,
    source_sha: sourceSha,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    pilot_telemetry_dry_run_created: true,
    pilot_telemetry_events_emitted: CONTROLLED_PILOT_TELEMETRY_EVENT_NAMES.every((name) =>
      events.some((eventItem) => eventItem.event_name === name),
    ),
    telemetry_pii_redaction_passed: !blockers.some((blocker) => /prompt|phone|email|token/i.test(blocker)),
    telemetry_source_sha_present: events.every((eventItem) => eventItem.source_sha.trim().length > 0),
    telemetry_role_present: events.every((eventItem) => eventItem.role.trim().length > 0),
    telemetry_flow_id_present: events.every((eventItem) => eventItem.flow_id.trim().length > 0),
    telemetry_contains_full_prompt_unredacted: blockers.includes("telemetry_contains_full_prompt_unredacted"),
    telemetry_contains_phone_email_token: blockers.some((blocker) => /phone|email|token/i.test(blocker)),
    telemetry_missing_source_sha: blockers.includes("telemetry_missing_source_sha"),
    telemetry_missing_role: blockers.includes("telemetry_missing_role"),
    telemetry_missing_flow_id: blockers.includes("telemetry_missing_flow_id"),
    owner_approved: false,
    production_release_started: false,
    public_beta_started: false,
    fake_green_claimed: false,
    events,
    blockers,
  };
  const runtime = options.writeRuntime === false
    ? { artifactPath: null, artifact: summary }
    : writeRuntimeJson(CONTROLLED_PILOT_TELEMETRY_ROOT, summary);
  return {
    artifactPath: runtime.artifactPath,
    artifact: runtime.artifact,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimatePilotTelemetryDryRun.ts")) {
  const result = auditAiEstimatePilotTelemetryDryRun();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_TELEMETRY_DRY_RUN) process.exitCode = 1;
}
