import { readSource, sourceFilesUnder } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("primitive BOQ no exact prompt lookup", () => {
  it("does not hard-code full prompts in production primitive compiler paths", () => {
    const files = [
      ...sourceFilesUnder("src/lib/ai/constructionPrimitives"),
      ...sourceFilesUnder("src/lib/ai/professionalBoq"),
      ...sourceFilesUnder("src/lib/ai/worldConstructionInterpreter"),
      ...sourceFilesUnder("src/lib/ai/constructionFormulas"),
    ].filter((file) => !file.includes("/fixtures/"));
    const findings: string[] = [];
    for (const file of files) {
      const source = readSource(file);
      const patterns = [
        /prompt\s*={2,3}\s*["'`]/,
        /\.includes\(\s*["'`][^"'`]*(?:брусчатки на 587|металлический навес на площади 647|двухскатной крыши высота конька)/i,
        /case\s+["'`][^"'`]*(?:смета на укладку брусчатки|металлический навес|линолеум)/i,
      ];
      for (const pattern of patterns) {
        if (pattern.test(source)) findings.push(`${file}:${pattern.source}`);
      }
    }
    expect(findings).toEqual([]);
  });
});
