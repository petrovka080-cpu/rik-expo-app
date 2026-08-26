export type SupabaseClientEnvironment =
  | "local_developer"
  | "local_proof"
  | "staging"
  | "production";

export type SupabaseClientUnavailableReason =
  | "missing_public_url"
  | "invalid_public_url"
  | "missing_anon_key"
  | "invalid_anon_key"
  | "environment_mismatch";

export type SupabaseClientAvailabilityConfig =
  | {
      status: "ready";
      environment: SupabaseClientEnvironment;
      projectRef: string;
      url: string;
      anonKey: string;
    }
  | {
      status: "unavailable";
      reason: SupabaseClientUnavailableReason;
    };

type SupabaseClientAvailabilityInput = {
  publicUrl: unknown;
  anonKey: unknown;
  environmentHint?: unknown;
  localDeveloperReview?: unknown;
};

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const ENVIRONMENTS = new Set<SupabaseClientEnvironment>([
  "local_developer",
  "local_proof",
  "staging",
  "production",
]);

const text = (value: unknown): string => String(value ?? "").trim();
const truthy = (value: unknown): boolean =>
  ["1", "true", "yes", "on"].includes(text(value).toLowerCase());

function isPlausiblePublicAnonKey(value: string): boolean {
  if (value.length < 20) return false;
  if (/service[_-]?role|secret[_-]?key|private[_-]?key/i.test(value)) return false;
  return /^sb_publishable_[A-Za-z0-9_-]+$/.test(value) || /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2}$/.test(value);
}

function normalizeEnvironment(value: unknown): SupabaseClientEnvironment | null {
  const normalized = text(value).toLowerCase().replace(/-/g, "_");
  return ENVIRONMENTS.has(normalized as SupabaseClientEnvironment)
    ? (normalized as SupabaseClientEnvironment)
    : null;
}

export function resolveSupabaseClientAvailabilityConfig(
  input: SupabaseClientAvailabilityInput,
): SupabaseClientAvailabilityConfig {
  const rawUrl = text(input.publicUrl);
  if (!rawUrl) return { status: "unavailable", reason: "missing_public_url" };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { status: "unavailable", reason: "invalid_public_url" };
  }
  if (!/^https?:$/i.test(url.protocol) || !url.hostname) {
    return { status: "unavailable", reason: "invalid_public_url" };
  }

  const anonKey = text(input.anonKey);
  if (!anonKey) return { status: "unavailable", reason: "missing_anon_key" };
  if (!isPlausiblePublicAnonKey(anonKey)) {
    return { status: "unavailable", reason: "invalid_anon_key" };
  }

  const loopback = LOOPBACK_HOSTS.has(url.hostname.toLowerCase());
  const explicitEnvironment = normalizeEnvironment(input.environmentHint);
  const environment = truthy(input.localDeveloperReview)
    ? "local_developer"
    : explicitEnvironment ?? (loopback ? "local_proof" : "staging");
  const localEnvironment = environment === "local_developer" || environment === "local_proof";
  if ((localEnvironment && !loopback) || (!localEnvironment && loopback)) {
    return { status: "unavailable", reason: "environment_mismatch" };
  }
  if (environment === "production" && url.protocol !== "https:") {
    return { status: "unavailable", reason: "environment_mismatch" };
  }

  // Supabase JS derives its default auth-storage key from the first hostname
  // segment. Keep the same identity for loopback (`sb-127-auth-token`) so the
  // recovery diagnostics and the actual GoTrue client inspect one session.
  const projectRef = url.hostname.split(".")[0] || "unknown";
  return {
    status: "ready",
    environment,
    projectRef,
    url: url.toString().replace(/\/$/, ""),
    anonKey,
  };
}

export function buildSupabaseUnavailableDiagnostic(
  reason: SupabaseClientUnavailableReason,
): string {
  return JSON.stringify({
    status: "unavailable",
    reason,
    recovery: "scripts/dev/startLocalDeveloperReview.ps1",
    secretsIncluded: false,
  });
}
