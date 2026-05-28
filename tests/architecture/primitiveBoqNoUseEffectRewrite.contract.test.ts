import { readSource, sourceFilesUnder } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("primitive BOQ no useEffect rewrite", () => {
  it("does not add hooks to primitive compiler runtime paths", () => {
    const files = [
      ...sourceFilesUnder("src/lib/ai/constructionPrimitives"),
      ...sourceFilesUnder("src/lib/ai/professionalBoq"),
      ...sourceFilesUnder("src/lib/ai/constructionFormulas"),
    ];
    expect(files.filter((file) => /\buseEffect\b/.test(readSource(file)))).toEqual([]);
  });
});
