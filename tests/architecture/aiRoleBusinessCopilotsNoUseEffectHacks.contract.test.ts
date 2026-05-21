import { readAiRoleBusinessCopilotsSource } from "./aiRoleBusinessCopilotsArchitectureTestHelpers";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: no useEffect hacks", () => {
  it("does not fetch workflow answers from useEffect", () => {
    expect(readAiRoleBusinessCopilotsSource()).not.toMatch(/useEffect\s*\(/);
  });
});
