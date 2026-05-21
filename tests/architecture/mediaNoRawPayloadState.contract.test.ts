import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core does not keep raw payloads in state", () => {
  const source = readMediaSources();
  expect(source).not.toMatch(/useState|zustand|create\(/);
  expect(source).not.toContain("FileReader");
});
