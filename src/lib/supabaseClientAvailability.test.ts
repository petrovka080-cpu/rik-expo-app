import {
  buildSupabaseUnavailableDiagnostic,
  resolveSupabaseClientAvailabilityConfig,
} from "./supabaseClientAvailability";

const PUBLIC_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.signature";

describe("Supabase client availability", () => {
  it.each([
    [{ publicUrl: "", anonKey: PUBLIC_KEY }, "missing_public_url"],
    [{ publicUrl: "not-a-url", anonKey: PUBLIC_KEY }, "invalid_public_url"],
    [{ publicUrl: "http://127.0.0.1:54321", anonKey: "" }, "missing_anon_key"],
    [
      { publicUrl: "http://127.0.0.1:54321", anonKey: "service_role_secret" },
      "invalid_anon_key",
    ],
  ])("fails closed without secret material: %s", (input, reason) => {
    expect(resolveSupabaseClientAvailabilityConfig(input)).toEqual({
      status: "unavailable",
      reason,
    });
  });

  it("accepts an explicit local developer environment and matches the SDK storage ref", () => {
    expect(
      resolveSupabaseClientAvailabilityConfig({
        publicUrl: "http://127.0.0.1:54321",
        anonKey: PUBLIC_KEY,
        localDeveloperReview: "1",
      }),
    ).toEqual({
      status: "ready",
      environment: "local_developer",
      projectRef: "127",
      url: "http://127.0.0.1:54321",
      anonKey: PUBLIC_KEY,
    });
  });

  it.each([
    ["production", "http://127.0.0.1:54321"],
    ["local_developer", "https://project.supabase.co"],
  ])("rejects %s environment mismatch", (environmentHint, publicUrl) => {
    expect(
      resolveSupabaseClientAvailabilityConfig({
        publicUrl,
        anonKey: PUBLIC_KEY,
        environmentHint,
      }),
    ).toEqual({ status: "unavailable", reason: "environment_mismatch" });
  });

  it("emits a bounded diagnostic with no URL, key or token", () => {
    const diagnostic = buildSupabaseUnavailableDiagnostic("missing_anon_key");
    expect(JSON.parse(diagnostic)).toEqual({
      status: "unavailable",
      reason: "missing_anon_key",
      recovery: "scripts/dev/startLocalDeveloperReview.ps1",
      secretsIncluded: false,
    });
    expect(diagnostic).not.toMatch(/https?:|eyJ|token/i);
  });
});
