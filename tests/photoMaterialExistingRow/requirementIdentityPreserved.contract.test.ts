import { getCurrentEstimateRevision } from "../../src/lib/ai/estimateRevisions";
import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material requirement identity", () => {
  it("preserves the existing row visible requirement name", () => {
    const { result } = confirmFixture();
    const current = getCurrentEstimateRevision(result.state);
    const row = current.editable_estimate_snapshot.rows[0];

    expect(row.titleRu).toBe("\u041a\u043b\u0435\u0439 \u043f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0439 C2TE");
    expect(row.selectedProductBinding?.visibleName).toBe("Ceresit CM 11");
    expect(row.titleRu).not.toBe(row.selectedProductBinding?.visibleName);
  });
});
