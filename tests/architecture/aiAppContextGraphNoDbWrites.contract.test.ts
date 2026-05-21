import { readAiAppContextGraphSource } from "./aiAppContextGraphArchitectureTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS architecture: no DB writes", () => {
  it("does not call write APIs from AI answers", () => {
    const source = readAiAppContextGraphSource();
    expect(source).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/);
    expect(source).not.toMatch(/from\s+["'][^"']*supabaseClient["']/);
    expect(source).not.toMatch(/callRateLimitedSupabaseRpc|\.rpc\s*\(/);
  });
});
