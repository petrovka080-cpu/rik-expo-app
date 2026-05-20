import { readLiveUiSource } from "./aiLiveUiArchitectureTestUtils";

describe("live AI UI architecture: no useEffect hacks", () => {
  it("does not add useEffect to the live route layer", () => {
    expect(readLiveUiSource()).not.toMatch(/useEffect\s*\(/);
  });
});
