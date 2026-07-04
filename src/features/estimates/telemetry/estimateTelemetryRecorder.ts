import {
  buildEstimateRuntimeBuildInfo,
  isEstimateFeatureEnabled,
  type EstimateRuntimeEnv,
} from "../runtime/estimateFeatureFlags";
import {
  ESTIMATE_TELEMETRY_EVENT_NAMES,
  type EstimateTelemetryContext,
  type EstimateTelemetryEvent,
  type EstimateTelemetryEventName,
} from "./estimateTelemetryTypes";

const events: EstimateTelemetryEvent[] = [];
let sequence = 0;

function nextEventId(): string {
  sequence += 1;
  return `estimate_evt_${Date.now().toString(36)}_${sequence.toString(36)}`;
}

function defaultContext(input: {
  route?: EstimateTelemetryContext["route"];
  platform?: EstimateTelemetryContext["platform"];
  env?: EstimateRuntimeEnv;
}): EstimateTelemetryContext {
  const build = buildEstimateRuntimeBuildInfo(input.env);
  return {
    source_sha: build.source_sha,
    branch: build.branch,
    catalog_version: build.catalog_version,
    route: input.route ?? "script",
    platform: input.platform ?? "unknown",
    pilot_mode_enabled: isEstimateFeatureEnabled("AI_ESTIMATE_PILOT_MODE", input.env),
  };
}

function redactText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .replace(/\b(?:token|secret|password|apikey|api_key)\s*[:=]\s*[^,\s;]+/gi, "[redacted-secret]")
    .replace(/\b(?:address|addr|street|ул\.?|улица)\s*[:=]\s*[^,\n;]+/gi, "[redacted-address]");
}

export function redactTelemetryValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactTelemetryValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (/phone|email|address|token|secret|password|api[_-]?key/i.test(key)) {
          return [key, "[redacted]"];
        }
        return [key, redactTelemetryValue(item)];
      }),
    );
  }
  return value;
}

export function createEstimateTelemetryEvent(input: {
  event_name: EstimateTelemetryEventName;
  request_id?: string | null;
  estimate_id?: string | null;
  route?: EstimateTelemetryContext["route"];
  platform?: EstimateTelemetryContext["platform"];
  context?: Partial<EstimateTelemetryContext>;
  payload?: Record<string, unknown>;
  env?: EstimateRuntimeEnv;
  created_at?: string;
}): EstimateTelemetryEvent {
  const context = { ...defaultContext(input), ...input.context };
  return {
    event_id: nextEventId(),
    event_name: input.event_name,
    created_at: input.created_at ?? new Date().toISOString(),
    request_id: input.request_id ?? null,
    estimate_id: input.estimate_id ?? null,
    context,
    payload: redactTelemetryValue(input.payload ?? {}) as Record<string, unknown>,
  };
}

export function recordEstimateTelemetryEvent(input: Parameters<typeof createEstimateTelemetryEvent>[0]): EstimateTelemetryEvent {
  const event = createEstimateTelemetryEvent(input);
  events.push(event);
  return event;
}

export function getEstimateTelemetryEvents(): EstimateTelemetryEvent[] {
  return [...events];
}

export function clearEstimateTelemetryEvents(): void {
  events.splice(0, events.length);
  sequence = 0;
}

export function validateEstimateTelemetryEvent(event: EstimateTelemetryEvent): string[] {
  return [
    ESTIMATE_TELEMETRY_EVENT_NAMES.includes(event.event_name) ? "" : "unknown_event_name",
    event.event_id ? "" : "event_id_missing",
    Number.isNaN(Date.parse(event.created_at)) ? "created_at_invalid" : "",
    event.context.source_sha ? "" : "source_sha_missing",
    event.context.catalog_version ? "" : "catalog_version_missing",
    event.context.route ? "" : "route_missing",
  ].filter(Boolean);
}
