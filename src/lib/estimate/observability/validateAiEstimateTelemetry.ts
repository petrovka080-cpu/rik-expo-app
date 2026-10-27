import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  createInMemoryAiEstimateTelemetryRecorder,
  type AiEstimateTelemetryEventName,
} from "./AiEstimateTelemetry";
import { redactAiEstimateTelemetryPayload } from "./redactAiEstimateTelemetryPayload";

export type AiEstimateTelemetryValidation = {
  ok: boolean;
  telemetryBoundaryCreated: boolean;
  telemetryEventsEmitted: boolean;
  telemetrySourceShaPresent: boolean;
  telemetryRuntimeVersionPresent: boolean;
  telemetryWorkFamilyPresent: boolean;
  telemetryFlowIdPresent: boolean;
  piiRedactionPassed: boolean;
  fullPromptNotLoggedUnredacted: boolean;
  tokensNotLogged: boolean;
  blockingReasons: string[];
};

const REQUIRED_EVENTS: AiEstimateTelemetryEventName[] = [
  "ai_estimate_runtime_create_started",
  "ai_estimate_runtime_create_completed",
  "ai_estimate_work_classified",
  "ai_estimate_parameter_passport_built",
  "ai_estimate_parameter_override_applied",
  "ai_estimate_formula_dag_evaluated",
  "ai_estimate_revision_created",
  "ai_estimate_pdf_snapshot_built",
  "ai_estimate_buyer_package_built",
  "ai_estimate_history_page_loaded",
  "ai_estimate_storage_compaction_started",
  "ai_estimate_storage_compaction_completed",
  "ai_estimate_runtime_error",
];

export function validateAiEstimateTelemetry(): AiEstimateTelemetryValidation {
  const recorder = createInMemoryAiEstimateTelemetryRecorder();
  for (const event of REQUIRED_EVENTS) {
    recorder.emit(redactAiEstimateTelemetryPayload({
      event,
      source_sha: estimateDeterministicHash(event),
      runtime_version: "platform-core-v2",
      work_family: "apartment_repair",
      flow_id: "flow-1",
      metadata: {
        raw_prompt: "call +996 555 123456 email user@example.com token=abc",
        row_count: 12,
      },
    }));
  }
  const events = recorder.events();
  const serialized = JSON.stringify(events);
  const checks = {
    telemetry_boundary_created: true,
    telemetry_events_emitted: REQUIRED_EVENTS.every((event) => events.some((item) => item.event === event)),
    telemetry_source_sha_present: events.every((event) => Boolean(event.source_sha)),
    telemetry_runtime_version_present: events.every((event) => event.runtime_version === "platform-core-v2"),
    telemetry_work_family_present: events.every((event) => Boolean(event.work_family)),
    telemetry_flow_id_present: events.every((event) => Boolean(event.flow_id)),
    pii_redaction_passed: !serialized.includes("user@example.com") && !serialized.includes("+996") && !serialized.includes("abc"),
    full_prompt_not_logged_unredacted: !serialized.includes("raw_prompt"),
    tokens_not_logged: !/token=abc|secret/i.test(serialized),
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    ok: blockingReasons.length === 0,
    telemetryBoundaryCreated: true,
    telemetryEventsEmitted: checks.telemetry_events_emitted,
    telemetrySourceShaPresent: checks.telemetry_source_sha_present,
    telemetryRuntimeVersionPresent: checks.telemetry_runtime_version_present,
    telemetryWorkFamilyPresent: checks.telemetry_work_family_present,
    telemetryFlowIdPresent: checks.telemetry_flow_id_present,
    piiRedactionPassed: checks.pii_redaction_passed,
    fullPromptNotLoggedUnredacted: checks.full_prompt_not_logged_unredacted,
    tokensNotLogged: checks.tokens_not_logged,
    blockingReasons,
  };
}
