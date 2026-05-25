import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ product search governance", () => {
  it("does not claim fake stock, supplier, or availability", async () => {
    const { matrix, transcripts } = await getAi1000PostBoqArtifacts();

    expect(matrix.fake_stock_found).toBe(false);
    expect(matrix.fake_supplier_found).toBe(false);
    expect(matrix.fake_availability_found).toBe(false);
    expect(
      transcripts.some(
        (trace) =>
          trace.invented_stock_found || trace.invented_supplier_found || trace.invented_availability_found,
      ),
    ).toBe(false);
  });
});
