import { canReadPhotoMaterialScan } from "../../src/lib/ai/photoMaterialExistingRow";
import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material scan access", () => {
  it("blocks non-owner scan reads", () => {
    const fixture = createReadyScanFixture();

    expect(canReadPhotoMaterialScan({ session: fixture.session, userId: "consumer_1" })).toBe(true);
    expect(canReadPhotoMaterialScan({ session: fixture.session, userId: "consumer_2" })).toBe(false);
  });
});
