import { redactReleaseOutput } from "../../scripts/release/redactReleaseOutput";

describe("release output redaction", () => {
  it("redacts Expo, Apple, Supabase, JWT, auth, email, and signed URL material", () => {
    const raw = [
      "EXPO_TOKEN=expo-secret",
      "EXPO_APPLE_ID=owner@example.com",
      "EXPO_APPLE_APP_SPECIFIC_PASSWORD=apple-secret",
      "SUPABASE_SERVICE_ROLE_KEY=service-secret",
      "Authorization: Bearer eyJabc.def.ghi",
      "https://example.com/build.ipa?X-Goog-Signature=signature-secret",
      "person@example.com",
    ].join("\n");

    const redacted = redactReleaseOutput(raw, ["expo-secret", "apple-secret", "service-secret"]);

    expect(redacted).not.toContain("expo-secret");
    expect(redacted).not.toContain("apple-secret");
    expect(redacted).not.toContain("service-secret");
    expect(redacted).not.toContain("person@example.com");
    expect(redacted).toContain("<redacted>");
    expect(redacted).toContain("<redacted-email>");
    expect(redacted).toContain("Authorization: <redacted>");
  });
});
