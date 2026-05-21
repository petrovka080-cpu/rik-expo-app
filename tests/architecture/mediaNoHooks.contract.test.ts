import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core does not add hooks", () => {
  expect(readMediaSources()).not.toMatch(/export\s+function\s+use[A-Z]|const\s+use[A-Z]/);
});
