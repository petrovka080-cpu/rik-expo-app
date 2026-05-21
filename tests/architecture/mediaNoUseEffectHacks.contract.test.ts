import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core does not use useEffect hacks", () => {
  expect(readMediaSources()).not.toMatch(/useEffect\s*\(/);
});
