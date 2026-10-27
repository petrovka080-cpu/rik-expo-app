import {
  WHOLE_APP_50K_PROOF_RUN_ID_ENV,
  WHOLE_APP_50K_SEED_FLAG_ENV,
} from "./50kProofFixturePolicy";
import type { WholeApp50kProofRunId } from "./50kProofFixtureTypes";

export class UnsafeProofFixtureOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeProofFixtureOperationError";
  }
}

const PROOF_RUN_ID_PATTERN = /^proof_[A-Za-z0-9][A-Za-z0-9_-]{2,}$/;

function fail(message: string): never {
  throw new UnsafeProofFixtureOperationError(message);
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stringifyPlan(plan: unknown): string {
  if (typeof plan === "string") return plan;
  try {
    return JSON.stringify(plan);
  } catch {
    return String(plan);
  }
}

function containsProofMarker(value: unknown, proofRunId: string): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    return value === proofRunId
      || value.includes(proofRunId)
      || value.startsWith(`[PROOF ${proofRunId}]`);
  }
  if (typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => containsProofMarker(entry, proofRunId));

  const record = value as Record<string, unknown>;
  if (record.proof_run_id === proofRunId) return true;
  if (containsProofMarker(record.payload, proofRunId)) return true;
  if (containsProofMarker(record.storage_key, proofRunId)) return true;
  if (containsProofMarker(record.title, proofRunId)) return true;
  if (containsProofMarker(record.name, proofRunId)) return true;
  return Object.values(record).some((entry) => containsProofMarker(entry, proofRunId));
}

export function assertProofRunId(value: string): asserts value is WholeApp50kProofRunId {
  if (!PROOF_RUN_ID_PATTERN.test(value)) {
    fail(`${WHOLE_APP_50K_PROOF_RUN_ID_ENV} must start with "proof_" and contain only letters, numbers, underscore, or dash.`);
  }
}

export function assertFixtureSeedAllowed(env: NodeJS.ProcessEnv): void {
  if (env[WHOLE_APP_50K_SEED_FLAG_ENV] !== "1") {
    fail(`${WHOLE_APP_50K_SEED_FLAG_ENV}=1 is required before any 50k synthetic fixture seed operation.`);
  }

  const proofRunId = String(env[WHOLE_APP_50K_PROOF_RUN_ID_ENV] ?? "").trim();
  assertProofRunId(proofRunId);
}

export function assertNoDestructiveSql(sql: string): void {
  const normalized = normalizeSql(sql);
  const checks: [RegExp, string][] = [
    [/\bdrop\s+table\b/, "drop table is forbidden for 50k proof fixtures."],
    [/\btruncate(?:\s+table)?\b/, "truncate is forbidden for 50k proof fixtures."],
    [/\breset\s+database\b/, "reset database is forbidden for 50k proof fixtures."],
    [/\balter\s+table\b[\s\S]*\bdisable\s+row\s+level\s+security\b/, "disabling RLS is forbidden for 50k proof fixtures."],
    [/\bdisable\s+rls\b/, "disabling RLS is forbidden for 50k proof fixtures."],
    [
      /\bcreate\s+policy\b[\s\S]*\bto\s+(?:public|authenticated)\b[\s\S]*\busing\s*\(\s*true\s*\)/,
      "broad public/authenticated policies are forbidden for 50k proof fixtures.",
    ],
  ];

  for (const [pattern, message] of checks) {
    if (pattern.test(normalized)) fail(message);
  }
}

export function assertDeleteScopedByProofRunId(sql: string): void {
  const normalized = normalizeSql(sql);
  if (!/\bdelete\s+from\b/.test(normalized)) return;

  const scoped =
    normalized.includes("proof_run_id")
    || normalized.includes("[proof")
    || normalized.includes("storage_key")
    || normalized.includes("idempotency_key")
    || normalized.includes("synthetic_fixture")
    || /(?:title|problem_text|summary|reason|name)\s+(?:i?like|=)/.test(normalized);

  if (!scoped) {
    fail("delete from statements in 50k proof fixtures must be scoped by proof_run_id or an equivalent proof marker.");
  }
}

export function assertFixtureRowHasProofMarker(row: unknown, proofRunId: string): void {
  assertProofRunId(proofRunId);
  if (!containsProofMarker(row, proofRunId)) {
    fail("Every synthetic 50k fixture row must carry proof_run_id or an equivalent proof marker.");
  }
}

export function assertNoRealUserMassCreation(plan: unknown): void {
  const source = stringifyPlan(plan).toLowerCase();
  const mentionsAuthUsers = /\bauth\.users\b/.test(source) || /"auth"\s*:\s*"users"/.test(source);
  if (!mentionsAuthUsers) return;

  const explicitLargeCount = /\b(?:50000|50_000|fifty\s*k|50k)\b/.test(source);
  const authInsert = /\binsert\s+into\s+auth\.users\b/.test(source);
  const authAdminLoop = /\bcreateuser\b/.test(source) && /\b(?:for|while|generate_series|range)\b/.test(source);
  const generateSeriesAuthUsers = /\bgenerate_series\s*\(/.test(source) && mentionsAuthUsers;
  const largeAuthUsersRequirement =
    /\bauth\.users\b[\s\S]{0,160}\b(?:50000|50_000|fifty\s*k|50k)\b/.test(source)
    || /\b(?:50000|50_000|fifty\s*k|50k)\b[\s\S]{0,160}\bauth\.users\b/.test(source);

  if ((authInsert && (explicitLargeCount || generateSeriesAuthUsers)) || authAdminLoop || largeAuthUsersRequirement) {
    fail("50k proof fixtures must not create or require 50k real auth.users.");
  }
}
