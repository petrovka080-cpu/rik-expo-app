import type { ComponentType } from "react";
import { Platform } from "react-native";
import type { Breadcrumb, Event, User } from "@sentry/react-native";

import type { OtaDiagnostics } from "../otaDiagnostics";
import { redactSensitiveRecord, redactSensitiveText, redactSensitiveValue } from "../security/redaction";

const UNKNOWN = "unknown";
const NOT_PROVIDED = "not-provided";
const MAX_TAG_LENGTH = 128;
const MAX_TEXT_LENGTH = 512;
const MAX_STACK_LENGTH = 4096;
const MAX_OBJECT_KEYS = 25;
const MAX_ARRAY_ITEMS = 20;
const MAX_DEPTH = 5;

export type SentryRuntimeStatus = {
  enabled: boolean;
  initialized: boolean;
  dsnSource: "env" | "missing";
  environment: string;
  diagnostics: OtaDiagnostics;
};

export type SentryLogPayload = {
  context: string;
  error: unknown;
  message: string;
  extra: Record<string, unknown> | null;
  platform: string;
};

let runtimeStatus: SentryRuntimeStatus | null = null;
let sentrySdk: SentrySdk | null = null;

type SentryGlobalScope = {
  setTags: (tags: Record<string, string>) => void;
  setContext: (key: string, context: Record<string, unknown>) => void;
};

type SentryScope = {
  setLevel: (level: string) => void;
  setTag: (key: string, value: string) => void;
  setContext: (key: string, context: Record<string, unknown>) => void;
};

type SentrySdk = {
  init: (options: Record<string, unknown>) => void;
  getGlobalScope: () => SentryGlobalScope;
  withScope: (callback: (scope: SentryScope) => void) => void;
  captureException: (error: unknown) => void;
  captureMessage: (message: string, level?: string) => void;
  wrap: <Props extends object>(component: ComponentType<Props>) => ComponentType<Props>;
};

const createNoopScope = (): SentryScope => ({
  setLevel() {},
  setTag() {},
  setContext() {},
});

const createNoopGlobalScope = (): SentryGlobalScope => ({
  setTags() {},
  setContext() {},
});

const NOOP_SENTRY_SDK: SentrySdk = {
  init() {},
  getGlobalScope: createNoopGlobalScope,
  withScope(callback) {
    callback(createNoopScope());
  },
  captureException() {},
  captureMessage() {},
  wrap(component) {
    return component;
  },
};

function getSentrySdk(): SentrySdk {
  if (sentrySdk) {
    return sentrySdk;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentrySdk = require("@sentry/react-native") as SentrySdk;
  } catch {
    sentrySdk = NOOP_SENTRY_SDK;
  }

  return sentrySdk;
}

function loadOtaDiagnostics(): { getOtaDiagnostics: () => OtaDiagnostics } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../otaDiagnostics") as { getOtaDiagnostics: () => OtaDiagnostics };
  } catch {
    return null;
  }
}

function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function clampText(value: string, maxLength = MAX_TEXT_LENGTH): string {
  if (value.length <= maxLength) {
    return value;
  }

  const suffix = "...[truncated]";
  return `${value.slice(0, Math.max(0, maxLength - suffix.length))}${suffix}`;
}

function redactAndClampText(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  return clampText(redactSensitiveText(value), maxLength);
}

function buildFallbackDiagnostics(): OtaDiagnostics {
  return {
    releaseLabel: NOT_PROVIDED,
    gitCommit: NOT_PROVIDED,
    updateGroupId: NOT_PROVIDED,
    updateMessage: NOT_PROVIDED,
    metadataSource: "unavailable",
    metadataWarnings: ["Release diagnostics were unavailable during Sentry bootstrap."],
    appVersion: UNKNOWN,
    nativeBuild: UNKNOWN,
    nativeAppVersion: UNKNOWN,
    nativeBuildVersion: UNKNOWN,
    configuredAppVersion: UNKNOWN,
    configuredIosBuildNumber: UNKNOWN,
    configuredAndroidVersionCode: UNKNOWN,
    runtimeVersion: UNKNOWN,
    channel: UNKNOWN,
    expectedBranch: UNKNOWN,
    updateId: UNKNOWN,
    createdAt: UNKNOWN,
    isEmbeddedLaunch: false,
    launchSource: "unknown",
    isEmergencyLaunch: false,
    emergencyLaunchReason: NOT_PROVIDED,
    updatesUrl: UNKNOWN,
    projectId: UNKNOWN,
    checkAutomatically: "unknown",
    fallbackToCacheTimeout: null,
    appVersionSource: "unknown",
    severity: "error",
    verdict: "error",
    issues: ["Release diagnostics were unavailable during Sentry bootstrap."],
    reasons: ["Release diagnostics were unavailable during Sentry bootstrap."],
    actions: ["Verify Expo Updates metadata wiring before publishing another release."],
    lastUpdateAgeHours: null,
    isProbablyOutdated: false,
    isChannelMismatch: true,
    isRuntimeMismatchSuspected: true,
    publishHint: "Resolve release diagnostics before publishing OTA updates.",
    updateAvailabilityState: "not-checked",
    updateAvailabilitySummary: "No in-session update result is available yet.",
    availableUpdateId: NOT_PROVIDED,
    availableUpdateCreatedAt: NOT_PROVIDED,
    downloadedUpdateId: NOT_PROVIDED,
    downloadedUpdateCreatedAt: NOT_PROVIDED,
    lastCheckForUpdateTimeSinceRestart: NOT_PROVIDED,
    checkError: NOT_PROVIDED,
    downloadError: NOT_PROVIDED,
  };
}

function safeGetOtaDiagnostics(): OtaDiagnostics {
  try {
    return loadOtaDiagnostics()?.getOtaDiagnostics() ?? buildFallbackDiagnostics();
  } catch {
    return buildFallbackDiagnostics();
  }
}

function resolveEnvironment(diagnostics: OtaDiagnostics): string {
  const explicitEnvironment = safeString(process.env.SENTRY_ENVIRONMENT, "");
  if (explicitEnvironment) {
    return explicitEnvironment;
  }

  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return "development";
  }

  if (diagnostics.channel === "production" || diagnostics.channel === "preview" || diagnostics.channel === "development") {
    return diagnostics.channel === "development" ? "development" : diagnostics.channel;
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function sanitizeError(error: Error): Error {
  const sanitized = new Error(redactAndClampText(error.message));
  sanitized.name = error.name;
  if (error.stack) {
    sanitized.stack = redactAndClampText(error.stack, MAX_STACK_LENGTH);
  }
  return sanitized;
}

function trimSanitizedValue(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return redactAndClampText(value);
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (depth >= MAX_DEPTH) {
    return "[truncated-depth]";
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => trimSanitizedValue(item, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[truncated:${value.length - MAX_ARRAY_ITEMS} more]`);
    }
    return items;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const trimmed: Record<string, unknown> = {};
    for (const [key, child] of entries.slice(0, MAX_OBJECT_KEYS)) {
      trimmed[key] = trimSanitizedValue(child, depth + 1);
    }
    if (entries.length > MAX_OBJECT_KEYS) {
      trimmed.__truncatedKeys = entries.length - MAX_OBJECT_KEYS;
    }
    return trimmed;
  }

  return redactAndClampText(String(value));
}

function sanitizeStructuredValue(value: unknown): unknown {
  return trimSanitizedValue(redactSensitiveValue(value));
}

function sanitizeRecord(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (value == null) {
    return value;
  }

  const sanitized = sanitizeStructuredValue(redactSensitiveRecord(value));
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : {};
}

function sanitizeUser(user: User | undefined): User | undefined {
  if (!user) {
    return user;
  }

  const sanitized: User = {};
  if (user.id) {
    sanitized.id = redactAndClampText(user.id, MAX_TAG_LENGTH);
  }
  if (user.segment) {
    sanitized.segment = redactAndClampText(user.segment, MAX_TAG_LENGTH);
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeTags(tags: Event["tags"]): Event["tags"] {
  if (!tags) {
    return tags;
  }

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    const text = redactAndClampText(value, MAX_TAG_LENGTH);
    if (text.length > 0) {
      sanitized[key] = text;
    }
  }
  return sanitized;
}

function sanitizeRequest(request: Event["request"]): Event["request"] {
  if (!request) {
    return request;
  }

  const sanitized = { ...request };
  if (sanitized.url) {
    sanitized.url = redactAndClampText(sanitized.url, 1024);
  }
  if (sanitized.query_string) {
    sanitized.query_string = redactAndClampText(sanitized.query_string, MAX_TEXT_LENGTH);
  }
  if (sanitized.data != null) {
    sanitized.data = sanitizeStructuredValue(sanitized.data) as typeof sanitized.data;
  }
  delete sanitized.cookies;
  delete sanitized.headers;
  return sanitized;
}

function sanitizeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  return {
    ...breadcrumb,
    category: breadcrumb.category ? redactAndClampText(breadcrumb.category, MAX_TAG_LENGTH) : breadcrumb.category,
    message: breadcrumb.message ? redactAndClampText(breadcrumb.message) : breadcrumb.message,
    data:
      breadcrumb.data && typeof breadcrumb.data === "object"
        ? (sanitizeStructuredValue(breadcrumb.data) as Breadcrumb["data"])
        : breadcrumb.data,
  };
}

function sanitizeEvent<T extends Event>(event: T): T {
  const sanitized: Event = {
    ...event,
    message: event.message ? redactAndClampText(event.message) : event.message,
    breadcrumbs: event.breadcrumbs?.map(sanitizeBreadcrumb),
    contexts: event.contexts ? (sanitizeStructuredValue(event.contexts) as Event["contexts"]) : event.contexts,
    extra: event.extra ? sanitizeRecord(event.extra as Record<string, unknown>) ?? undefined : undefined,
    request: sanitizeRequest(event.request),
    tags: sanitizeTags(event.tags),
    user: sanitizeUser(event.user),
  };

  if (event.exception?.values) {
    sanitized.exception = {
      ...event.exception,
      values: event.exception.values.map((value) => ({
        ...value,
        type: value.type ? redactAndClampText(value.type, MAX_TAG_LENGTH) : value.type,
        value: value.value ? redactAndClampText(value.value) : value.value,
      })),
    };
  }

  return sanitized as T;
}

function buildReleaseTags(diagnostics: OtaDiagnostics, environment: string): Record<string, string> {
  const candidates: Record<string, string> = {
    appVersion: safeString(diagnostics.appVersion, UNKNOWN),
    nativeBuildVersion: safeString(diagnostics.nativeBuildVersion, UNKNOWN),
    runtimeVersion: safeString(diagnostics.runtimeVersion, UNKNOWN),
    updateId: safeString(diagnostics.updateId, UNKNOWN),
    updateGroupId: safeString(diagnostics.updateGroupId, NOT_PROVIDED),
    channel: safeString(diagnostics.channel, UNKNOWN),
    isEmbeddedLaunch: String(diagnostics.isEmbeddedLaunch),
    releaseLabel: safeString(diagnostics.releaseLabel, NOT_PROVIDED),
    gitCommit: safeString(diagnostics.gitCommit, NOT_PROVIDED),
    updateMessage: safeString(diagnostics.updateMessage, NOT_PROVIDED),
    platform: Platform.OS,
    environment,
  };

  return Object.fromEntries(
    Object.entries(candidates)
      .filter(([, value]) => value.trim().length > 0)
      .map(([key, value]) => [key, redactAndClampText(value, MAX_TAG_LENGTH)]),
  );
}

function buildReleaseContext(diagnostics: OtaDiagnostics, environment: string): Record<string, unknown> {
  return sanitizeRecord({
    appVersion: diagnostics.appVersion,
    nativeBuildVersion: diagnostics.nativeBuildVersion,
    runtimeVersion: diagnostics.runtimeVersion,
    updateId: diagnostics.updateId,
    updateGroupId: diagnostics.updateGroupId,
    channel: diagnostics.channel,
    expectedBranch: diagnostics.expectedBranch,
    launchSource: diagnostics.launchSource,
    isEmbeddedLaunch: diagnostics.isEmbeddedLaunch,
    releaseLabel: diagnostics.releaseLabel,
    gitCommit: diagnostics.gitCommit,
    updateMessage: diagnostics.updateMessage,
    metadataSource: diagnostics.metadataSource,
    createdAt: diagnostics.createdAt,
    updateAvailabilityState: diagnostics.updateAvailabilityState,
    projectId: diagnostics.projectId,
    updatesUrl: diagnostics.updatesUrl,
    environment,
  }) ?? {};
}

function applyReleaseMetadataToGlobalScope(diagnostics: OtaDiagnostics, environment: string): void {
  const scope = getSentrySdk().getGlobalScope();
  scope.setTags(buildReleaseTags(diagnostics, environment));
  scope.setContext("release_metadata", buildReleaseContext(diagnostics, environment));
}

function getDsn(): string {
  return safeString(process.env.EXPO_PUBLIC_SENTRY_DSN, "");
}

export function initializeSentry(): SentryRuntimeStatus {
  if (runtimeStatus) {
    return runtimeStatus;
  }

  const dsn = getDsn();
  const diagnostics = dsn ? safeGetOtaDiagnostics() : buildFallbackDiagnostics();
  const environment = resolveEnvironment(diagnostics);

  runtimeStatus = {
    enabled: dsn.length > 0,
    initialized: false,
    dsnSource: dsn.length > 0 ? "env" : "missing",
    environment,
    diagnostics,
  };

  if (!dsn) {
    return runtimeStatus;
  }

  try {
    getSentrySdk().init({
      dsn,
      environment,
      sendDefaultPii: false,
      attachStacktrace: true,
      beforeBreadcrumb: (breadcrumb: Breadcrumb) => sanitizeBreadcrumb(breadcrumb),
      beforeSend: (event: Event) => sanitizeEvent(event),
    });
    applyReleaseMetadataToGlobalScope(diagnostics, environment);
    runtimeStatus = {
      ...runtimeStatus,
      initialized: true,
    };
  } catch {
    // no-op: telemetry must never break the app bootstrap
  }

  return runtimeStatus;
}

export function getSentryRuntimeStatus(): SentryRuntimeStatus {
  return runtimeStatus ?? initializeSentry();
}

export function captureLogErrorToSentry(payload: SentryLogPayload): void {
  const status = initializeSentry();
  if (!status.initialized) {
    return;
  }

  const extra = sanitizeRecord(payload.extra) ?? undefined;
  const safeContext = redactAndClampText(payload.context, MAX_TAG_LENGTH);
  const safeMessage = redactAndClampText(payload.message);

  try {
    const sentry = getSentrySdk();
    sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("errorSource", "logError");
      scope.setTag("logContext", safeContext);
      scope.setContext("app_error", {
        context: safeContext,
        message: safeMessage,
        platform: payload.platform,
        metadataSource: status.diagnostics.metadataSource,
      });

      if (extra && Object.keys(extra).length > 0) {
        scope.setContext("app_error_extra", extra);
      }

      if (payload.error instanceof Error) {
        sentry.captureException(sanitizeError(payload.error));
        return;
      }

      if (payload.error && typeof payload.error === "object") {
        sentry.captureException(sanitizeStructuredValue(payload.error));
        return;
      }

      sentry.captureMessage(`[${safeContext}] ${safeMessage}`, "error");
    });
  } catch {
    // no-op: Sentry capture must never break the existing error pipeline
  }
}

export function wrapRootComponentWithSentry<Props extends object>(
  Component: ComponentType<Props>,
): ComponentType<Props> {
  return getSentryRuntimeStatus().initialized
    ? (getSentrySdk().wrap(Component as ComponentType<any>) as ComponentType<Props>)
    : Component;
}
