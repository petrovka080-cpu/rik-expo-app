import { listAiUniversalRoleQaFiles, readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no hooks", () => {
  it("keeps the orchestrator as pure services/adapters", () => {
    const source = readAiUniversalRoleQaSource();
    expect(listAiUniversalRoleQaFiles().some((file) => file.includes("/hooks/"))).toBe(false);
    expect(source).not.toMatch(/from ["']react["']/);
    expect(source).not.toMatch(/\buse(State|Memo|Callback|Reducer|Ref)\b/);
  });
});
