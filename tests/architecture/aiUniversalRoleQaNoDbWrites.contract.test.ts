import { readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no DB writes", () => {
  it("does not call database write APIs", () => {
    const source = readAiUniversalRoleQaSource();
    expect(source).not.toMatch(/supabase|postgres|pg\./i);
    expect(source).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\brpc\s*\(/);
  });
});
