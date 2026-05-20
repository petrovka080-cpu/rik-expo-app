import { readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live AI UI architecture: no DB writes", () => {
  it("does not call database write APIs", () => {
    const source = readLiveUiSource();
    expect(source).not.toMatch(/\.(insert|update|upsert|delete)\s*\(/);
    expect(source).not.toMatch(/\bsupabase\.[a-z]+|sql`|createClient\s*\(/i);
  });
});
