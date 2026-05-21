import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core does not log storage keys", () => {
  const source = readMediaSources();
  expect(source).not.toMatch(/console\.(log|warn|error).*storage/i);
  expect(source).toContain("canLogStorageKey: false");
});
