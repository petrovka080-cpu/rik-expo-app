import { readSource, sourceFilesUnder } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("primitive BOQ no inline screen rows", () => {
  it("keeps BOQ rows in compiler modules, not UI screens", () => {
    const screenFiles = [...sourceFilesUnder("app"), ...sourceFilesUnder("src/screens")];
    const findings = screenFiles.filter((file) => {
      const source = readSource(file);
      return /nameRu\s*:|sectionType\s*:\s*["'`](materials|labor|equipment|delivery)/.test(source);
    });
    expect(findings).toEqual([]);
  });
});
