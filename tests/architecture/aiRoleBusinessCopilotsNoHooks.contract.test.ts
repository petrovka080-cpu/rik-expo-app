import { readAiRoleBusinessCopilotsSource } from "./aiRoleBusinessCopilotsArchitectureTestHelpers";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: no hooks", () => {
  it("does not add AI hooks in workflow layer", () => {
    expect(readAiRoleBusinessCopilotsSource()).not.toMatch(/function\s+use[A-Z]|const\s+use[A-Z]\w+\s*=/);
  });
});
