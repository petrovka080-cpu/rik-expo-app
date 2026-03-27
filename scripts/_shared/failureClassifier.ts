export type RuntimeFailureKind = "environment" | "auth" | "route" | "app" | "unknown";

const ENVIRONMENT_RE = /adb|emulator|device detected|dev client|development build|expo|launcher|google play|gms|anr|bundle|manifest|reverse|timed out|timeout|blank app surface|reloading|connection refused|econnrefused/i;
const AUTH_RE = /login|auth|password|email field|password field|credential|session|unauthori[sz]ed|forbidden|activation code|activation screen persisted/i;
const ROUTE_RE = /protected route|deeplink|deep link|route|tab did not open|tab strip|route did not settle|home tab|inbox tab|finance tab|incoming tab|expense tab/i;
const APP_RE = /screen|surface|modal|card|sheet|rows? were not visible|section did not expand|detail modal did not open|home cards rendered|request groups were not visible|request groups|not visible|did not open/i;

const normalizeReasonText = (error?: unknown, issues: string[] = []) => {
  const errorText =
    error instanceof Error
      ? [error.name, error.message, error.stack ?? ""].filter(Boolean).join("\n")
      : error != null
        ? String(error)
        : "";
  return [errorText, ...issues].filter(Boolean).join("\n").trim();
};

export function classifyFailureKind(params: {
  error?: unknown;
  issues?: string[];
  fallback?: RuntimeFailureKind | null;
}): RuntimeFailureKind {
  const { error, issues = [], fallback = null } = params;
  const text = normalizeReasonText(error, issues);
  if (!text) return fallback ?? "unknown";
  if (ENVIRONMENT_RE.test(text)) return "environment";
  if (AUTH_RE.test(text)) return "auth";
  if (ROUTE_RE.test(text)) return "route";
  if (APP_RE.test(text)) return "app";
  return fallback ?? "unknown";
}

export function pickSummaryFailureKind(results: Array<{ status?: unknown; failureKind?: unknown }>): RuntimeFailureKind | null {
  for (const result of results) {
    if (result?.status === "passed" || result?.status === "residual") continue;
    const failureKind = result?.failureKind;
    if (typeof failureKind === "string") return failureKind as RuntimeFailureKind;
  }
  return null;
}
