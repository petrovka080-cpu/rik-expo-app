import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core does not log signed URL values", () => {
  const source = readMediaSources();
  expect(source).not.toMatch(/console\.(log|warn|error).*signed/i);
  expect(source).toContain("canLogUrl: false");
});
