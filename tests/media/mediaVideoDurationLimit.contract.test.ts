import { validateMediaUploadGroup } from "../../src/lib/media";
import { mediaDescriptors } from "./mediaTestFixtures";

test("long videos over 15 seconds are rejected", () => {
  const result = validateMediaUploadGroup([mediaDescriptors().longVideo]);
  expect(result.passed).toBe(false);
  expect(result.rejected[0]?.reasonRu).toContain("15");
});
