import { buildPhotoMaterialParityMarkerFromState } from "../../src/lib/ai/photoMaterialExistingRow";
import { bindHistoryAndPdf, confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material UI/history/PDF parity", () => {
  it("uses the same created revision for UI, history, and PDF", () => {
    const { result } = confirmFixture();
    const state = bindHistoryAndPdf(result.state);
    const marker = buildPhotoMaterialParityMarkerFromState(state);

    expect(marker.sameRevision).toBe(true);
    expect(marker.uiRevisionId).toBe(result.createdRevisionId);
  });
});
