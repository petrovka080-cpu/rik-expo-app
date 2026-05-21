import { readMediaSources } from "./mediaArchitectureTestHelpers";

test("media core has no direct dangerous mutations", () => {
  expect(readMediaSources()).not.toMatch(/approve\(|reject\(|closeWork|issueStock|postPayment|publishProduct/);
});
