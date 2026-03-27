export type RuntimeFailureKind = "environment" | "auth" | "route" | "app" | "unknown";

function normalizeIssueText(parts: unknown[]): string {
  return parts
    .flatMap((value) => {
      if (value == null) return [];
      if (Array.isArray(value)) return value;
      if (value instanceof Error) return [value.message, value.stack ?? ""];
      if (typeof value === "object") return [JSON.stringify(value)];
      return [String(value)];
    })
    .join(" ")
    .toLowerCase();
}

export function classifyFailureKind(params: {
  error?: unknown;
  issues?: unknown[];
  fallback?: RuntimeFailureKind | null;
}): RuntimeFailureKind {
  const text = normalizeIssueText([params.error, params.issues ?? []]);

  if (!text.trim()) {
    return params.fallback ?? "unknown";
  }

  if (
    /weakref|render error|call stack|referenceerror|development build encountered the following error/.test(text)
  ) {
    return "app";
  }

  if (
    /adb|device.*not.*detected|no android emulator|google play services|gms|anr|launcher|dev client|expo-development-client|blank surface|uiautomator|reverse tcp|timed out|econnrefused|manifest_ready|node_modules\\expo|dev menu/.test(
      text,
    )
  ) {
    return "environment";
  }

  if (
    /login|email|password|unauthorized|auth|sign in|sign-in|activation screen persisted|otp|session/.test(text)
  ) {
    return "auth";
  }

  if (/route|deeplink|deep link|did not settle|screen did not open|protected route|tab did not open|redirect/.test(text)) {
    return "route";
  }

  if (
    /login|email|password|unauthorized|auth|sign in|sign-in|РІРѕР№С‚Рё|РїР°СЂРѕР»СЊ|activation screen persisted|otp|session/.test(
      text,
    )
  ) {
    return "auth";
  }

  if (/modal|card|surface|render|screen|request groups|queue|sheet|reports|finance|contractor|foreman/.test(text)) {
    return "app";
  }

  return params.fallback ?? "unknown";
}

export function pickSummaryFailureKind(
  platformResults: Array<{ status?: unknown; failureKind?: unknown }>,
): RuntimeFailureKind | null {
  const failed = platformResults.find((entry) => entry.status === "failed");
  if (!failed) return null;
  const candidate = failed.failureKind;
  if (
    candidate === "environment" ||
    candidate === "auth" ||
    candidate === "route" ||
    candidate === "app" ||
    candidate === "unknown"
  ) {
    return candidate;
  }
  return null;
}
