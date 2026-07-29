import {
  normalizeIntentRoutePath,
  splitIntentPathAndQuery,
} from "./coreRoutes";

export const REQUEST_ESTIMATE_LAUNCH_PAYLOAD_VERSION = 1 as const;
export const REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM = "launchPayloadV1" as const;
export const REQUEST_ESTIMATE_LAUNCH_READY_MARKER_PREFIX =
  "REQUEST_ESTIMATE_LAUNCH_READY_" as const;

export type RequestEstimateLaunchRouteV1 = "/request" | "/ai";

export type RequestEstimateLaunchActorContextV1 = {
  role: string | null;
  source: "route_default" | "route_parameter";
};

export type RequestEstimateLaunchPayloadV1 = {
  version: typeof REQUEST_ESTIMATE_LAUNCH_PAYLOAD_VERSION;
  launchId: string;
  route: RequestEstimateLaunchRouteV1;
  workIntent: string;
  parameters: Record<string, string>;
  actorContext: RequestEstimateLaunchActorContextV1;
  issuedAt: string;
  fingerprint?: string;
};

export type RequestEstimateLaunchTargetV1 = {
  pathname: RequestEstimateLaunchRouteV1;
  navigationPathname: "/(tabs)/request" | "/(tabs)/ai";
  query: string;
  href: string;
  params: Record<string, string>;
  normalizedPath: string;
  payload: RequestEstimateLaunchPayloadV1;
};

export type RequestEstimateLaunchPayloadErrorCode =
  | "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT"
  | "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_OVERSIZED"
  | "REQUEST_ESTIMATE_LAUNCH_WORK_INTENT_REQUIRED"
  | "REQUEST_ESTIMATE_LAUNCH_ROUTE_MISMATCH";

export class RequestEstimateLaunchPayloadError extends Error {
  readonly code: RequestEstimateLaunchPayloadErrorCode;

  constructor(code: RequestEstimateLaunchPayloadErrorCode) {
    super(code);
    this.name = "RequestEstimateLaunchPayloadError";
    this.code = code;
  }
}

const MAX_ENCODED_PAYLOAD_LENGTH = 8_192;
const MAX_PARAMETER_COUNT = 32;
const MAX_PARAMETER_KEY_LENGTH = 80;
const MAX_PARAMETER_VALUE_LENGTH = 2_048;
const MAX_WORK_INTENT_LENGTH = 2_048;
const PAYLOAD_KEYS = new Set([
  "version",
  "launchId",
  "route",
  "workIntent",
  "parameters",
  "actorContext",
  "issuedAt",
  "fingerprint",
]);
const ACTOR_CONTEXT_KEYS = new Set(["role", "source"]);

const normalizeText = (value: unknown): string => String(value ?? "").trim();

export function buildRequestEstimateLaunchReadyMarkerId(
  launchId: string,
): `${typeof REQUEST_ESTIMATE_LAUNCH_READY_MARKER_PREFIX}${string}` {
  const safeLaunchId = normalizeText(launchId)
    .replace(/[^A-Za-z0-9_.-]/g, "_")
    .slice(0, 160);
  return `${REQUEST_ESTIMATE_LAUNCH_READY_MARKER_PREFIX}${safeLaunchId}`;
}

function fail(
  code: RequestEstimateLaunchPayloadErrorCode,
): never {
  throw new RequestEstimateLaunchPayloadError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): void {
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
}

function normalizeRoute(value: unknown): RequestEstimateLaunchRouteV1 {
  if (value === "/request" || value === "/ai") return value;
  return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
}

function normalizeParameters(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_PARAMETER_COUNT) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_OVERSIZED");
  }

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries.sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const key = normalizeText(rawKey);
    if (
      !key ||
      key.length > MAX_PARAMETER_KEY_LENGTH ||
      typeof rawValue !== "string" ||
      rawValue.length > MAX_PARAMETER_VALUE_LENGTH ||
      key === REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM
    ) {
      return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
    }
    normalized[key] = rawValue;
  }
  return normalized;
}

function normalizeActorContext(
  value: unknown,
): RequestEstimateLaunchActorContextV1 {
  if (!isRecord(value)) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
  assertExactKeys(value, ACTOR_CONTEXT_KEYS);
  const role = value.role == null ? null : normalizeText(value.role).toLowerCase();
  if (
    (value.role != null && typeof value.role !== "string") ||
    (role?.length ?? 0) > 80 ||
    (value.source !== "route_default" && value.source !== "route_parameter")
  ) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
  return {
    role: role || null,
    source: value.source,
  };
}

function normalizeIssuedAt(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
  return new Date(value).toISOString();
}

function fingerprintText(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stablePayloadJson(payload: RequestEstimateLaunchPayloadV1): string {
  return JSON.stringify({
    version: payload.version,
    launchId: payload.launchId,
    route: payload.route,
    workIntent: payload.workIntent,
    parameters: Object.fromEntries(
      Object.entries(payload.parameters).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    actorContext: {
      role: payload.actorContext.role,
      source: payload.actorContext.source,
    },
    issuedAt: payload.issuedAt,
    ...(payload.fingerprint ? { fingerprint: payload.fingerprint } : {}),
  });
}

export function validateRequestEstimateLaunchPayloadV1(
  value: unknown,
): RequestEstimateLaunchPayloadV1 {
  if (!isRecord(value)) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
  assertExactKeys(value, PAYLOAD_KEYS);
  if (value.version !== REQUEST_ESTIMATE_LAUNCH_PAYLOAD_VERSION) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
  const launchId = normalizeText(value.launchId);
  const workIntent = normalizeText(value.workIntent);
  const fingerprint =
    value.fingerprint == null ? undefined : normalizeText(value.fingerprint);
  if (
    !/^[a-z0-9][a-z0-9._:-]{7,127}$/i.test(launchId) ||
    !workIntent ||
    workIntent.length > MAX_WORK_INTENT_LENGTH ||
    (fingerprint != null && !/^[a-f0-9]{8,64}$/i.test(fingerprint))
  ) {
    return fail(
      workIntent
        ? "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT"
        : "REQUEST_ESTIMATE_LAUNCH_WORK_INTENT_REQUIRED",
    );
  }

  return {
    version: REQUEST_ESTIMATE_LAUNCH_PAYLOAD_VERSION,
    launchId,
    route: normalizeRoute(value.route),
    workIntent,
    parameters: normalizeParameters(value.parameters),
    actorContext: normalizeActorContext(value.actorContext),
    issuedAt: normalizeIssuedAt(value.issuedAt),
    ...(fingerprint ? { fingerprint } : {}),
  };
}

export function encodeRequestEstimateLaunchPayloadV1(
  value: RequestEstimateLaunchPayloadV1,
): string {
  const payload = validateRequestEstimateLaunchPayloadV1(value);
  const encoded = stablePayloadJson(payload);
  if (encoded.length > MAX_ENCODED_PAYLOAD_LENGTH) {
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_OVERSIZED");
  }
  return encoded;
}

export function decodeRequestEstimateLaunchPayloadV1(
  encoded: string,
): RequestEstimateLaunchPayloadV1 {
  if (
    typeof encoded !== "string" ||
    !encoded ||
    encoded.length > MAX_ENCODED_PAYLOAD_LENGTH
  ) {
    return fail(
      encoded?.length > MAX_ENCODED_PAYLOAD_LENGTH
        ? "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_OVERSIZED"
        : "REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT",
    );
  }
  try {
    return validateRequestEstimateLaunchPayloadV1(JSON.parse(encoded));
  } catch (error) {
    if (error instanceof RequestEstimateLaunchPayloadError) throw error;
    return fail("REQUEST_ESTIMATE_LAUNCH_PAYLOAD_CORRUPT");
  }
}

function parseQueryParams(query: string): Record<string, string> {
  const parsed = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const parameters: Record<string, string> = {};
  parsed.forEach((value, key) => {
    parameters[key] = value;
  });
  return parameters;
}

function buildCanonicalQuery(parameters: Record<string, string>): string {
  const query = new URLSearchParams();
  Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => query.set(key, value));
  const text = query.toString();
  return text ? `?${text}` : "";
}

function actorContextFor(
  route: RequestEstimateLaunchRouteV1,
  parameters: Record<string, string>,
): RequestEstimateLaunchActorContextV1 {
  const parameterRole = normalizeText(parameters.context).toLowerCase();
  if (parameterRole) {
    return { role: parameterRole, source: "route_parameter" };
  }
  return {
    role: route === "/request" ? "buyer" : null,
    source: "route_default",
  };
}

export function createRequestEstimateLaunchPayloadV1(input: {
  route: RequestEstimateLaunchRouteV1;
  workIntent: string;
  parameters: Record<string, string>;
  issuedAt?: string;
  launchId?: string;
}): RequestEstimateLaunchPayloadV1 {
  const route = normalizeRoute(input.route);
  const workIntent = normalizeText(input.workIntent);
  if (!workIntent) {
    return fail("REQUEST_ESTIMATE_LAUNCH_WORK_INTENT_REQUIRED");
  }
  const parameters = normalizeParameters(input.parameters);
  const issuedAt = normalizeIssuedAt(input.issuedAt ?? new Date().toISOString());
  const fingerprint = fingerprintText(
    JSON.stringify({ route, workIntent, parameters }),
  );
  const launchId =
    normalizeText(input.launchId) ||
    `request-estimate:${fingerprint}:${Date.parse(issuedAt).toString(36)}`;
  return validateRequestEstimateLaunchPayloadV1({
    version: REQUEST_ESTIMATE_LAUNCH_PAYLOAD_VERSION,
    launchId,
    route,
    workIntent,
    parameters,
    actorContext: actorContextFor(route, parameters),
    issuedAt,
    fingerprint,
  });
}

export function resolveRequestEstimateLaunchTargetV1(
  path: string | null | undefined,
  options: { issuedAt?: string; launchId?: string } = {},
): RequestEstimateLaunchTargetV1 | null {
  if (!path) return null;
  const { routePath, query } = splitIntentPathAndQuery(path);
  const normalizedPath = normalizeIntentRoutePath(routePath);
  const route =
    normalizedPath === "/request" ||
    normalizedPath === "/request/index" ||
    normalizedPath === "/(tabs)/request" ||
    normalizedPath === "/(tabs)/request/index"
      ? "/request"
      : normalizedPath === "/ai" || normalizedPath === "/(tabs)/ai"
        ? "/ai"
        : null;
  if (!route) return null;

  const rawParameters = parseQueryParams(query);
  const encodedPayload = rawParameters[REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM];
  delete rawParameters[REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM];
  const explicitLaunchId = normalizeText(rawParameters.launchId);
  delete rawParameters.launchId;

  const payload = encodedPayload
    ? decodeRequestEstimateLaunchPayloadV1(encodedPayload)
    : createRequestEstimateLaunchPayloadV1({
        route,
        workIntent:
          normalizeText(rawParameters.prompt) ||
          normalizeText(rawParameters.description),
        parameters: rawParameters,
        issuedAt: options.issuedAt,
        launchId: options.launchId ?? explicitLaunchId,
      });
  if (payload.route !== route) {
    return fail("REQUEST_ESTIMATE_LAUNCH_ROUTE_MISMATCH");
  }

  const canonicalPayload = encodeRequestEstimateLaunchPayloadV1(payload);
  const params = {
    ...payload.parameters,
    launchId: payload.launchId,
    [REQUEST_ESTIMATE_LAUNCH_PAYLOAD_PARAM]: canonicalPayload,
  };
  const canonicalQuery = buildCanonicalQuery(params);
  const navigationPathname =
    route === "/request" ? "/(tabs)/request" : "/(tabs)/ai";
  return {
    pathname: route,
    navigationPathname,
    query: canonicalQuery,
    href: `${navigationPathname}${canonicalQuery}`,
    params,
    normalizedPath,
    payload,
  };
}

export function requestEstimateLaunchFingerprint(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeText(value);
  return normalized ? fingerprintText(normalized) : null;
}
