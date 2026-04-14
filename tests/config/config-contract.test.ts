/**
 * Config / environment contract tests.
 *
 * WAVE Q: Validates the env contract is correctly structured
 * and validation functions work predictably.
 *
 * These tests catch configuration regressions — if someone removes
 * or renames an env var normalization path, CI breaks immediately.
 */

import {
  normalizeSupabaseUrl,
  isClientSupabaseEnvValid,
  SUPABASE_PROJECT_REF,
} from "../../src/lib/env/clientSupabaseEnv";

import {
  resolvePdfRpcRolloutMode,
  getPdfRpcRolloutSnapshot,
  resetPdfRpcRolloutSessionState,
} from "../../src/lib/documents/pdfRpcRollout";

describe("config contract — clientSupabaseEnv", () => {
  it("SUPABASE_PROJECT_REF is a non-empty string", () => {
    expect(typeof SUPABASE_PROJECT_REF).toBe("string");
    expect(SUPABASE_PROJECT_REF.length).toBeGreaterThan(5);
  });

  it("normalizeSupabaseUrl handles valid URL", () => {
    const result = normalizeSupabaseUrl("https://abc.supabase.co/");
    // URL.toString() preserves the origin slash
    expect(result).toMatch(/^https:\/\/abc\.supabase\.co/);
    expect(result).not.toMatch(/\/\/$/); // no double trailing slashes
  });

  it("normalizeSupabaseUrl strips extra trailing slashes", () => {
    const result = normalizeSupabaseUrl("https://abc.supabase.co///");
    // Multiple trailing slashes reduced to at most the origin slash
    expect(result).not.toMatch(/\/\/\//);
  });

  it("normalizeSupabaseUrl returns empty for empty input", () => {
    expect(normalizeSupabaseUrl("")).toBe("");
  });

  it("isClientSupabaseEnvValid is callable", () => {
    // In test env, env vars may not be set — this just proves the function exists
    expect(typeof isClientSupabaseEnvValid).toBe("function");
    const result = isClientSupabaseEnvValid();
    expect(typeof result).toBe("boolean");
  });
});

describe("config contract — pdfRpcRollout modes", () => {
  it("resolves 'true' variants to force_on", () => {
    for (const v of ["1", "true", "on", "enabled", "yes", "TRUE", "Yes"]) {
      expect(resolvePdfRpcRolloutMode(v)).toBe("force_on");
    }
  });

  it("resolves 'false' variants to force_off", () => {
    for (const v of ["0", "false", "off", "disabled", "no", "FALSE", "No"]) {
      expect(resolvePdfRpcRolloutMode(v)).toBe("force_off");
    }
  });

  it("resolves unknown values to auto", () => {
    for (const v of ["", "maybe", "auto", "  "]) {
      expect(resolvePdfRpcRolloutMode(v)).toBe("auto");
    }
  });

  it("handles null/undefined gracefully", () => {
    expect(resolvePdfRpcRolloutMode(null as unknown as string)).toBe("auto");
    expect(resolvePdfRpcRolloutMode(undefined as unknown as string)).toBe("auto");
  });
});

describe("config contract — pdfRpcRollout state", () => {
  it("snapshot returns all 8 rollout descriptors", () => {
    const snapshot = getPdfRpcRolloutSnapshot();
    expect(snapshot).toHaveLength(8);
    for (const item of snapshot) {
      expect(item.id).toBeTruthy();
      expect(item.envVar).toContain("EXPO_PUBLIC_");
      expect(item.rpcFunction).toContain("pdf_");
      expect(item.migrationFile).toContain("db/");
    }
  });

  it("resetPdfRpcRolloutSessionState is callable and returns snapshot", () => {
    const result = resetPdfRpcRolloutSessionState();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(8);
    for (const item of result) {
      expect(item.availability).toBe("unknown");
    }
  });

  it("each rollout has unique envVar", () => {
    const snapshot = getPdfRpcRolloutSnapshot();
    const envVars = snapshot.map((s) => s.envVar);
    expect(new Set(envVars).size).toBe(envVars.length);
  });

  it("each rollout has unique rpcFunction", () => {
    const snapshot = getPdfRpcRolloutSnapshot();
    const funcs = snapshot.map((s) => s.rpcFunction);
    expect(new Set(funcs).size).toBe(funcs.length);
  });
});
