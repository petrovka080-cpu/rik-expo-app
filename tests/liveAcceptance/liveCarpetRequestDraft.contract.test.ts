import { buildCarpetRequestDraftAndPdf, CARPET_REQUEST_CASE, FORBIDDEN_GENERIC_ROW_PATTERNS } from "./liveAiEstimatePdfRealityTestHelpers";

describe("live carpet request draft acceptance", () => {
  it("creates a carpet-specific request draft and readable PDF", () => {
    const { aiDraft, validation } = buildCarpetRequestDraftAndPdf();
    const rowText = aiDraft.items.map((item) => item.titleRu).join("\n").toLocaleLowerCase("ru-RU");

    for (const token of CARPET_REQUEST_CASE.expectedTokens) {
      expect(rowText).toContain(token.toLocaleLowerCase("ru-RU"));
    }
    for (const pattern of FORBIDDEN_GENERIC_ROW_PATTERNS) {
      expect(rowText).not.toMatch(pattern);
    }
    expect(validation.valid).toBe(true);
    expect(validation.text).toContain("Ковролин");
  });
});
