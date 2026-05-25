import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: no useEffect rewrite", () => {
  it("keeps the proof out of screen message rewrite paths", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runBuiltInAi1000PostBoqCatalogProof.ts"), "utf8");

    expect(source).not.toMatch(/useEffect\s*\(\s*\(\s*\)\s*=>\s*set(?:Answer|Messages)/);
    expect(source).not.toContain("setMessages(prev => rewrite");
  });
});
