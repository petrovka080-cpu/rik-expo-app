import { readSource, sourceFilesUnder } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("primitive BOQ no screen-local calculation", () => {
  it("keeps estimate calculation out of screens", () => {
    const screenFiles = [...sourceFilesUnder("app"), ...sourceFilesUnder("src/screens")];
    const findings = screenFiles.filter((file) => {
      const source = readSource(file);
      return /compileParametricBoqRecipe|compileProfessionalBoqFromPrimitives|calculateGlobalConstructionEstimateSync/.test(source);
    });
    expect(findings).toEqual([]);
  });
});
