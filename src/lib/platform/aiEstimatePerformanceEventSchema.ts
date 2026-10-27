import type { AiEstimatePerformanceOperation } from "./aiEstimatePerformanceSloContract";

export const AI_ESTIMATE_PERFORMANCE_EVENT_NAMES = [
  "ai_estimate_prompt_started",
  "ai_estimate_template_matched",
  "ai_estimate_boq_built",
  "ai_estimate_costing_built",
  "ai_estimate_pdf_built",
  "ai_estimate_buyer_handoff_built",
  "ai_estimate_history_page_loaded",
  "ai_estimate_foreman_entry_opened",
  "ai_estimate_slo_violation_detected",
] as const;

export type AiEstimatePerformanceEventName = typeof AI_ESTIMATE_PERFORMANCE_EVENT_NAMES[number];

export type AiEstimatePerformanceEvent = {
  eventName: AiEstimatePerformanceEventName;
  operation: AiEstimatePerformanceOperation;
  durationMs: number;
  sourceSha: string;
  routeOrSurface: string;
  promptRedacted?: string;
  rowsCount?: number;
  memoryMb?: number;
};

export type AiEstimatePerformanceEventValidation = {
  performance_telemetry_schema_created: true;
  all_events_have_duration: boolean;
  all_events_have_source_sha: boolean;
  all_events_have_operation: boolean;
  pii_redaction_passed: boolean;
  full_prompt_not_logged_unredacted: boolean;
  performance_event_without_source_sha: boolean;
  performance_event_without_operation: boolean;
  performance_event_without_duration: boolean;
  performance_event_contains_pii: boolean;
  performance_event_contains_full_prompt_unredacted: boolean;
  passed: boolean;
  failures: string[];
};
