export type AiEstimateTelemetryEvent = {
  eventName: string;
  sourceSha: string;
  runtimeVersion: string;
  createdAt: string;
  attributes: Record<string, string | number | boolean | null>;
};

export type AiEstimateTelemetryPort = {
  readonly portKind: "estimate_telemetry";
  emit(event: AiEstimateTelemetryEvent): void;
};
