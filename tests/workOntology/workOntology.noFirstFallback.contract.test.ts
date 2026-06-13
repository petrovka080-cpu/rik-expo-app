import { sourceText } from "./workOntologyTestHelpers";

describe("work ontology no first fallback", () => {
  it("does not use first ontology row or random/time fallback as a resolver escape hatch", () => {
    const matcher = sourceText("src/lib/ai/workOntology/constructionWorkOntologyMatcher.ts");
    expect(matcher).not.toMatch(/CONSTRUCTION_WORK_ONTOLOGY\s*\[\s*0\s*\]/);
    expect(matcher).not.toMatch(/Math\.random/);
    expect(matcher).not.toMatch(/Date\.now/);
    expect(matcher).not.toMatch(/new Date/);
    expect(matcher).not.toMatch(/other_construction_work/);
  });
});
