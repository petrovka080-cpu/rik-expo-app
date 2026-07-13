export const ESTIMATE_TELEMETRY_EVENT_NAMES = [
  "estimate_generated",
  "manual_item_added",
  "pdf_exported",
  "estimate_approved",
  "marketplace_handoff_created",
  "estimator_feedback_ingested",
  "fatal_fallback",
  "kill_switch_triggered",
  "support_package_exported",
  "quality_drift_detected",
] as const;

export type EstimateTelemetryEventName = typeof ESTIMATE_TELEMETRY_EVENT_NAMES[number];

export type EstimateTelemetryContext = {
  source_sha: string;
  branch: string;
  catalog_version: string;
  route: "/request" | "script" | "pdf" | "marketplace" | "feedback";
  platform: "web" | "android-chrome" | "native" | "node" | "unknown";
  pilot_mode_enabled: boolean;
};

export type EstimateTelemetryEvent = {
  event_id: string;
  event_name: EstimateTelemetryEventName;
  created_at: string;
  request_id?: string | null;
  estimate_id?: string | null;
  context: EstimateTelemetryContext;
  payload: Record<string, unknown>;
};
