import fs from "fs";
import path from "path";

import {
  buildSecurityPrivacyReport,
  writeSecurityPrivacyArtifacts,
} from "../../scripts/audit/securityPrivacyHardening.shared";
import { containsSecuritySensitiveText } from "../../src/lib/security/securityPrivacyHardening";

const repoRoot = path.resolve(__dirname, "../..");
const REQUIRED_ARTIFACTS = [
  "artifacts/S_SECURITY_PRIVACY_pii_artifacts.json",
  "artifacts/S_SECURITY_PRIVACY_public_fields.json",
  "artifacts/S_SECURITY_PRIVACY_signed_urls.json",
  "artifacts/S_SECURITY_PRIVACY_ai_sanitizer.json",
  "artifacts/S_SECURITY_PRIVACY_secrets_scan.json",
  "artifacts/S_SECURITY_PRIVACY_matrix.json",
  "artifacts/S_SECURITY_PRIVACY_proof.md",
] as const;

describe("security privacy artifacts", () => {
  it("writes Wave 10 artifacts without PII, signed URL tokens, secrets, or raw provider payloads", () => {
    writeSecurityPrivacyArtifacts(
      buildSecurityPrivacyReport({
        fullJestPassed: true,
        releaseVerifyPassed: true,
      }),
    );

    for (const artifact of REQUIRED_ARTIFACTS) {
      const fullPath = path.join(repoRoot, artifact);
      expect(fs.existsSync(fullPath)).toBe(true);
      const text = fs.readFileSync(fullPath, "utf8");
      expect(text).not.toContain("person@example.test");
      expect(text).not.toContain("+996 700 000 000");
      expect(text).not.toContain("access_token=secret");
      expect(text).not.toContain("Bearer secret");
      expect(text).not.toContain("providerPayload: {");
      expect(containsSecuritySensitiveText(text)).toBe(false);
    }

    const matrix = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "artifacts/S_SECURITY_PRIVACY_matrix.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(matrix.final_status).toBe("GREEN_SECURITY_PRIVACY_HARDENING_READY");
    expect(matrix.pii_in_artifacts_found).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
