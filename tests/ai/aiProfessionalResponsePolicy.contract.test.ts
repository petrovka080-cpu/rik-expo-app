import {
  assertProfessionalResponsePolicyApplied,
  buildAiProfessionalResponsePolicyPrompt,
} from "../../src/features/ai/policy/aiProfessionalResponsePolicy";
import { buildAssistantSystemPrompt } from "../../src/features/ai/assistantPrompts";

describe("AI professional response policy", () => {
  it("defines construction response structure by role", () => {
    expect(buildAiProfessionalResponsePolicyPrompt({ role: "foreman", domain: "projects" })).toContain("object or project");
    expect(buildAiProfessionalResponsePolicyPrompt({ role: "buyer", domain: "procurement" })).toContain("price, schedule");
    expect(buildAiProfessionalResponsePolicyPrompt({ role: "accountant", domain: "finance" })).toContain("amount, debt");
    expect(buildAiProfessionalResponsePolicyPrompt({ role: "warehouse", domain: "warehouse" })).toContain("stock balance");
    expect(buildAiProfessionalResponsePolicyPrompt({ role: "contractor", domain: "subcontracts" })).toContain("own tasks");
    expect(buildAiProfessionalResponsePolicyPrompt({ role: "director", domain: "control" })).toContain("cross-domain");
  });

  it("is applied to assistant system prompts", () => {
    const prompt = buildAssistantSystemPrompt("buyer", "buyer");
    expect(assertProfessionalResponsePolicyApplied(prompt)).toBe(true);
    expect(prompt).toContain("never suggest bypassing approval");
  });
});
