import { canReadPhotoMaterialImage } from "../../src/lib/ai/photoMaterialExistingRow";
import { createReadyScanFixture } from "./photoMaterialExistingRowTestHelpers";

describe("photo material image access", () => {
  it("blocks non-owner image reads", () => {
    const fixture = createReadyScanFixture();

    expect(canReadPhotoMaterialImage({ session: fixture.session, image: fixture.images[0], userId: "consumer_1" })).toBe(true);
    expect(canReadPhotoMaterialImage({ session: fixture.session, image: fixture.images[0], userId: "consumer_2" })).toBe(false);
  });
});
