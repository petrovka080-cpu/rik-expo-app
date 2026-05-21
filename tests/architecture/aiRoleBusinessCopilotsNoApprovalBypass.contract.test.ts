import { readAiRoleBusinessCopilotsSource } from "./aiRoleBusinessCopilotsArchitectureTestHelpers";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: no approval bypass", () => {
  it("keeps final submit and auto approval impossible in workflow answers", () => {
    const source = readAiRoleBusinessCopilotsSource();
    expect(source).not.toMatch(/autoApproval:\s*true|finalSubmit:\s*true|dangerousMutation:\s*true/);
    expect(source).not.toMatch(/\.(approve|reject|postPayment|issueStock|closeWork|publishProduct)\s*\(/);
  });
});
