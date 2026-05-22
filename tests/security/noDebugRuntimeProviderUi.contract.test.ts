import { buildAiSanitizerAudit } from "../../scripts/audit/securityPrivacyHardening.shared";

describe("debug/runtime/provider payload UI blocker", () => {
  it("keeps raw provider and runtime payloads out of user-facing AI context output", () => {
    const audit = buildAiSanitizerAudit();

    expect(audit.debug_runtime_provider_payload_visible).toBe(false);
    expect(audit.ai_context_sanitized).toBe(true);
    expect(audit.sanitizer_leaks).toEqual([]);
  });
});
