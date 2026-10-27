import { isBrowserAbortLikeFetchError } from "./requestCancellation";

describe("request cancellation browser fetch errors", () => {
  it("classifies prefixed browser fetch tear-down messages like the canonical failed fetch", () => {
    expect(isBrowserAbortLikeFetchError(new Error("TypeError: Failed to fetch"))).toBe(true);
    expect(isBrowserAbortLikeFetchError(new Error("Error: Failed to fetch"))).toBe(true);
    expect(isBrowserAbortLikeFetchError(new TypeError("Failed to fetch"))).toBe(true);
  });
});
