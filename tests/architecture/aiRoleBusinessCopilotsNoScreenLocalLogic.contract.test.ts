import { listAiRoleBusinessCopilotFiles, readAiRoleBusinessCopilotsSource } from "./aiRoleBusinessCopilotsArchitectureTestHelpers";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: no screen-local logic", () => {
  it("stays as pure lib workflow code, not screen components", () => {
    const files = listAiRoleBusinessCopilotFiles().map((file) => file.replace(/\\/g, "/"));
    expect(files.every((file) => file.includes("/src/lib/ai/roleBusinessCopilots/"))).toBe(true);
    expect(files.some((file) => file.endsWith(".tsx"))).toBe(false);
    expect(readAiRoleBusinessCopilotsSource()).not.toMatch(/from\s+["']react["']|<View|<Text/);
  });
});
