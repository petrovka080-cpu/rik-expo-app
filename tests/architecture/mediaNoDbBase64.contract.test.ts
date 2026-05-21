import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core does not store base64 in DB", () => {
  const source = readMediaSources();
  expect(source).not.toMatch(/\.insert\(|\.update\(|\.upsert\(/);
  expect(source).not.toMatch(/toString\(["']base64["']\)|data:[^;]+;base64/);
});
