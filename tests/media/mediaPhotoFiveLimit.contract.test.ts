import { validateMediaUploadGroup } from "../../src/lib/media";
import { mediaDescriptors } from "./mediaTestFixtures";

test("five photos pass and sixth photo is rejected", () => {
  expect(validateMediaUploadGroup(mediaDescriptors().fivePhotos).passed).toBe(true);
  expect(validateMediaUploadGroup(mediaDescriptors().sixthPhoto).passed).toBe(false);
});
