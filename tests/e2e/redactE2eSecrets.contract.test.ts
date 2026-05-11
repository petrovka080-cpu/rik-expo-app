import { collectExplicitE2eSecrets, redactE2eSecrets } from "../../scripts/e2e/redactE2eSecrets";

describe("redactE2eSecrets", () => {
  it("masks explicit role emails, passwords, JWTs, auth headers, Supabase keys, and tokenized URLs", () => {
    const text = [
      "director@example.test",
      "director-password",
      "Authorization: Bearer eyJabc.def.ghi",
      "SUPABASE_SERVICE_ROLE_KEY=service-secret",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-secret",
      "https://example.test/path?token=raw-token",
      "E2E_DIRECTOR_PASSWORD=director-password",
    ].join("\n");

    const redacted = redactE2eSecrets(text, ["director@example.test", "director-password"]);

    expect(redacted).not.toContain("director@example.test");
    expect(redacted).not.toContain("director-password");
    expect(redacted).not.toContain("eyJabc.def.ghi");
    expect(redacted).not.toContain("service-secret");
    expect(redacted).not.toContain("anon-secret");
    expect(redacted).not.toContain("raw-token");
    expect(redacted).toContain("<redacted>");
  });

  it("collects explicit E2E secret values from process-style env without key names", () => {
    const secrets = collectExplicitE2eSecrets({
      NODE_ENV: "test",
      E2E_DIRECTOR_EMAIL: "director@example.test",
      E2E_DIRECTOR_PASSWORD: "director-password",
      E2E_FOREMAN_EMAIL: "",
    });

    expect(secrets).toEqual(["director@example.test", "director-password"]);
  });
});
