import { buildSecretsFrontendAudit } from "../../scripts/audit/securityPrivacyHardening.shared";

describe("frontend secret scanner", () => {
  it("does not expose service role, Auth Admin, or raw secrets in app/frontend code", () => {
    const audit = buildSecretsFrontendAudit();

    expect(audit.secrets_in_frontend_found).toBe(false);
    expect(audit.service_role_frontend_found).toBe(false);
    expect(audit.findings).toEqual([]);
    expect(audit.source_files_scanned).toBeGreaterThan(0);
  });
});
