import { readReleaseCloseoutRunner } from "./aiReleaseCloseoutTestHelpers";

it("does not add hooks in release closeout", () => {
  expect(readReleaseCloseoutRunner()).not.toMatch(/\buse[A-Z][A-Za-z0-9_]*\s*\(/);
});
