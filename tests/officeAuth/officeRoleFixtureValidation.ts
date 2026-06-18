import fs from "node:fs";
import path from "node:path";

import type {
  AppliedOfficeTestAuthContext,
  OfficeTestRole,
} from "../../src/lib/officeAuthTest/officeRoleTestHarness";

export type OfficeRoleFixtureRole = Extract<
  OfficeTestRole,
  "foreman" | "director" | "buyer"
>;

export type RedactedAppliedOfficeAuthContext = {
  role: OfficeRoleFixtureRole;
  auth_source: "separate_role" | "developer_control";
  role_mode: "separate_roles" | "developer_control_full_access";
  storage_key_present: boolean;
  user_id_present_redacted: boolean;
  developer_override_attempted: boolean;
  developer_override_applied: boolean;
  developer_override_failed: boolean;
  developer_override_failure_code: string | null;
  fallback_to_separate_role: boolean;
};

export type OfficeRoleFixtureValidationRecord = {
  role: OfficeRoleFixtureRole;
  route: string;
  marker_test_id: string;
  final_path: string | null;
  storage_state_path_allowed: boolean;
  storage_state_written: boolean;
  auth_context_applied: boolean;
  route_loaded: boolean;
  expected_role_marker_visible: boolean;
  wrong_role_marker_visible: boolean;
  role_guard_blocked: boolean;
  auth_unauthenticated_visible: boolean;
  auth_degraded_visible: boolean;
  auth_loading_visible: boolean;
  role_match: boolean;
  blocker_code: string | null;
  auth_context: RedactedAppliedOfficeAuthContext | null;
  runtime_probe: {
    authenticated: boolean;
    expected_role: OfficeRoleFixtureRole;
    resolved_role: OfficeRoleFixtureRole | null;
    auth_ready: boolean;
    membership_valid: boolean;
  };
};

export const OFFICE_ROLE_FIXTURE_ROLES = [
  "foreman",
  "director",
  "buyer",
] as const satisfies readonly OfficeRoleFixtureRole[];

export const OFFICE_ROLE_FIXTURE_ARTIFACT_SLUG =
  "S_OFFICE_E2E_ROLE_PROVISIONING_AND_RUNTIME_RBAC";

export const OFFICE_ROLE_FIXTURE_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  OFFICE_ROLE_FIXTURE_ARTIFACT_SLUG,
);

export const OFFICE_ROLE_LEGACY_FIXTURES_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_OFFICE_E2E_ROLE_FIXTURES_FAST_REPAIR",
);

export const OFFICE_ROLE_AUTH_CONTEXT_ARTIFACT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "S_OFFICE_ROLE_AUTH_CONTEXT_FAST_REPAIR",
);

export const OFFICE_ROLE_STORAGE_STATE_DIRS = [
  ".playwright/.auth",
  "test-results/.auth",
  "tmp/.auth",
] as const;

const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const JWT_DETECT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const EMAIL_DETECT_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const FORBIDDEN_SECRET_PATTERN =
  /(?:\bAuthorization\s*:\s*(?:Bearer\s+)?[^\s"'<>]+|\bBearer\s+[A-Za-z0-9._~+/-]{8,}|\b(access_token|refresh_token|id_token|password|supabase_service_role_key|apikey|api_key|jwt|cookie)\b\s*[:=]\s*["']?[^"',}\s]+)/i;

function isInsideDirectory(candidate: string, directory: string): boolean {
  const relative = path.relative(directory, candidate);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function officeRoleRoute(role: OfficeRoleFixtureRole): string {
  return `/office/${role}`;
}

export function officeRoleMarkerTestId(role: OfficeRoleFixtureRole): string {
  return `office-runtime-context-${role}`;
}

export function officeRoleStorageStatePath(
  role: OfficeRoleFixtureRole,
  projectRoot = process.cwd(),
  relativeDir: (typeof OFFICE_ROLE_STORAGE_STATE_DIRS)[number] = ".playwright/.auth",
): string {
  return path.join(projectRoot, relativeDir, `${role}.json`);
}

export function isAllowedOfficeRoleStorageStatePath(
  filePath: string,
  projectRoot = process.cwd(),
): boolean {
  const resolved = path.resolve(filePath);
  const allowedDirectory = OFFICE_ROLE_STORAGE_STATE_DIRS.some((relativeDir) =>
    isInsideDirectory(resolved, path.resolve(projectRoot, relativeDir)),
  );
  return allowedDirectory && path.basename(resolved).endsWith(".json");
}

export function redactOfficeAuthFixtureText(value: unknown): string {
  const raw =
    value && typeof value === "object"
      ? JSON.stringify(value)
      : String(value ?? "");
  return raw
    .replace(JWT_PATTERN, "<redacted-jwt>")
    .replace(EMAIL_PATTERN, "<redacted-email>")
    .replace(/\bAuthorization\s*:\s*(?:Bearer\s+)?[^\s"'<>]+/gi, "Authorization: <redacted>")
    .replace(/\b(access_token|refresh_token|id_token|password|apikey|api_key)\b\s*[:=]\s*["']?[^"',}\s]+/gi, "$1=<redacted>")
    .replace(/\s+/g, " ")
    .trim();
}

export function officeAuthArtifactHasSecret(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  if (!serialized) return false;
  return (
    JWT_DETECT_PATTERN.test(serialized) ||
    EMAIL_DETECT_PATTERN.test(serialized) ||
    FORBIDDEN_SECRET_PATTERN.test(serialized)
  );
}

export function redactAppliedOfficeAuthContext(
  applied: AppliedOfficeTestAuthContext,
): RedactedAppliedOfficeAuthContext {
  return {
    role: applied.role as OfficeRoleFixtureRole,
    auth_source: applied.authSource,
    role_mode: applied.roleMode,
    storage_key_present: applied.storageKey.length > 0,
    user_id_present_redacted: applied.userId.length > 0,
    developer_override_attempted: applied.developerOverrideAttempted,
    developer_override_applied: applied.developerOverrideApplied,
    developer_override_failed: applied.developerOverrideFailed,
    developer_override_failure_code: applied.developerOverrideFailureCode,
    fallback_to_separate_role: applied.fallbackToSeparateRole,
  };
}

export function buildEmptyOfficeRoleFixtureValidation(
  role: OfficeRoleFixtureRole,
  storageStatePath = officeRoleStorageStatePath(role),
): OfficeRoleFixtureValidationRecord {
  return {
    role,
    route: officeRoleRoute(role),
    marker_test_id: officeRoleMarkerTestId(role),
    final_path: null,
    storage_state_path_allowed:
      isAllowedOfficeRoleStorageStatePath(storageStatePath),
    storage_state_written: false,
    auth_context_applied: false,
    route_loaded: false,
    expected_role_marker_visible: false,
    wrong_role_marker_visible: false,
    role_guard_blocked: false,
    auth_unauthenticated_visible: false,
    auth_degraded_visible: false,
    auth_loading_visible: false,
    role_match: false,
    blocker_code: null,
    auth_context: null,
    runtime_probe: {
      authenticated: false,
      expected_role: role,
      resolved_role: null,
      auth_ready: false,
      membership_valid: false,
    },
  };
}

export function writeOfficeAuthArtifact(
  fileName: string,
  value: Record<string, unknown>,
  artifactDir = OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
): string {
  if (officeAuthArtifactHasSecret(value)) {
    throw new Error(`OFFICE_AUTH_ARTIFACT_SECRET_DETECTED: ${fileName}`);
  }
  fs.mkdirSync(artifactDir, { recursive: true });
  const filePath = path.join(artifactDir, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}
