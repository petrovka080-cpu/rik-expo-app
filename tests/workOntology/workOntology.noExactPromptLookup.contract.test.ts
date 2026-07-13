import { sourceText } from "./workOntologyTestHelpers";

describe("work ontology no exact prompt lookup", () => {
  it("keeps resolver free of prompt-fixture lookup tables", () => {
    const matcher = sourceText("src/lib/ai/workOntology/constructionWorkOntologyMatcher.ts");
    expect(matcher).not.toMatch(/REAL_WORK_ONTOLOGY_10000_CASES/);
    expect(matcher).not.toMatch(/user_input_ru/);
    expect(matcher).not.toMatch(/expected_canonical_work_key/);
    expect(matcher).not.toMatch(/Map<\s*string\s*,\s*RealWorkOntologyCase/);
  });
});
