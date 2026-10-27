import type { AiEstimateCanaryEntrypoint } from "../productionCanary/aiEstimateCanaryConfig";

export type AiEstimateTelemetryEntrypoint = "request" | "embedded_ai";

export type AiEstimateTelemetryEvent = {
  runtimeTraceId: string;
  route: AiEstimateCanaryEntrypoint;
  entrypoint: AiEstimateTelemetryEntrypoint;
  canaryStatus: string;
  intent: "estimate";
  workKey?: string;
  domain: string;
  object: string;
  operation: string;
  classification: string;
  estimateMode: "template" | "dynamic_boq" | "regulated_safe" | "ambiguous" | "unknown_triage";
  rowCount: number;
  qualityScore: number;
  pdfActionVisible: boolean;
  pdfGenerated: boolean;
  pdfMojibakeFound: boolean;
  catalogBindingStatus: "bound" | "gap_warning" | "disabled";
  sourceEvidenceStatus: "present" | "warning" | "missing";
  taxWarningStatus: "present" | "not_required" | "missing";
  latencyMs: number;
  latencyBucketMs: number;
  errorCode?: string;
  errorClassification?: string;
  promptPreviewRedacted?: string;
};

export type AiEstimateTelemetryInput = Partial<AiEstimateTelemetryEvent> &
  Pick<AiEstimateTelemetryEvent, "runtimeTraceId" | "route" | "entrypoint" | "intent" | "domain" | "object" | "operation" | "classification"> & {
    pdfGenerationResult?: "ready" | "generated" | "disabled" | "failed" | string;
  };
