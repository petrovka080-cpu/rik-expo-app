import { universalPdfFixture } from "./universalPdfTestHelpers";

describe("universal PDF Cyrillic extraction", () => {
  it("extracts readable Cyrillic text from generated PDFs", () => {
    const { extracted } = universalPdfFixture();
    expect(extracted.text.length).toBeGreaterThan(500);
    expect(extracted.cyrillicReadable).toBe(true);
  });
});
