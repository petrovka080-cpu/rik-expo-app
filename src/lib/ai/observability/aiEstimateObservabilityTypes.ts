export type AiEstimateTelemetryEvent = {
  runtimeTraceId: string;
  route: "/request" | "/ai?context=foreman";
  entrypoint: "request" | "embedded_ai";
  intent: "estimate";
  workKey: string;
  domain: string;
  object: string;
  operation: string;
  classification: string;
  latencyBucketMs: number;
  pdfGenerationResult: "ready" | "disabled" | "failed";
  catalogBindingStatus: "bound" | "gap_warning" | "disabled";
  sourceEvidenceStatus: "present" | "warning";
  taxWarningStatus: "present" | "not_required";
  errorClassification?: string;
};

