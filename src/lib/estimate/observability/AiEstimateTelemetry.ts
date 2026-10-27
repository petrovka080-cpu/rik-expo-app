export type AiEstimateTelemetryEventName =
  | "ai_estimate_runtime_create_started"
  | "ai_estimate_runtime_create_completed"
  | "ai_estimate_work_classified"
  | "ai_estimate_parameter_passport_built"
  | "ai_estimate_parameter_override_applied"
  | "ai_estimate_formula_dag_evaluated"
  | "ai_estimate_revision_created"
  | "ai_estimate_pdf_snapshot_built"
  | "ai_estimate_buyer_package_built"
  | "ai_estimate_history_page_loaded"
  | "ai_estimate_storage_compaction_started"
  | "ai_estimate_storage_compaction_completed"
  | "ai_estimate_runtime_error";

export type AiEstimateTelemetryPayload = {
  event: AiEstimateTelemetryEventName;
  source_sha: string;
  runtime_version: "platform-core-v2";
  work_family: string;
  flow_id: string;
  template_id?: string | null;
  revision_id?: string | null;
  metadata?: Record<string, unknown>;
};

export type AiEstimateTelemetryRecorder = {
  emit(payload: AiEstimateTelemetryPayload): void;
  events(): AiEstimateTelemetryPayload[];
};

export function createInMemoryAiEstimateTelemetryRecorder(): AiEstimateTelemetryRecorder {
  const values: AiEstimateTelemetryPayload[] = [];
  return {
    emit(payload) {
      values.push(payload);
    },
    events() {
      return values.slice();
    },
  };
}
