import {
  formatPhotoMaterialRequirementAndProduct,
} from "../../src/lib/ai/photoMaterialExistingRow";
import { estimateRevisionMojibakeFound } from "../../src/lib/ai/estimateRevisions";
import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material text encoding", () => {
  it("keeps visible text free of mojibake", () => {
    const { result } = confirmFixture();
    const visible = formatPhotoMaterialRequirementAndProduct(result.selectedRow);

    expect(estimateRevisionMojibakeFound(visible)).toBe(false);
    expect(visible).toContain("\u041a\u043b\u0435\u0439 \u043f\u043b\u0438\u0442\u043e\u0447\u043d\u044b\u0439 C2TE");
  });
});
