import { auditAiEstimateStagingSecurityPrivacy } from "../../scripts/security/auditAiEstimateStagingSecurityPrivacy";

describe("staging security privacy", () => {
  it("keeps client keys and version secrets out of staging proof surfaces", () => {
    const { summary } = auditAiEstimateStagingSecurityPrivacy({ writeSummary: false });

    expect(summary.staging_security_privacy_audit_created).toBe(true);
    expect(summary.client_api_keys_absent).toBe(true);
    expect(summary.full_prompt_logs_absent).toBe(true);
    expect(summary.phone_email_token_leak_absent).toBe(true);
    expect(summary.version_endpoint_no_secrets).toBe(true);
    expect(summary.pdf_artifacts_not_publicly_enumerable).toBe(true);
    expect(summary.buyer_package_not_publicly_enumerable).toBe(true);
    expect(summary.cors_policy_sane).toBe(true);
    expect(summary.security_headers_checked).toBe(true);
  });
});
