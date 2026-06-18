import fs from "node:fs";
import path from "node:path";

import {
  OFFICE_ROLE_FIXTURE_ARTIFACT_DIR,
  officeAuthArtifactHasSecret,
} from "./officeRoleFixtureValidation";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("office provisioning artifact redaction contract", () => {
  it("keeps provisioning logs and artifacts free of credentials", () => {
    const source = read("scripts/e2e/provisionOfficeRoleActors.ts");

    expect(source).toContain("redactOfficeAuthFixtureText");
    expect(source).toContain("writeOfficeAuthArtifact");
    expect(source).toContain("secrets_printed: false");
    expect(source).not.toMatch(/console\.(log|error)\([^)]*(password|access_token|refresh_token|SUPABASE_SERVICE_ROLE_KEY|actor\.email|actor\.password)/i);

    if (!fs.existsSync(OFFICE_ROLE_FIXTURE_ARTIFACT_DIR)) return;
    for (const fileName of fs.readdirSync(OFFICE_ROLE_FIXTURE_ARTIFACT_DIR)) {
      if (!fileName.endsWith(".json")) continue;
      const parsed = JSON.parse(
        fs.readFileSync(path.join(OFFICE_ROLE_FIXTURE_ARTIFACT_DIR, fileName), "utf8"),
      ) as Record<string, unknown>;
      expect(officeAuthArtifactHasSecret(parsed)).toBe(false);
    }
  });
});
