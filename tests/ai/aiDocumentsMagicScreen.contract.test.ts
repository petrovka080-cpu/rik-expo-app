import { expectMagicScreen } from "./aiScreenMagicTestHelpers";

describe("AI documents magic screen", () => {
  it("summarizes document knowledge without signing, deletion or fake content", () => {
    const pack = expectMagicScreen("documents.main", "documents");

    expect(pack.screenSummary).toContain("Документ");
    expect(JSON.stringify(pack)).not.toMatch(/fake document|delete document directly|sign document directly/i);
  });
});
