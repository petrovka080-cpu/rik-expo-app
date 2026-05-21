import { readAiRoleBusinessCopilotsSource } from "./aiRoleBusinessCopilotsArchitectureTestHelpers";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: no DB writes", () => {
  it("does not call write-oriented database APIs", () => {
    expect(readAiRoleBusinessCopilotsSource()).not.toMatch(/\.(insert|update|delete|upsert)\s*\(|\brpc\s*\(/);
  });
});
