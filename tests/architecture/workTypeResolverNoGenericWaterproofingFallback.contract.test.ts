import fs from "node:fs";
import path from "node:path";

describe("work type resolver waterproofing fallback", () => {
  it("does not keep generic waterproofing mapped to bathroom as the default fallback", () => {
    const resolver = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/globalWorkTypeResolver.ts"), "utf8");
    const waterproofingResolver = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/globalEstimate/waterproofingWorkTypeResolver.ts"), "utf8");

    expect(resolver).not.toMatch(/waterproof\|гидроизоля[^,\n]+bathroom_waterproofing/i);
    expect(resolver).not.toMatch(/гидроизоля[^,\n]+waterproofing_bathroom/i);
    expect(waterproofingResolver).toContain("return null");
    expect(waterproofingResolver).not.toMatch(/generic[\s\S]{0,160}bathroom_waterproofing/i);
  });
});
