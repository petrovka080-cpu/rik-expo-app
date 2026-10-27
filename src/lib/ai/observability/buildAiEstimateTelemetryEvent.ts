import { redactAiEstimateTelemetry, redactAiEstimateTelemetryText } from "./redactAiEstimateTelemetry";
import type { AiEstimateTelemetryEvent, AiEstimateTelemetryInput } from "./aiEstimateTelemetryTypes";

export function buildAiEstimateTelemetryEvent(
  event: AiEstimateTelemetryInput,
): AiEstimateTelemetryEvent {
  const latencyMs = event.latencyMs ?? event.latencyBucketMs ?? 0;
  const legacyPdfReady =
    event.pdfGenerationResult === "ready" ||
    event.pdfGenerationResult === "generated";
  return redactAiEstimateTelemetry({
    runtimeTraceId: event.runtimeTraceId || "trace_missing_redacted",
    route: event.route,
    entrypoint: event.entrypoint,
    canaryStatus: event.canaryStatus ?? "disabled",
    intent: "estimate",
    workKey: event.workKey,
    domain: event.domain,
    object: event.object,
    operation: event.operation,
    classification: event.classification,
    estimateMode: event.estimateMode ?? "dynamic_boq",
    rowCount: event.rowCount ?? 0,
    qualityScore: event.qualityScore ?? 0,
    pdfActionVisible: event.pdfActionVisible ?? legacyPdfReady,
    pdfGenerated: event.pdfGenerated ?? event.pdfGenerationResult === "generated",
    pdfMojibakeFound: event.pdfMojibakeFound ?? false,
    catalogBindingStatus: event.catalogBindingStatus ?? "gap_warning",
    sourceEvidenceStatus: event.sourceEvidenceStatus ?? "warning",
    taxWarningStatus: event.taxWarningStatus ?? "present",
    latencyMs,
    latencyBucketMs: event.latencyBucketMs ?? Math.ceil(latencyMs / 250) * 250,
    errorCode: event.errorCode,
    errorClassification: event.errorClassification,
    promptPreviewRedacted: event.promptPreviewRedacted
      ? redactAiEstimateTelemetryText(event.promptPreviewRedacted)
      : undefined,
  });
}
