import fs from "node:fs";
import path from "node:path";

import {
  OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
  officeAuthArtifactHasSecret,
  redactOfficeAuthFixtureText,
} from "./officeRoleFixtureValidation";

describe("office auth fixture artifact redaction", () => {
  it("detects token-like or identity-like values before writing artifacts", () => {
    expect(
      officeAuthArtifactHasSecret({
        access_token:
          "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signaturevalue",
      }),
    ).toBe(true);
    expect(officeAuthArtifactHasSecret({ email: "foreman@example.test" })).toBe(true);
    expect(
      officeAuthArtifactHasSecret({
        role_match: false,
        service_role_used: false,
        secrets_printed: false,
      }),
    ).toBe(false);
  });

  it("redacts common auth values from error text and existing office auth artifacts", () => {
    const redacted = redactOfficeAuthFixtureText(
      "Authorization: Bearer secret-token foreman@example.test access_token=abc123",
    );

    expect(redacted).not.toContain("foreman@example.test");
    expect(redacted).not.toContain("secret-token");
    expect(redacted).not.toContain("abc123");

    if (!fs.existsSync(OFFICE_ROLE_FIXTURE_ARTIFACT_DIR)) return;
    for (const fileName of fs.readdirSync(OFFICE_ROLE_FIXTURE_ARTIFACT_DIR)) {
      if (!fileName.endsWith(".json")) continue;
      const filePath = path.join(OFFICE_ROLE_FIXTURE_ARTIFACT_DIR, fileName);
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
        string,
        unknown
      >;
      expect(officeAuthArtifactHasSecret(parsed)).toBe(false);
    }
  });
});
