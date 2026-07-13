import {
  formatPhotoMaterialRequirementAndProduct,
  photoMaterialVisibleTextHasInternalKeys,
} from "../../src/lib/ai/photoMaterialExistingRow";
import { confirmFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material visible text hygiene", () => {
  it("does not expose internal keys", () => {
    const { result } = confirmFixture();
    const visible = formatPhotoMaterialRequirementAndProduct(result.selectedRow);

    expect(photoMaterialVisibleTextHasInternalKeys(visible)).toBe(false);
    expect(visible).toContain("Ceresit CM 11");
  });
});
