import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ PDF payload", () => {
  it("includes final request draft items in PDF payloads", async () => {
    const { matrix, pdfPayloads } = await getAi1000PostBoqArtifacts();

    expect(matrix.pdf_payload_includes_final_items).toBe(true);
    expect(pdfPayloads.pdf_payload_includes_final_items).toBe(true);
  });
});
