import { buildAiEstimateTelemetryEvent } from "../../src/lib/ai/observability/buildAiEstimateTelemetryEvent";
import { validateAiEstimateTelemetry } from "../../src/lib/ai/observability/validateAiEstimateTelemetry";
import { writeAiEstimateEnterpriseFinalReadinessArtifacts } from "./runAiEstimateEnterpriseFinalReadinessGoNoGo";

const event = buildAiEstimateTelemetryEvent({
  runtimeTraceId: "trace_final_readiness_redacted",
  route: "/ai?context=foreman",
  entrypoint: "embedded_ai",
  intent: "estimate",
  workKey: "metal_canopy_installation",
  domain: "canopies",
  object: "metal_canopy",
  operation: "installation",
  classification: "EXPANDED_PROFESSIONAL_BOQ_OK",
  latencyBucketMs: 1000,
  pdfGenerationResult: "ready",
  catalogBindingStatus: "bound",
  sourceEvidenceStatus: "present",
  taxWarningStatus: "present",
});
const validation = validateAiEstimateTelemetry(event);
writeAiEstimateEnterpriseFinalReadinessArtifacts();
if (!validation.valid) throw new Error("OBSERVABILITY_MISSING");

