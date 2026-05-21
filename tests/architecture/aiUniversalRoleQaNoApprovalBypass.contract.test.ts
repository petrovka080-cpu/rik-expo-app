import { readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no approval bypass", () => {
  it("does not bypass or auto-submit approval decisions", () => {
    const source = readAiUniversalRoleQaSource();
    expect(source).not.toMatch(/bypass|service_role|approvePayment|submitFinal|finalSubmit:\s*true/i);
    expect(source).not.toMatch(/autoApproval:\s*true/);
  });
});
