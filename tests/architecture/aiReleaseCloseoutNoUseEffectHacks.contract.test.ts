import { readReleaseCloseoutRunner } from "./aiReleaseCloseoutTestHelpers";

it("does not add useEffect hacks in release closeout", () => {
  expect(readReleaseCloseoutRunner()).not.toContain("useEffect(");
});
