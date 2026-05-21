import { readAiAlwaysOnExternalSources } from "./aiAlwaysOnExternalArchitectureTestHelpers";

describe("AI always-on external no useEffect hacks", () => {
  it("does not implement public knowledge as a useEffect patch", () => {
    expect(readAiAlwaysOnExternalSources()).not.toContain("useEffect");
  });
});
