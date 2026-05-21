import { readReleaseCloseoutRunner } from "./aiReleaseCloseoutTestHelpers";

it("does not create another AI framework during release closeout", () => {
  expect(readReleaseCloseoutRunner()).not.toMatch(/createSecond|new .*Framework/i);
});
