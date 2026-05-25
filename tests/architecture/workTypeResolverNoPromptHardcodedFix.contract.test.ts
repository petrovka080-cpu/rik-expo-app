import fs from "node:fs";
import path from "node:path";

const resolverFiles = [
  "src/lib/ai/globalEstimate/workTypeDisambiguation.ts",
  "src/lib/ai/globalEstimate/waterproofingWorkTypeResolver.ts",
  "src/lib/ai/globalEstimate/roofingWorkTypeResolver.ts",
  "src/lib/ai/globalEstimate/workTypeResolverNegativeRules.ts",
  "src/lib/ai/globalEstimate/globalWorkTypeResolver.ts",
].map((filePath) => path.join(process.cwd(), filePath));

describe("work type resolver disambiguation architecture", () => {
  it("uses reusable surface terms instead of a single prompt-hardcoded fix", () => {
    const source = resolverFiles.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n");

    expect(source).toContain("roof_waterproofing");
    expect(source).toContain("bathroom_waterproofing");
    expect(source).toContain("foundation_waterproofing");
    expect(source).not.toContain("хочу выполнить гидроизоляцию крыши на 100 кв м");
    expect(source).not.toMatch(/100\s*(кв|м²|м2|sq)/i);
    expect(source).not.toMatch(/if\s*\([^)]*гидроизоляц[^)]*кры[а-я]*[^)]*100[^)]*\)/i);
  });
});
