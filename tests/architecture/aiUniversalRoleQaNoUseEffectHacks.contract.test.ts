import { readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no useEffect hacks", () => {
  it("does not introduce useEffect or timer hacks", () => {
    const source = readAiUniversalRoleQaSource();
    expect(source).not.toMatch(/\buseEffect\b/);
    expect(source).not.toMatch(/\bsetTimeout\s*\(/);
    expect(source).not.toMatch(/\bsetInterval\s*\(/);
  });
});
