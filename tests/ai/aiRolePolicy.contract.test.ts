import {
  AI_DOMAINS,
  canUseAiCapability,
  getAllowedAiCapabilitiesForRole,
  getAllowedAiDomainsForRole,
} from "../../src/features/ai/policy/aiRolePolicy";

describe("AI role policy", () => {
  it("gives director and control full domain access without silent execution", () => {
    expect(getAllowedAiDomainsForRole("director")).toEqual([...AI_DOMAINS]);
    expect(getAllowedAiDomainsForRole("control")).toEqual([...AI_DOMAINS]);
    expect(getAllowedAiCapabilitiesForRole("director", "finance")).toContain("approve_action");
    expect(canUseAiCapability({
      role: "director",
      domain: "finance",
      capability: "execute_approved_action",
    })).toBe(false);
    expect(canUseAiCapability({
      role: "director",
      domain: "finance",
      capability: "execute_approved_action",
      viaApprovalGate: true,
    })).toBe(true);
  });

  it("scopes non-director roles and denies unknown", () => {
    expect(getAllowedAiDomainsForRole("foreman")).not.toContain("finance");
    expect(getAllowedAiDomainsForRole("buyer")).not.toContain("finance");
    expect(getAllowedAiDomainsForRole("accountant")).toContain("finance");
    expect(canUseAiCapability({ role: "accountant", domain: "procurement", capability: "approve_action" })).toBe(false);
    expect(getAllowedAiDomainsForRole("warehouse")).not.toContain("finance");
    expect(getAllowedAiDomainsForRole("contractor")).toEqual(["subcontracts", "documents", "reports", "chat"]);
    expect(getAllowedAiDomainsForRole("unknown")).toEqual([]);
  });
});
