import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material barcode-first recognition", () => {
  it("returns the exact barcode candidate first", () => {
    const fixture = createReadyScanFixture();

    expect(fixture.recognition.candidates).toHaveLength(1);
    expect(fixture.recognition.candidates[0]).toMatchObject({
      source: "EXACT_BARCODE",
      barcode: "4860000000111",
      visibleName: "Ceresit CM 11",
    });
  });
});
