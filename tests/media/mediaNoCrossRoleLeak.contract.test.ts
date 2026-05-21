import { mediaMatrix } from "./mediaTestFixtures";

test("proof matrix reports no cross-role media leaks", () => {
  expect(mediaMatrix().cross_role_media_leaks_found).toBe(0);
});
