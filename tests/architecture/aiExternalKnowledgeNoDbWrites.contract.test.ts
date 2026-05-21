import { readExternalKnowledgeSource } from "./aiExternalKnowledgeArchitectureTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE architecture: no DB writes", () => {
  it("does not call insert/update/delete/upsert/rpc mutation", () => {
    expect(readExternalKnowledgeSource()).not.toMatch(/\.(insert|update|delete|upsert)\s*\(/);
    expect(readExternalKnowledgeSource()).not.toMatch(/\brpc\s*\([^)]*(approve|reject|create|update|delete|mutat|execute)/i);
  });
});
