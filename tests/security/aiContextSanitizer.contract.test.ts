import {
  buildAiSanitizerPrivacyProbe,
  containsSecuritySensitiveText,
} from "../../src/lib/security/securityPrivacyHardening";
import { buildAiSanitizerAudit } from "../../scripts/audit/securityPrivacyHardening.shared";

describe("AI context sanitizer privacy", () => {
  it("removes sourceRef, storage keys, raw DB rows, provider payload, and runtime debug tokens", () => {
    const probe = buildAiSanitizerPrivacyProbe();
    const audit = buildAiSanitizerAudit();
    const serialized = JSON.stringify(probe.sanitizedBundle);

    expect(probe.ai_context_sanitized).toBe(true);
    expect(probe.leaks).toEqual([]);
    expect(serialized).not.toContain("providerPayload");
    expect(serialized).not.toContain("rawDbRows");
    expect(serialized).not.toContain("storageKey");
    expect(serialized).not.toContain("sourceRef=");
    expect(serialized).not.toContain("sourceRef:");
    expect(serialized).not.toContain("mediaAssetId");
    expect(serialized).not.toContain("runtime_debug");
    expect(containsSecuritySensitiveText(serialized)).toBe(false);
    expect(audit.ai_context_sanitized).toBe(true);
  });
});
