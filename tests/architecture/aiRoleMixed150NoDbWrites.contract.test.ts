import { readAiRoleMixed150LayerFiles } from "./aiRoleMixed150ArchitectureTestHelpers";

describe("S_AI_ROLE_MIXED_150 architecture: no DB writes", () => {
  it("does not contain write operations in the answer path", () => {
    const findings = readAiRoleMixed150LayerFiles().filter((file) =>
      /\.(insert|update|delete|upsert)\s*\(/.test(file.content) || /\.rpc\s*\(\s*["'][^"']*(?:write|create|approve|reject|close|sign|publish)/i.test(file.content),
    );
    expect(findings.map((item) => item.file)).toEqual([]);
  });
});
