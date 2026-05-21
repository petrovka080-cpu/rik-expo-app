import { mediaProof } from "./mediaTestFixtures";

test("media AI does not attempt face identification", () => {
  expect(mediaProof().safety.faceIdentificationAttempted).toBe(false);
});
